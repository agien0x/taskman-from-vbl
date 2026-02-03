import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Функция для вычисления conditionLogic
function evaluateConditionLogic(logic: string, results: boolean[]): boolean {
  if (!logic || logic.trim() === '') {
    // Если логика пустая и есть результаты, применяем OR
    return results.length > 0 ? results.some(r => r) : false;
  }

  try {
    // Заменяем индексы на булевые значения
    let expression = logic;
    for (let i = results.length - 1; i >= 0; i--) {
      const regex = new RegExp(`\\b${i}\\b`, 'g');
      expression = expression.replace(regex, String(results[i]));
    }

    // Заменяем логические операторы на JavaScript операторы
    expression = expression.replace(/\bAND\b/gi, '&&');
    expression = expression.replace(/\bOR\b/gi, '||');

    // Вычисляем выражение
    // eslint-disable-next-line no-eval
    return eval(expression);
  } catch (error) {
    console.error('Error evaluating condition logic:', error);
    // В случае ошибки применяем OR ко всем результатам
    return results.some(r => r);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Starting trigger check and execution ===');
    
    const { triggerType, sourceEntity, changedFields, agentId } = await req.json();
    console.log('Request params:', { triggerType, sourceEntity, changedFields, agentId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Получаем активных агентов с включенными триггерами
    // Если это on_demand с конкретным agentId — не фильтруем по enabled
    let agentsQuery = supabase
      .from('agents')
      .select('*');
    
    // Если это on_demand с конкретным agentId — не фильтруем по enabled
    // иначе фильтруем только enabled=true
    if (agentId && triggerType === 'on_demand') {
      console.log(`On-demand trigger for specific agent: ${agentId}, skipping enabled filter`);
      agentsQuery = agentsQuery.eq('id', agentId);
    } else {
      agentsQuery = agentsQuery.eq('trigger_config->>enabled', 'true');
      if (agentId) {
        console.log(`Filtering for specific agent: ${agentId}`);
        agentsQuery = agentsQuery.eq('id', agentId);
      }
    }

    const { data: agents, error: agentsError } = await agentsQuery;

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      throw agentsError;
    }

    console.log(`Found ${agents?.length || 0} active agents with triggers`);

    if (!agents || agents.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active agents with triggers found', executed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    // Обрабатываем каждого агента
    for (const agent of agents) {
      console.log(`\n--- Processing agent: ${agent.name} (${agent.id}) ---`);
      
      const triggerConfig = agent.trigger_config;
      const inputTriggers = triggerConfig.inputTriggers || [];
      
      if (inputTriggers.length === 0) {
        console.log('Skipping agent - no input triggers configured');
        continue;
      }

      console.log(`Evaluating ${inputTriggers.length} input triggers with strategy: ${triggerConfig.strategy}`);

      // Получаем данные сущности для проверки условий
      let entityData = null;
      if (sourceEntity) {
        const tableName = sourceEntity.type === 'tasks' ? 'tasks' : 'profiles';
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', sourceEntity.id)
          .single();
        
        if (error) {
          console.error('Error fetching entity data:', error);
        } else {
          entityData = data;
        }
      }

      // Проверяем каждый inputTrigger
      const inputTriggerResults = [];

      for (const inputTrigger of inputTriggers) {
        console.log(`\n  Checking input trigger: ${inputTrigger.inputId}`);
        
        const conditions = inputTrigger.conditions || [];
        const conditionLogic = inputTrigger.conditionLogic || '';
        
        console.log(`  Conditions: ${conditions.length}, Logic: ${conditionLogic}`);

        if (conditions.length === 0) {
          console.log(`  No conditions defined - skipping`);
          inputTriggerResults.push(false);
          continue;
        }

        // Проверяем каждое условие
        const conditionResults: boolean[] = [];

        for (let idx = 0; idx < conditions.length; idx++) {
          const condition = conditions[idx];
          console.log(`\n  Checking condition ${idx}: type=${condition.type}`);

          if (condition.type === 'trigger') {
            // Проверяем тип триггера
            const conditionTriggerType = condition.triggerType;
            
            if (conditionTriggerType === 'scheduled' && triggerType === 'scheduled') {
              // Для scheduled проверяем время последнего выполнения
              const lastExecution = agent.last_trigger_execution;
              const scheduledTime = condition.scheduledTime || '09:00:00';
              
              if (lastExecution) {
                const lastExecDate = new Date(lastExecution);
                const now = new Date();
                const isSameDay = lastExecDate.toDateString() === now.toDateString();
                
                if (isSameDay) {
                  console.log(`  Scheduled trigger already executed today at ${lastExecDate.toLocaleTimeString()}`);
                  conditionResults.push(false);
                  continue;
                }
              }
              conditionResults.push(true);
            } else if (conditionTriggerType === triggerType) {
              console.log(`  Trigger type match: ${conditionTriggerType}`);
              conditionResults.push(true);
            } else {
              console.log(`  Trigger type mismatch: ${conditionTriggerType} !== ${triggerType}`);
              conditionResults.push(false);
            }
          } else if (condition.type === 'filter') {
            // Проверяем фильтр
            if (!entityData) {
              console.log(`  No entity data to check filter`);
              conditionResults.push(false);
              continue;
            }

            // Находим инпут в списке инпутов агента
            const inputs = agent.inputs || [];
            let input = inputs.find((inp: any) => inp.id === inputTrigger.inputId);
            
            // Если не нашли по ID, пробуем найти по типу
            if (!input && inputTrigger.inputId.startsWith('type_')) {
              const inputType = inputTrigger.inputId.replace('type_', '');
              input = { id: inputTrigger.inputId, type: inputType };
            }

            if (!input) {
              console.log(`  Input not found: ${inputTrigger.inputId}`);
              conditionResults.push(false);
              continue;
            }

            // Получаем значение поля из entityData
            let fieldValue: any = null;
            const inputType = input.type;
            
            if (inputType === 'task_title') fieldValue = entityData.title;
            else if (inputType === 'task_pitch') fieldValue = entityData.pitch;
            else if (inputType === 'task_content') fieldValue = entityData.content;
            else if (inputType === 'task_priority') fieldValue = entityData.priority;
            else if (inputType === 'task_column') fieldValue = entityData.column_id;
            else if (inputType === 'task_owner') fieldValue = entityData.owner_id;
            else if (inputType === 'task_assignees') fieldValue = entityData.assignees;
            else if (inputType === 'task_start_date') fieldValue = entityData.start_date;
            else if (inputType === 'task_end_date') fieldValue = entityData.end_date;
            else if (inputType === 'profile_recommended_parents') fieldValue = entityData.recommended_parents;

            console.log(`  Field value for ${inputType}: ${fieldValue}`);

            // Проверяем условие фильтра
            const operator = condition.operator;
            const value = condition.value;
            let filterMet = false;

            switch (operator) {
              case 'is_empty':
                filterMet = !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);
                break;
              case 'is_not_empty':
                filterMet = fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0);
                break;
              case 'equals':
                filterMet = String(fieldValue) === String(value);
                break;
              case 'contains':
                filterMet = fieldValue && String(fieldValue).includes(value || '');
                break;
              case 'not_contains':
                filterMet = !fieldValue || !String(fieldValue).includes(value || '');
                break;
              case 'starts_with':
                filterMet = fieldValue && String(fieldValue).startsWith(value || '');
                break;
              case 'ends_with':
                filterMet = fieldValue && String(fieldValue).endsWith(value || '');
                break;
              default:
                filterMet = false;
            }

            console.log(`  Filter ${operator} "${value}": ${filterMet}`);
            conditionResults.push(filterMet);
          }
        }

        // Вычисляем общий результат на основе conditionLogic
        const triggerMet = evaluateConditionLogic(conditionLogic, conditionResults);
        console.log(`  Condition results: ${conditionResults}, Logic result: ${triggerMet}`);
        inputTriggerResults.push(triggerMet);
      }

      // Применяем strategy между inputTriggers (all_match/any_match)
      let conditionsMet = false;
      const strategy = triggerConfig.strategy || 'any_match';
      
      if (strategy === 'all_match') {
        conditionsMet = inputTriggerResults.every((result: boolean) => result);
      } else {
        conditionsMet = inputTriggerResults.some((result: boolean) => result);
      }
      
      console.log(`Input trigger results: ${inputTriggerResults}, strategy: ${strategy}, conditions met: ${conditionsMet}`);

      // Логируем попытку выполнения триггера
      const triggerLogData: any = {
        agent_id: agent.id,
        trigger_type: triggerType,
        source_entity_type: sourceEntity?.type || 'unknown',
        source_entity_id: sourceEntity?.id || null,
        changed_fields: changedFields || null,
        conditions_met: conditionsMet,
        executed: false,
      };

      // Если условия не выполнены, логируем и пропускаем
      if (!conditionsMet) {
        console.log('Conditions not met - skipping execution');
        await supabase.from('trigger_executions').insert(triggerLogData);
        continue;
      }

      console.log('Conditions met - executing agent');

      try {
        // Формируем input для агента
        const inputData: any = {};
        let inputs = agent.inputs || [];
        
        // Парсим промпт для извлечения <agent-input> элементов
        const promptContent = agent.prompt || (agent.modules?.find((m: any) => m.type === 'prompt')?.config?.content);
        if (promptContent && inputs.length === 0) {
          const agentInputRegex = /<agent-input[^>]*elementid="([^"]*)"[^>]*type="([^"]*)"[^>]*>/gi;
          let match;
          const parsedInputs = [];
          
          while ((match = agentInputRegex.exec(promptContent)) !== null) {
            parsedInputs.push({
              id: match[1],
              type: match[2],
            });
          }
          
          if (parsedInputs.length > 0) {
            console.log(`Extracted ${parsedInputs.length} inputs from prompt HTML`);
            inputs = parsedInputs;
          }
        }
        
        console.log('Agent inputs:', JSON.stringify(inputs, null, 2));
        
        // Получаем данные сущности если нужно
        if (sourceEntity) {
          const tableName = sourceEntity.type === 'tasks' ? 'tasks' : 'profiles';
          const { data: entityData } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', sourceEntity.id)
            .single();
          
          if (entityData) {
            // Обрабатываем каждый инпут агента
            for (const input of inputs) {
              console.log(`Processing input: ${input.id}, type: ${input.type}`);
              
              // Простые типы из текущей задачи
              if (input.type === 'task_title') {
                inputData[input.id] = entityData.title;
                console.log(`Set ${input.id} = ${entityData.title}`);
              }
              else if (input.type === 'task_pitch') {
                inputData[input.id] = entityData.pitch;
                console.log(`Set ${input.id} = ${entityData.pitch}`);
              }
              else if (input.type === 'task_content') {
                inputData[input.id] = entityData.content;
                console.log(`Set ${input.id} = ${entityData.content}`);
              }
              else if (input.type === 'task_priority') {
                inputData[input.id] = entityData.priority;
                console.log(`Set ${input.id} = ${entityData.priority}`);
              }
              else if (input.type === 'task_column') {
                inputData[input.id] = entityData.column_id;
                console.log(`Set ${input.id} = ${entityData.column_id}`);
              }
              else if (input.type === 'custom_text' && input.customText) {
                inputData[input.id] = input.customText;
                console.log(`Set ${input.id} = ${input.customText}`);
              }
              // Специальные типы, требующие дополнительных запросов
              else if (input.type === 'all_tasks_list') {
                console.log('Loading all tasks list...');
                // Загружаем все задачи с названиями и питчами, ИСКЛЮЧАЯ текущую задачу
                const { data: allTasks, error: tasksError } = await supabase
                  .from('tasks')
                  .select('id, title, pitch')
                  .neq('id', entityData.id)
                  .order('created_at', { ascending: false })
                  .limit(100);
                
                if (tasksError) {
                  console.error('Error loading tasks:', tasksError);
                } else if (allTasks) {
                  console.log(`Loaded ${allTasks.length} tasks`);
                  // Форматируем список задач
                  const tasksList = allTasks
                    .map(task => `- [${task.id}] ${task.title}${task.pitch ? ` (${task.pitch})` : ''}`)
                    .join('\n');
                  inputData[input.id] = tasksList;
                  console.log(`Set ${input.id} with ${allTasks.length} tasks`);
                }
              } else {
                console.log(`Skipping input ${input.id} with type ${input.type} - no handler`);
              }
            }
          }
        }

        console.log('Calling test-agent with input:', inputData);

        // Вызываем test-agent
        const { data: agentResult, error: agentError } = await supabase.functions.invoke('test-agent', {
          body: {
            agentId: agent.id,
            model: agent.model,
            prompt: agent.prompt,
            input: inputData,
            context: {
              source: 'trigger',
              trigger_type: triggerType,
              source_entity: sourceEntity,
              source_entity_type: sourceEntity?.type,
              source_entity_id: sourceEntity?.id,
              task_id: sourceEntity?.type === 'tasks' ? sourceEntity?.id : null,
              changed_fields: changedFields,
              timestamp: new Date().toISOString(),
            },
          },
        });

        if (agentError) {
          console.error('Error executing agent:', agentError);
          triggerLogData.error_message = agentError.message || String(agentError);
          triggerLogData.executed = false;
          await supabase.from('trigger_executions').insert(triggerLogData);
          
          // Отправляем запись в логи активности об ошибке (если есть task_id)
          const taskId = sourceEntity?.type === 'tasks' ? sourceEntity?.id : null;
          if (taskId) {
            await supabase.from('task_logs').insert({
              task_id: taskId,
              action: 'trigger_error',
              field_name: agent.name,
              new_value: `Ошибка выполнения: ${agentError.message || 'неизвестная ошибка'}`,
              user_id: null,
            });
          }
          
          results.push({ agent: agent.name, success: false, error: agentError.message });
          continue;
        }

        console.log('Agent execution successful:', agentResult);

        // Обновляем last_trigger_execution для scheduled триггеров
        if (triggerType === 'scheduled') {
          await supabase
            .from('agents')
            .update({ last_trigger_execution: new Date().toISOString() })
            .eq('id', agent.id);
        }

        // Логируем успешное выполнение
        triggerLogData.executed = true;
        if (agentResult.executionId) {
          triggerLogData.execution_id = agentResult.executionId;
        }
        await supabase.from('trigger_executions').insert(triggerLogData);

        // Отправляем уведомление об успешном срабатывании в UI (если есть task_id)
        const taskId = sourceEntity?.type === 'tasks' ? sourceEntity?.id : null;

        // Безопасная постобработка вывода: удаляем из результатов текущую задачу, если она затесалась
        let filteredOutput: any = agentResult.output;
        try {
          if (taskId && agentResult.output) {
            const currentId = String(taskId);
            const tryFilterArray = (arr: any[]) => arr.filter((item) => {
              if (typeof item === 'string') return item !== currentId;
              if (item && typeof item === 'object') return item.id !== currentId && item.task_id !== currentId;
              return true;
            });

            if (typeof agentResult.output === 'string') {
              try {
                const parsed = JSON.parse(agentResult.output);
                if (Array.isArray(parsed)) {
                  filteredOutput = JSON.stringify(tryFilterArray(parsed));
                } else if (parsed && typeof parsed === 'object') {
                  if (Array.isArray(parsed.parent_ids)) parsed.parent_ids = parsed.parent_ids.filter((id: string) => id !== currentId);
                  if (Array.isArray(parsed.ids)) parsed.ids = parsed.ids.filter((id: string) => id !== currentId);
                  filteredOutput = JSON.stringify(parsed);
                } else {
                  filteredOutput = String(agentResult.output).replaceAll(currentId, '');
                }
              } catch {
                filteredOutput = String(agentResult.output).replaceAll(currentId, '');
              }
            } else if (Array.isArray(agentResult.output)) {
              filteredOutput = tryFilterArray(agentResult.output);
            } else if (agentResult.output && typeof agentResult.output === 'object') {
              const outObj: any = { ...agentResult.output };
              if (Array.isArray(outObj.parent_ids)) outObj.parent_ids = outObj.parent_ids.filter((id: string) => id !== currentId);
              if (Array.isArray(outObj.ids)) outObj.ids = outObj.ids.filter((id: string) => id !== currentId);
              filteredOutput = outObj;
            }
          }
        } catch (e) {
          console.log('Output filtering error:', e);
        }

        if (taskId) {
          const outputStr = filteredOutput
            ? (typeof filteredOutput === 'string' ? filteredOutput : JSON.stringify(filteredOutput))
            : '';
          const outputPreview = outputStr ? outputStr.substring(0, 200) : 'результат получен';

          await supabase.from('task_logs').insert({
            task_id: taskId,
            action: 'trigger_executed',
            field_name: agent.name,
            new_value: `Результат: ${outputPreview}${outputStr && outputStr.length > 200 ? '...' : ''}`,
            user_id: null,
          });
        }

        results.push({ 
          agent: agent.name, 
          success: true, 
          output: filteredOutput,
          executionId: agentResult.executionId 
        });

      } catch (error: any) {
        console.error('Exception executing agent:', error);
        triggerLogData.error_message = error?.message || String(error);
        await supabase.from('trigger_executions').insert(triggerLogData);
        results.push({ agent: agent.name, success: false, error: error?.message || String(error) });
      }
    }

    console.log('\n=== Trigger check and execution completed ===');
    console.log('Results:', results);

    return new Response(
      JSON.stringify({
        message: 'Trigger check and execution completed',
        executed: results.filter(r => r.success).length,
        total: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in check-and-execute-triggers:', error);
    return new Response(
      JSON.stringify({ error: error?.message || String(error) }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});