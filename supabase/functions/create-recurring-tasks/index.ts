import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Template {
  id: string;
  name: string;
  task_type: string;
  template: string | null;
  recurrence_type: string;
  recurrence_days: number[];
  recurrence_time: string | null;
  recurrence_timezone: string;
}

interface Assignment {
  user_id: string;
  template_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting recurring task creation from templates...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    console.log(`Current day: ${today}, Current time: ${currentTime}`);

    // Fetch all active templates with recurrence enabled
    const { data: templates, error: fetchError } = await supabase
      .from('task_type_templates')
      .select('id, name, task_type, template, recurrence_type, recurrence_days, recurrence_time, recurrence_timezone')
      .eq('is_active', true)
      .neq('recurrence_type', 'none');

    if (fetchError) {
      console.error('Error fetching templates:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${templates?.length || 0} active recurring templates`);

    if (!templates || templates.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active recurring templates found', created: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let createdCount = 0;
    const createdTasks: { template_id: string; user_id: string; task_id: string }[] = [];

    for (const template of templates as Template[]) {
      let shouldCreateTask = false;

      // Check recurrence type
      switch (template.recurrence_type) {
        case 'daily':
          shouldCreateTask = true;
          break;
        
        case 'weekdays':
          // Monday to Friday (1-5)
          shouldCreateTask = today >= 1 && today <= 5;
          break;
        
        case 'weekly':
          // Check if today is in the recurrence_days array
          shouldCreateTask = template.recurrence_days?.includes(today) || false;
          break;
      }

      if (!shouldCreateTask) {
        console.log(`Template ${template.id} should not run today (day ${today})`);
        continue;
      }

      // Check if the current time matches the template's recurrence_time (within 30 minute window)
      if (template.recurrence_time) {
        const [templateHour, templateMinute = 0] = template.recurrence_time.split(':').map(Number);
        
        // Convert template time from its timezone to UTC
        let adjustedHour = templateHour;
        const timezone = template.recurrence_timezone || 'UTC';
        
        // Timezone offset mapping (to UTC)
        const timezoneOffsets: Record<string, number> = {
          'Europe/Moscow': -3,
          'Europe/London': 0,
          'Europe/Paris': -1,
          'America/New_York': 5,
          'America/Los_Angeles': 8,
          'Asia/Tokyo': -9,
          'Asia/Shanghai': -8,
          'Australia/Sydney': -11,
          'UTC': 0
        };
        
        const offset = timezoneOffsets[timezone] || 0;
        adjustedHour = (templateHour + offset + 24) % 24;
        
        // Calculate time difference in minutes
        const timeDiffMinutes = Math.abs(currentHour - adjustedHour) * 60 + 
                                Math.abs(currentMinute - templateMinute);
        
        console.log(`Template ${template.id} time check:`, {
          currentTime: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')} UTC`,
          templateTime: `${String(templateHour).padStart(2, '0')}:${String(templateMinute).padStart(2, '0')}`,
          timezone,
          adjustedTime: `${String(adjustedHour).padStart(2, '0')}:${String(templateMinute).padStart(2, '0')} UTC`,
          timeDiffMinutes,
          shouldRun: timeDiffMinutes <= 30
        });
        
        if (timeDiffMinutes > 30) {
          console.log(`Template ${template.id} time window missed: diff ${timeDiffMinutes} minutes`);
          continue;
        }
      }

      console.log(`Processing template ${template.id} (${template.name})`);

      // Get all assignments for this template
      const { data: assignments, error: assignError } = await supabase
        .from('task_type_template_assignments')
        .select('user_id, template_id')
        .eq('template_id', template.id);

      if (assignError) {
        console.error(`Error fetching assignments for template ${template.id}:`, assignError);
        continue;
      }

      if (!assignments || assignments.length === 0) {
        console.log(`No assignments found for template ${template.id}`);
        continue;
      }

      console.log(`Found ${assignments.length} assignments for template ${template.id}`);

      // Create a task for each assigned user
      for (const assignment of assignments as Assignment[]) {
        // Check if a task was already created today for this user and template
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const { data: existingTasks, error: checkError } = await supabase
          .from('tasks')
          .select('id, created_at')
          .eq('owner_id', assignment.user_id)
          .eq('task_type', template.task_type)
          .gte('created_at', todayStart.toISOString())
          .ilike('title', `%${template.name}%`);

        if (checkError) {
          console.error(`Error checking existing tasks for user ${assignment.user_id}:`, checkError);
          continue;
        }

        if (existingTasks && existingTasks.length > 0) {
          console.log(`Task already created today for user ${assignment.user_id} from template ${template.id}`);
          continue;
        }

        // Create the task
        const { data: newTask, error: createError } = await supabase
          .from('tasks')
          .insert({
            title: template.name,
            content: template.template || '',
            task_type: template.task_type,
            owner_id: assignment.user_id,
            column_id: 'todo',
            position: 0,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .select('id')
          .single();

        if (createError) {
          console.error(`Error creating task for user ${assignment.user_id}:`, createError);
          continue;
        }

        if (newTask) {
          createdCount++;
          createdTasks.push({
            template_id: template.id,
            user_id: assignment.user_id,
            task_id: newTask.id,
          });
          console.log(`Created task ${newTask.id} for user ${assignment.user_id} from template ${template.id}`);
        }
      }
    }

    console.log(`Successfully created ${createdCount} tasks`);

    return new Response(
      JSON.stringify({
        message: `Created ${createdCount} task(s) from recurring templates`,
        created: createdCount,
        tasks: createdTasks,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-recurring-tasks:', error);
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
