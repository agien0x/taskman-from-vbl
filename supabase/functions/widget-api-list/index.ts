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

  // Update last_used_at
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

    if (!tokenData.permissions.read) {
      return new Response(
        JSON.stringify({ error: 'No read permission' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let query = supabase
      .from('tasks')
      .select('id, title, content, column_id, priority, start_date, end_date, owner_id, created_at, updated_at');

    // Filter by parent_task_id if specified
    if (tokenData.parent_task_id) {
      const { data: relations } = await supabase
        .from('task_relations')
        .select('child_id')
        .eq('parent_id', tokenData.parent_task_id);
      
      if (relations && relations.length > 0) {
        const childIds = relations.map(r => r.child_id);
        query = query.in('id', childIds);
      } else {
        // No children, return empty array
        return new Response(
          JSON.stringify([]),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    console.log(`Widget API: Listed ${data?.length || 0} tasks`);

    return new Response(
      JSON.stringify(data || []),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error listing tasks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});