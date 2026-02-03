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
    const pathParts = url.pathname.split('/');
    const token = pathParts[1];
    const taskId = pathParts[3]; // /token/tasks/taskId

    if (!token || !taskId) {
      return new Response(
        JSON.stringify({ error: 'Token and task ID required' }),
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

    const updates = await req.json();

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (taskError) throw taskError;

    console.log('Widget API: Updated task:', taskId);

    return new Response(
      JSON.stringify(task),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});