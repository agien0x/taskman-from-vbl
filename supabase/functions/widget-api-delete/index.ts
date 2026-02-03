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
    const taskId = pathParts[3];

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

    if (!tokenData.permissions.delete) {
      return new Response(
        JSON.stringify({ error: 'No delete permission' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (deleteError) throw deleteError;

    console.log('Widget API: Deleted task:', taskId);

    return new Response(
      JSON.stringify({ success: true, id: taskId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});