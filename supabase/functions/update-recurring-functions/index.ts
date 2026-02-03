import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Task {
  id: string;
  content: string;
  default_content: string;
  recurrence_type: string;
  recurrence_days: number[];
  last_recurrence_update: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting recurring functions update...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    console.log(`Today is: ${today} (${todayStart.toISOString()})`);

    // Fetch all function-type tasks with recurrence enabled
    const { data: tasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, content, default_content, recurrence_type, recurrence_days, last_recurrence_update')
      .eq('task_type', 'function')
      .neq('recurrence_type', 'none')
      .not('default_content', 'is', null);

    if (fetchError) {
      console.error('Error fetching tasks:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${tasks?.length || 0} recurring function tasks`);

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recurring functions to update', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updatedCount = 0;
    const tasksToUpdate: string[] = [];

    for (const task of tasks as Task[]) {
      let shouldUpdate = false;

      // Check if already updated today
      if (task.last_recurrence_update) {
        const lastUpdate = new Date(task.last_recurrence_update);
        const lastUpdateDate = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
        
        if (lastUpdateDate.getTime() >= todayStart.getTime()) {
          console.log(`Task ${task.id} already updated today, skipping...`);
          continue;
        }
      }

      // Check recurrence type
      switch (task.recurrence_type) {
        case 'daily':
          shouldUpdate = true;
          break;
        
        case 'weekdays':
          // Monday to Friday (1-5)
          shouldUpdate = today >= 1 && today <= 5;
          break;
        
        case 'weekly':
          // Check if today is in the recurrence_days array
          shouldUpdate = task.recurrence_days?.includes(today) || false;
          break;
      }

      if (shouldUpdate && task.default_content) {
        tasksToUpdate.push(task.id);
        console.log(`Updating task ${task.id} with recurrence type: ${task.recurrence_type}`);
        
        // Prepend default content to existing content
        const newContent = `${task.default_content}\n\n---\n\n${task.content}`;
        
        const { error: updateError } = await supabase
          .from('tasks')
          .update({
            content: newContent,
            last_recurrence_update: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', task.id);

        if (updateError) {
          console.error(`Error updating task ${task.id}:`, updateError);
        } else {
          updatedCount++;
          
          // Save a version of the new content
          await supabase
            .from('task_versions')
            .insert({
              task_id: task.id,
              content: newContent,
            });
        }
      }
    }

    console.log(`Successfully updated ${updatedCount} tasks`);

    return new Response(
      JSON.stringify({
        message: `Updated ${updatedCount} recurring function(s)`,
        updated: updatedCount,
        tasks: tasksToUpdate,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-recurring-functions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
