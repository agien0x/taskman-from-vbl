import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoreRequest {
  taskId: string;
  isManual?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let scoringAgentId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const xaiApiKey = Deno.env.get('XAI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find scoring agent
    const { data: agents } = await supabase
      .from('agents')
      .select('id')
      .limit(1);
    
    if (agents && agents.length > 0) {
      scoringAgentId = agents[0].id;
    }

    // Получаем JWT токен из заголовка
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { taskId, isManual = false } = await req.json() as ScoreRequest;

    // Загружаем задачу с индивидуальными настройками
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, content, task_type, use_custom_settings, custom_quality_criteria')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new Error('Task not found');
    }

    // Определяем критерии качества: индивидуальные или глобальные
    let qualityCriteria = '';
    
    if (task.use_custom_settings && task.custom_quality_criteria) {
      // Используем индивидуальные критерии задачи
      qualityCriteria = task.custom_quality_criteria;
    } else {
      // Используем глобальные критерии типа задачи
      const taskTypeConfigs: Record<string, { qualityCriteria: string }> = {
        task: { qualityCriteria: '' },
        personal_board: { qualityCriteria: '' },
        standup: { qualityCriteria: '- Четко описаны выполненные задачи\n- Указаны конкретные планы\n- Озвучены блокеры' },
        function: { qualityCriteria: '- Цель функции ясна и конкретна\n- Результаты измеримы\n- Все шаги выполнены' },
      };
      const taskType = task.task_type || 'task';
      qualityCriteria = taskTypeConfigs[taskType]?.qualityCriteria || 'Качество выполнения задачи';
    }

    // Формируем промпт для AI
    const systemPrompt = `Ты - AI агент-оценщик качества выполнения задач. 
Твоя задача - оценить задачу по шкале от 0 до 5, где:
0 - задача не выполнена или выполнена крайне плохо
1-2 - задача выполнена плохо, много недостатков
3 - задача выполнена удовлетворительно
4 - задача выполнена хорошо
5 - задача выполнена отлично

Используй следующие критерии качества для оценки:
${qualityCriteria}

Ответь ТОЛЬКО в формате JSON с двумя полями:
{
  "score": число от 0 до 5 с точностью до 0.5,
  "reasoning": "краткое объяснение оценки на русском языке (2-3 предложения)"
}`;

    const userPrompt = `Название задачи: ${task.title}

Содержание задачи:
${task.content || 'Нет описания'}

Оцени эту задачу.`;

    console.log('Calling X.AI Grok for task scoring...');

    if (!xaiApiKey) {
      throw new Error('XAI_API_KEY is not configured');
    }

    // Вызываем X.AI Grok
    const aiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${xaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Превышен лимит запросов к X.AI, попробуйте позже' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Требуется пополнение баланса X.AI' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No response from AI');
    }

    console.log('AI response:', aiContent);

    // Парсим ответ AI
    let scoreData: { score: number; reasoning: string };
    try {
      // Пытаемся извлечь JSON из ответа (может быть обернут в markdown блок)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scoreData = JSON.parse(jsonMatch[0]);
      } else {
        scoreData = JSON.parse(aiContent);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid AI response format');
    }

    // Валидируем score
    let score = Number(scoreData.score);
    if (isNaN(score) || score < 0 || score > 5) {
      score = 3; // Дефолтное значение
    }
    // Округляем до 0.5
    score = Math.round(score * 2) / 2;

    // Сохраняем оценку в базу
    const { data: scoreRecord, error: scoreError } = await supabase
      .from('task_scores')
      .insert({
        task_id: taskId,
        score,
        scored_by: userId,
        is_manual: isManual,
        reasoning: scoreData.reasoning || 'Автоматическая оценка',
        quality_criteria: qualityCriteria,
      })
      .select()
      .single();

    if (scoreError) {
      console.error('Error saving score:', scoreError);
      throw scoreError;
    }

    console.log('Score saved successfully:', scoreRecord);

    const duration = Date.now() - startTime;

    // Log successful execution
    if (scoringAgentId) {
      await supabase
        .from('agent_executions')
        .insert({
          agent_id: scoringAgentId,
          execution_type: 'score',
          input_data: { task_id: taskId, task_title: task.title, task_content: task.content, quality_criteria: qualityCriteria },
          output_data: { score, reasoning: scoreData.reasoning },
          context: { is_manual: isManual },
          duration_ms: duration,
          status: 'success',
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        score: scoreRecord,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in score-task function:', error);
    
    const duration = Date.now() - startTime;
    
    // Log failed execution
    if (scoringAgentId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('agent_executions')
          .insert({
            agent_id: scoringAgentId,
            execution_type: 'score',
            input_data: {},
            output_data: {},
            context: {},
            duration_ms: duration,
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          });
      } catch (logError) {
        console.error('Failed to log error execution:', logError);
      }
    }
    
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
