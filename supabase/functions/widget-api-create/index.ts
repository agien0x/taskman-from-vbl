import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function validateToken(supabase: any, token: string) {
  const { data, error } = await supabase
    .from('widget_tokens')
    .select('*, permissions')
    .eq('token', token)
    .single();

  if (error || !data) {
    throw new Error('Invalid token');
  }

  await supabase
    .from('widget_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('token', token);

  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.pathname.split('/')[1];

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const tokenData = await validateToken(supabase, token);

    if (!tokenData.permissions.write) {
      return new Response(
        JSON.stringify({ error: 'No write permission' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { title, content, column_id, priority, start_date, end_date } = await req.json();

    if (!title || !content) {
      return new Response(
        JSON.stringify({ error: 'Title and content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title,
        content,
        column_id: column_id || 'todo',
        priority: priority || 'none',
        start_date,
        end_date,
        owner_id: tokenData.user_id,
      })
      .select()
      .single();

    if (taskError) throw taskError;

    // If parent_task_id exists, create relation
    if (tokenData.parent_task_id) {
      await supabase
        .from('task_relations')
        .insert({
          parent_id: tokenData.parent_task_id,
          child_id: task.id,
        });
    }

    console.log('Widget API: Created task:', task.id);

    return new Response(
      JSON.stringify(task),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});