import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TriggerCheckRequest {
  triggerType: string;
  sourceEntity?: {
    type: string;
    id: string;
  };
  changedFields?: string[];
  agentId?: string;
}

function evaluateConditionLogic(logic: string, results: boolean[]): boolean {
  try {
    let expression = logic;
    for (let i = results.length - 1; i >= 0; i--) {
      expression = expression.replace(new RegExp(`\\b${i}\\b`, 'g'), results[i].toString());
    }
    expression = expression.replace(/\bAND\b/g, '&&').replace(/\bOR\b/g, '||');
    return eval(expression);
  } catch (error) {
    console.error('Error evaluating condition logic:', error);
    return results.every(r => r);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { triggerType, sourceEntity, changedFields, agentId }: TriggerCheckRequest = await req.json();
    console.log('Trigger check request:', { triggerType, sourceEntity, changedFields, agentId });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch active agents with triggers
    let query = supabaseAdmin
      .from('agents')
      .select('*')
      .not('trigger_config', 'is', null);

    if (agentId) {
      query = query.eq('id', agentId);
    }

    const { data: agents, error: agentsError } = await query;

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      throw agentsError;
    }

    console.log(`Found ${agents?.length || 0} agents to check`);

    const results: any[] = [];
    let successCount = 0;

    for (const agent of agents || []) {
      try {
        const triggerConfig = agent.trigger_config;
        
        if (!triggerConfig || !triggerConfig.enabled) {
          console.log(`Agent ${agent.id} has no enabled trigger`);
          continue;
        }

        // Check if trigger type matches
        if (triggerConfig.type !== triggerType && triggerType !== 'scheduled') {
          continue;
        }

        // For scheduled triggers, check interval
        if (triggerType === 'scheduled') {
          const lastExecution = agent.last_trigger_execution;
          const intervalMinutes = triggerConfig.intervalMinutes || 60;
          
          if (lastExecution) {
            const timeSinceLastExecution = Date.now() - new Date(lastExecution).getTime();
            const intervalMs = intervalMinutes * 60 * 1000;
            
            if (timeSinceLastExecution < intervalMs) {
              console.log(`Agent ${agent.id} not due for execution yet`);
              continue;
            }
          }
        }

        // Fetch entity data if needed
        let entityData: any = null;
        if (sourceEntity && triggerType !== 'on_demand') {
          const tableName = sourceEntity.type.replace(/s$/, ''); // Remove plural 's'
          const { data, error } = await supabaseAdmin
            .from(tableName)
            .select('*')
            .eq('id', sourceEntity.id)
            .single();

          if (error) {
            console.error(`Error fetching ${tableName}:`, error);
            continue;
          }

          entityData = data;
        }

        // Check trigger conditions
        const inputTriggers = (agent.inputs || []).filter((input: any) => 
          input.type === 'input_trigger'
        );

        let conditionsMet = false;

        for (const inputTrigger of inputTriggers) {
          const conditions = inputTrigger.conditions || [];
          const conditionResults: boolean[] = [];

          for (const condition of conditions) {
            let result = false;

            // Check trigger type condition
            if (condition.triggerType) {
              result = condition.triggerType === triggerType;
            }

            // Check filter condition
            if (condition.filter && entityData) {
              const field = condition.filter.field;
              const operator = condition.filter.operator;
              const value = condition.filter.value;

              const fieldValue = entityData[field];

              switch (operator) {
                case 'equals':
                  result = fieldValue === value;
                  break;
                case 'not_equals':
                  result = fieldValue !== value;
                  break;
                case 'contains':
                  result = String(fieldValue).includes(value);
                  break;
                case 'changed':
                  result = changedFields?.includes(field) || false;
                  break;
                default:
                  result = false;
              }
            }

            conditionResults.push(result);
          }

          // Evaluate condition logic
          const logic = inputTrigger.conditionLogic || '0';
          conditionsMet = evaluateConditionLogic(logic, conditionResults);

          if (conditionsMet) break;
        }

        // Check agent strategy
        const strategy = triggerConfig.strategy || 'all_match';
        if (strategy === 'any_match') {
          conditionsMet = inputTriggers.some(() => conditionsMet);
        }

        console.log(`Agent ${agent.id} conditions met: ${conditionsMet}`);

        // Log trigger execution
        await supabaseAdmin
          .from('trigger_executions')
          .insert({
            agent_id: agent.id,
            trigger_type: triggerType,
            source_entity_type: sourceEntity?.type || 'none',
            source_entity_id: sourceEntity?.id || '',
            changed_fields: changedFields || [],
            conditions_met: conditionsMet,
            executed: false,
          });

        if (!conditionsMet) {
          continue;
        }

        // Prepare input data for agent
        const inputData: Record<string, any> = {};
        const agentInputs = agent.inputs || [];

        for (const input of agentInputs) {
          if (input.type === 'input_trigger') continue;

          const inputType = input.type;
          if (entityData && entityData[inputType]) {
            inputData[inputType] = entityData[inputType];
          }
        }

        // Execute agent
        console.log(`Executing agent ${agent.id}...`);
        
        const { data: executionResult, error: executionError } = await supabaseAdmin.functions.invoke(
          'test-agent',
          {
            body: {
              agentId: agent.id,
              model: agent.model,
              prompt: agent.prompt,
              input: inputData,
              context: {
                source: 'trigger',
                triggerType,
                taskId: sourceEntity?.id,
              },
              modules: agent.modules,
              outputs: agent.outputs,
              router_config: agent.router_config,
            },
          }
        );

        if (executionError) {
          console.error(`Error executing agent ${agent.id}:`, executionError);
          
          await supabaseAdmin
            .from('trigger_executions')
            .update({ 
              executed: false, 
              error_message: executionError.message 
            })
            .eq('agent_id', agent.id)
            .order('created_at', { ascending: false })
            .limit(1);

          // Log error to task if applicable
          if (sourceEntity?.type === 'tasks' || sourceEntity?.type === 'task') {
            await supabaseAdmin
              .from('task_logs')
              .insert({
                task_id: sourceEntity.id,
                action: 'trigger_error',
                field_name: 'agent_trigger',
                new_value: `Agent ${agent.name} failed: ${executionError.message}`,
              });
          }

          results.push({
            agentId: agent.id,
            agentName: agent.name,
            success: false,
            error: executionError.message,
          });

          continue;
        }

        // Update last trigger execution
        await supabaseAdmin
          .from('agents')
          .update({ last_trigger_execution: new Date().toISOString() })
          .eq('id', agent.id);

        await supabaseAdmin
          .from('trigger_executions')
          .update({ executed: true })
          .eq('agent_id', agent.id)
          .order('created_at', { ascending: false })
          .limit(1);

        successCount++;
        results.push({
          agentId: agent.id,
          agentName: agent.name,
          success: true,
          output: executionResult,
        });

        console.log(`Agent ${agent.id} executed successfully`);

      } catch (error) {
        console.error(`Error processing agent ${agent.id}:`, error);
        results.push({
          agentId: agent.id,
          agentName: agent.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkedAgents: agents?.length || 0,
        executedAgents: successCount,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in check-and-execute-triggers:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
