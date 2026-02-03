import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all tasks without embeddings
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, content')
      .is('content_embedding', null)
      .limit(100);

    if (tasksError) throw tasksError;

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No tasks without embeddings found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    let errors = 0;

    for (const task of tasks) {
      try {
        // Generate embedding for task content
        const textToEmbed = `${task.title || ''}\n${task.content || ''}`.trim();
        
        // Skip tasks with empty content
        if (!textToEmbed || textToEmbed.length === 0) {
          console.log(`Skipping task ${task.id}: empty content`);
          continue;
        }
        
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: textToEmbed,
            dimensions: 384,
          }),
        });

        if (!response.ok) {
          console.error(`Failed to generate embedding for task ${task.id}:`, response.status);
          errors++;
          continue;
        }

        const data = await response.json();
        const embedding = data.data[0].embedding;

        // Update task with embedding
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ content_embedding: embedding })
          .eq('id', task.id);

        if (updateError) {
          console.error(`Failed to update task ${task.id}:`, updateError);
          errors++;
          continue;
        }

        processed++;

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Embeddings generation completed',
        processed,
        errors,
        total: tasks.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating embeddings:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
