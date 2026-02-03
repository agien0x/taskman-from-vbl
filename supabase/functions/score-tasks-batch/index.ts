import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting batch scoring of tasks...');

    // Находим задачи, которые были обновлены после последней оценки
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, updated_at, last_score_at')
      .or('last_score_at.is.null,updated_at.gt.last_score_at')
      .limit(50); // Ограничиваем количество для избежания таймаута

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      throw tasksError;
    }

    console.log(`Found ${tasks?.length || 0} tasks to score`);

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No tasks to score',
          scored: 0,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Вызываем score-task для каждой задачи
    const results = [];
    for (const task of tasks) {
      try {
        console.log(`Scoring task ${task.id}...`);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/score-task`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            taskId: task.id,
            isManual: false,
          }),
        });

        const result = await response.json();
        
        if (response.ok) {
          results.push({ taskId: task.id, success: true });
          console.log(`Task ${task.id} scored successfully`);
        } else {
          console.error(`Failed to score task ${task.id}:`, result);
          results.push({ taskId: task.id, success: false, error: result.error });
        }
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Error scoring task ${task.id}:`, error);
        results.push({ 
          taskId: task.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    console.log(`Batch scoring completed: ${successCount}/${tasks.length} tasks scored successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        scored: successCount,
        total: tasks.length,
        results,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in score-tasks-batch function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
