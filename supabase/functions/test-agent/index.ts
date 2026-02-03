import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { JSONPath as jsonPath } from "https://esm.sh/jsonpath-plus@7.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let executionAgentId: string | null = null;
  let modulesChain: any[] = [];

  try {
    const { agentId, model, prompt, input, context } = await req.json();
    console.log("Test agent request:", { agentId, model, input, context });
    executionAgentId = agentId;

    // Log initial trigger
    if (context?.source === 'trigger') {
      modulesChain.push({
        type: 'trigger',
        name: 'Триггер агента',
        timestamp: new Date().toISOString(),
        status: 'success',
        input: {
          trigger_type: context.trigger_type,
          source_entity: context.source_entity,
          changed_fields: context.changed_fields,
        },
        output: {
          agent_triggered: true,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    if (!XAI_API_KEY) {
      throw new Error("XAI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    let finalModel = model;
    let finalPrompt = prompt;
    let modules: any[] = [];
    let inputsModule: any = null;
    let modelModule: any = null;
    let routerModule: any = null;

    // If agentId is provided, fetch agent details
    if (agentId) {
      const { data: agent, error } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .single();

      if (error) {
        console.error("Error fetching agent:", error);
        throw new Error("Agent not found");
      }

      // Use modules if available
      if (agent.modules && Array.isArray(agent.modules)) {
        modules = agent.modules;
        inputsModule = modules.find(m => m.type === 'inputs');
        modelModule = modules.find(m => m.type === 'model');
        const promptModule = modules.find(m => m.type === 'prompt');
        routerModule = modules.find(m => m.type === 'router');
        
        // Log inputs module execution
        if (inputsModule) {
          modulesChain.push({
            type: 'inputs',
            name: 'Инпуты агента',
            timestamp: new Date().toISOString(),
            status: 'success',
            input: { 
              raw_input: input,
              available_inputs: inputsModule.config?.inputs?.length || 0,
            },
            output: { 
              processed_inputs: input,
              inputs_count: Object.keys(input || {}).length,
            },
          });
        }
        
        // Log prompt module execution with detailed config
        if (promptModule) {
          modulesChain.push({
            type: 'prompt',
            name: 'Промпт и инструкции',
            timestamp: new Date().toISOString(),
            status: 'success',
            input: { 
              raw_content: promptModule.config?.content,
              user_input: input,
            },
            output: { 
              final_prompt: promptModule.config?.content,
              prompt_length: promptModule.config?.content?.length || 0,
            },
            config: {
              uses_inputs: true,
              template: promptModule.config?.content,
            },
          });
        }
        
        finalModel = modelModule?.config?.selectedModel || agent.model;
        finalPrompt = promptModule?.config?.content || agent.prompt;
        
        // Log model selection
        if (modelModule) {
          modulesChain.push({
            type: 'model',
            name: 'Выбор модели LLM',
            timestamp: new Date().toISOString(),
            status: 'success',
            input: { 
              available_models: ['grok-4-0709', 'grok-3', 'grok-3-mini'],
              requested_model: modelModule.config?.selectedModel,
            },
            output: { 
              selected_model: finalModel,
              model_confirmed: true,
            },
          });
        }
      } else {
        finalModel = agent.model;
        finalPrompt = agent.prompt;
      }
      console.log("Using agent:", agent.name);
    }

    // Normalize model to supported list and set default if needed
    const allowedModels = [
      "grok-4-0709",
      "grok-3",
      "grok-3-mini",
      "grok-2-image-1212",
    ];
    if (!finalModel || !allowedModels.includes(finalModel)) {
      console.log(`Invalid or unsupported model "${finalModel}", falling back to grok-3`);
      finalModel = "grok-3";
    }

    if (!finalPrompt || !input) {
      throw new Error("Missing required fields");
    }

    // Parity with trigger execution: auto-fill special inputs for tests
    if (typeof input === 'object' && input !== null) {
      const needsAllTasks = (finalPrompt || '').includes('type_all_tasks_list') && !('type_all_tasks_list' in input);
      if (needsAllTasks) {
        console.log('Loading all tasks list for test execution...');
        const { data: allTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id, title, pitch')
          .order('created_at', { ascending: false })
          .limit(100);
        if (tasksError) {
          console.error('Error loading tasks for test all_tasks_list:', tasksError);
        } else if (allTasks) {
          const excludeId = context?.task_id ?? null;
          const tasksList = allTasks
            .filter(t => !excludeId || t.id !== excludeId)
            .map(t => `- [${t.id}] ${t.title}${t.pitch ? ` (${t.pitch})` : ''}`)
            .join('\n');
          (input as any)['type_all_tasks_list'] = tasksList;
          console.log(`Filled type_all_tasks_list with ${allTasks.length} tasks`);
        }
      }
    }

    // Convert input to string if it's an object
    let userInput: string;
    if (typeof input === 'object' && input !== null) {
      userInput = Object.entries(input)
        .map(([key, value]) => `${value}`)
        .join('\n');
    } else {
      userInput = String(input);
    }

    // Determine if we need structured output
    // Enable JSON mode if agent has JSON Extractor module
    const hasJsonExtractor = modules.some(m => m.type === 'json_extractor');
    const isFromTrigger = context && context.source === 'trigger';
    
    // Enable structured output for:
    // 1. Agents with JSON Extractor (always need JSON)
    // 2. Legacy agents that explicitly request structured output
    const needsStructuredOutput = hasJsonExtractor || (!isFromTrigger && agentId && (
      agentId === "08b00fd7-4da4-4dc4-9cbe-fc4a3a434916" ||
      (finalPrompt && (
        finalPrompt.toLowerCase().includes("project") ||
        finalPrompt.toLowerCase().includes("проджект")
      ))
    ));

    const body: any = {
      model: finalModel,
      messages: [
        { role: "system", content: finalPrompt },
        { role: "user", content: userInput },
      ],
    };

    // Add structured output configuration
    if (needsStructuredOutput) {
      if (hasJsonExtractor) {
        // For JSON Extractor agents, use flexible JSON response format
        body.response_format = { type: "json_object" };
        console.log("Enabled JSON response format for agent with JSON Extractor");
      } else {
        // For legacy structured output agents, use specific tool schema
        body.tools = [
          {
            type: "function",
            function: {
              name: "generate_task",
              description: "Generate a task with title and optional description",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Task title (max 50 characters)"
                  },
                  content: {
                    type: "string",
                    description: "Task description or details (optional)"
                  }
                },
                required: ["title"],
                additionalProperties: false
              }
            }
          }
        ];
        body.tool_choice = { type: "function", function: { name: "generate_task" } };
      }
    }

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Неверный X.AI API ключ" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Превышен лимит запросов X.AI" }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("X.AI API error:", response.status, errorText);
      throw new Error(`X.AI API error: ${response.status}`);
    }

    const data = await response.json();
    
    let output = "";
    
    // Check if we got structured output from tool call
    if (data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const args = JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
      output = JSON.stringify({
        title: args.title || "",
        content: args.content || ""
      });
    } else {
      output = data.choices?.[0]?.message?.content || "";
    }

    console.log("Agent response generated");
    
    // Update model module with LLM response
    const modelModuleIndex = modulesChain.findIndex(m => m.type === 'model');
    if (modelModuleIndex !== -1) {
      modulesChain[modelModuleIndex].output = output;
    }
    
    // Log LLM request and response with full details
    modulesChain.push({
      type: 'llm_execution',
      name: 'Выполнение LLM',
      timestamp: new Date().toISOString(),
      status: 'success',
      input: { 
        model: finalModel,
        system_prompt: finalPrompt,
        user_input: userInput,
        prompt_length: finalPrompt.length,
        input_length: userInput.length,
        needs_structured_output: needsStructuredOutput,
      },
      output: output,
      duration_ms: Date.now() - startTime,
    });

    // Process JSON extraction if json_extractor module exists
    const jsonExtractorModule = modules.find(m => m.type === 'json_extractor');
    const extractedVariables: Record<string, any> = {};
    
    // Create module outputs map for routing
    const moduleOutputs: Record<string, any> = {
      // Store LLM response with module ID
      [`type_module_model_${modelModule?.id || Date.now()}_llm_response`]: output,
      // Also store as 'llm_response' for backward compatibility
      'llm_response': output,
    };
    
    if (jsonExtractorModule && jsonExtractorModule.config?.variables?.length > 0) {
      console.log("Processing JSON extraction with", jsonExtractorModule.config.variables.length, "variables");
      
      const extractionStartTime = Date.now();
      
      // Try to parse output as JSON
      let sourceData: any;
      let parseError: string | null = null;
      try {
        sourceData = JSON.parse(output);
      } catch (e) {
        console.log("Output is not JSON, skipping extraction");
        sourceData = null;
        parseError = e instanceof Error ? e.message : 'Unknown parse error';
      }

      const extractionResults: any[] = [];
      if (sourceData) {
        for (const variable of jsonExtractorModule.config.variables) {
          try {
            const rawPath = (variable.path ?? '').toString().trim();
            const normalizedPath = rawPath.startsWith('$') ? rawPath : `$.${rawPath}`;
            const result = jsonPath({ path: normalizedPath, json: sourceData });
            extractedVariables[variable.name] = result.length > 0 ? result[0] : null;
            extractionResults.push({
              name: variable.name,
              path: normalizedPath,
              value: extractedVariables[variable.name],
              success: true,
            });
            console.log(`Extracted ${variable.name}:`, extractedVariables[variable.name]);
          } catch (error) {
            console.error(`Error extracting ${variable.name}:`, error);
            extractedVariables[variable.name] = null;
            extractionResults.push({
              name: variable.name,
              path: variable.path,
              error: error instanceof Error ? error.message : 'Unknown extraction error',
              success: false,
            });
          }
        }
      }
      
      // Log JSON extractor module execution with detailed results
      modulesChain.push({
        type: 'json_extractor',
        name: 'Извлечение переменных JSON',
        timestamp: new Date().toISOString(),
        status: sourceData ? 'success' : 'skipped',
        input: { 
          variables_to_extract: jsonExtractorModule.config.variables.map((v: any) => ({
            name: v.name,
            path: v.path,
          })),
          source_is_json: !!sourceData,
          parse_error: parseError,
        },
        output: { 
          extracted_variables: extractedVariables,
          extraction_results: extractionResults,
          success_count: extractionResults.filter(r => r.success).length,
          total_count: extractionResults.length,
        },
        duration_ms: Date.now() - extractionStartTime,
      });
    }

    // Step 7: Apply routing rules if configured
    if (routerModule && routerModule.config?.rules) {
      console.log('Applying routing rules...');
      const destinationsModule = modules.find(m => m.type === 'destinations');
      const routingResults = await applyRoutingRules(
        routerModule.config.rules,
        extractedVariables,
        moduleOutputs,
        destinationsModule?.config?.elements || destinationsModule?.config?.destinations || [],
        context,
        supabase
      );
      
      modulesChain.push({
        type: 'router',
        name: 'Роутинг данных',
        timestamp: new Date().toISOString(),
        status: 'success',
        input: {
          rules_count: routerModule.config.rules.length,
          extracted_variables: Object.keys(extractedVariables),
        },
        output: {
          applied_rules: routingResults.appliedRules,
          destinations_written: routingResults.destinationsWritten,
        },
      });
    }

    // Process routing if router module exists
    if (routerModule && routerModule.config) {
      const routingStartTime = Date.now();
      const routerConfig = routerModule.config;
      
      modulesChain.push({
        type: 'router',
        name: 'Правила роутинга',
        timestamp: new Date().toISOString(),
        status: 'success',
        input: {
          strategy: routerConfig.strategy || 'all_destinations',
          rules_count: routerConfig.rules?.length || 0,
          rules: routerConfig.rules || [],
        },
        output: {
          routing_applied: true,
          strategy_used: routerConfig.strategy || 'all_destinations',
        },
        duration_ms: Date.now() - routingStartTime,
      });
    }

    // Process destinations
    const destinationsModule = modules.find(m => m.type === 'destinations');
    if (destinationsModule && destinationsModule.config?.destinations?.length > 0) {
      modulesChain.push({
        type: 'destinations',
        name: 'Направления вывода',
        timestamp: new Date().toISOString(),
        status: 'configured',
        input: {
          output_data: {
            content: output,
            variables: extractedVariables,
          },
        },
        output: {
          destinations: destinationsModule.config.destinations.map((d: any) => ({
            type: d.type,
            target_id: d.targetTaskId || d.taskId,
            ready_to_send: true,
          })),
          destinations_count: destinationsModule.config.destinations.length,
        },
      });
    }

    const duration = Date.now() - startTime;

    // Log execution
    if (executionAgentId) {
      const executionType = context?.source || "test";
      const executionContext = {
        model: finalModel,
        needs_structured: needsStructuredOutput,
        ...context
      };

      await supabase
        .from("agent_executions")
        .insert({
          agent_id: executionAgentId,
          execution_type: executionType,
          input_data: { prompt: finalPrompt, input },
          output_data: { output, extracted_variables: extractedVariables },
          context: executionContext,
          duration_ms: duration,
          status: "success",
          modules_chain: modulesChain,
        });
    }

    return new Response(
      JSON.stringify({ 
        output,
        extracted_variables: extractedVariables,
        modules_chain: modulesChain
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("test-agent error:", error);
    
    const duration = Date.now() - startTime;
    
    // Log failed execution
    if (executionAgentId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Add error to modules chain
        modulesChain.push({
          type: 'error',
          name: 'Ошибка выполнения',
          timestamp: new Date().toISOString(),
          input: {},
          output: { error: error instanceof Error ? error.message : "Unknown error" },
        });
        
        await supabase
          .from("agent_executions")
          .insert({
            agent_id: executionAgentId,
            execution_type: "error",
            input_data: {},
            output_data: {},
            context: {},
            duration_ms: duration,
            status: "error",
            error_message: error instanceof Error ? error.message : "Unknown error",
            modules_chain: modulesChain,
          });
      } catch (logError) {
        console.error("Failed to log error execution:", logError);
      }
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Routing executor functions
async function applyRoutingRules(
  rules: any[],
  extractedVariables: Record<string, any>,
  moduleOutputs: Record<string, any>,
  destinations: any[],
  context: any,
  supabase: any
) {
  const results = {
    appliedRules: 0,
    destinationsWritten: [] as string[],
  };

  for (const rule of rules) {
    console.log(`Processing routing rule: ${rule.id}`);
    
    // Get source data
    if (!rule.sourceVariableId) {
      console.log(`Rule ${rule.id} has no sourceVariableId, skipping`);
      continue;
    }

    // Handle both single variable and array of variables
    let sourceData: any;
    
    if (Array.isArray(rule.sourceVariableId)) {
      // Multiple variables - combine into array
      console.log(`Rule uses multiple source variables: ${rule.sourceVariableId.join(', ')}`);
      const values: any[] = [];
      
      for (const varId of rule.sourceVariableId) {
        let value;
        
        // Try module outputs first (for outputs like llm_response)
        if (moduleOutputs[varId]) {
          value = moduleOutputs[varId];
          console.log(`Found value in moduleOutputs for ${varId}`);
        } else {
          // Try JSON variables (support both new 'type_json_' and legacy 'json_var_' prefixes)
          const variableName = varId
            .replace(/^type_json_/, '')
            .replace(/^json_var_/, '');
          value = extractedVariables[variableName];
          console.log(`Checking JSON variable: ${variableName}`);
        }
        
        if (value !== undefined && value !== null) {
          values.push(value);
        }
      }
      
      sourceData = values.length === 1 ? values[0] : values;
      console.log(`Source data:`, sourceData);
      
      if (values.length === 0) {
        console.log(`No data found for any variables in rule ${rule.id}, skipping`);
        continue;
      }
    } else {
      // Single variable (backward compatibility)
      // Try module outputs first
      if (moduleOutputs[rule.sourceVariableId]) {
        sourceData = moduleOutputs[rule.sourceVariableId];
        console.log(`Found value in moduleOutputs for ${rule.sourceVariableId}`);
      } else {
        // Try JSON variables
        const variableName = rule.sourceVariableId
          .replace(/^type_json_/, '')
          .replace(/^json_var_/, '');
        sourceData = extractedVariables[variableName];
        console.log(`Checking JSON variable: ${variableName}`);
      }
      
      if (!sourceData) {
        console.log(`No data for variable ${rule.sourceVariableId}, skipping rule`);
        continue;
      }
    }
    
    // Get destination
    console.log('[Routing] Looking for destination:', {
      destinationId: rule.destinationId,
      availableDestinations: destinations.map(d => ({ 
        id: d.id, 
        path: d.targetTable && d.targetColumn ? `${d.targetTable}.${d.targetColumn}` : d.componentName || d.type 
      }))
    });
    
    const destination = destinations.find((d: any) => d.id === rule.destinationId);
    if (!destination) {
      console.log(`❌ Destination ${rule.destinationId} not found in available destinations`);
      continue;
    }
    
    console.log('✅ Destination found:', {
      id: destination.id,
      type: destination.type,
      targetType: destination.targetType,
      path: destination.targetTable && destination.targetColumn 
        ? `${destination.targetTable}.${destination.targetColumn}` 
        : destination.componentName || 'unknown'
    });
    
    // Apply routing based on targetType
    if (destination.targetType === 'ui_component') {
      await createUIEvent(destination, sourceData, context, supabase);
      results.destinationsWritten.push(`UI: ${destination.componentName}`);
    } else {
      // Default to database write for backward compatibility
      await writeToDatabase(destination, sourceData, context, supabase);
      results.destinationsWritten.push(`DB: ${destination.type}`);
    }
    
    results.appliedRules++;
  }
  
  return results;
}

async function writeToDatabase(
  destination: any,
  data: any,
  context: any,
  supabase: any
) {
  const recordId = destination.targetRecordId || context?.task_id || context?.source_entity_id;
  
  if (!recordId) {
    console.error('No record ID for database write');
    return;
  }
  
  // Validate required fields - no fallback to hardcoded values
  const targetTable = destination.targetTable;
  const targetColumn = destination.targetColumn;
  
  if (!targetTable || !targetColumn) {
    console.error('Missing targetTable or targetColumn in destination:', {
      destinationId: destination.id,
      targetTable,
      targetColumn,
      destinationType: destination.type,
    });
    throw new Error(`Database destination must specify targetTable and targetColumn. Destination ID: ${destination.id}`);
  }
  
  const updateData: any = {};
  updateData[targetColumn] = typeof data === 'string' ? data : JSON.stringify(data);
  
  console.log(`Writing to database: ${targetTable}.${targetColumn} (record: ${recordId})`);
  
  const { error } = await supabase
    .from(targetTable)
    .update(updateData)
    .eq('id', recordId);
  
  if (error) {
    console.error(`Error writing to ${targetTable}.${targetColumn}:`, error);
    throw error;
  } else {
    console.log(`✅ Successfully wrote to ${targetTable}.${targetColumn}`);
  }
}

async function createUIEvent(
  destination: any,
  data: any,
  context: any,
  supabase: any
) {
  const taskId = context?.task_id || context?.source_entity_id;
  
  if (!taskId) {
    console.error('No task ID for UI event');
    return;
  }

  // Создаём специальный комментарий-событие для UI компонента
  const eventComment = {
    task_id: taskId,
    content: JSON.stringify({
      type: 'ui_event',
      component: destination.componentName,
      eventType: destination.eventType || `${destination.componentName}_ready`,
      data: data,
      timestamp: new Date().toISOString(),
    }),
  };
  
  const { error } = await supabase
    .from('comments')
    .insert([eventComment]);
  
  if (error) {
    console.error('Error creating UI event:', error);
  } else {
    console.log(`Successfully created UI event for ${destination.componentName}`);
  }
}
