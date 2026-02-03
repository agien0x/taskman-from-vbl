import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { JSONPath } from "https://esm.sh/jsonpath-plus@10.3.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentExecutionRequest {
  agentId?: string;
  model: string;
  prompt: string;
  input: Record<string, any>;
  context?: Record<string, any>;
  modules?: any[];
  outputs?: any[];
  router_config?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: AgentExecutionRequest = await req.json();
    console.log('Agent execution request:', { agentId: requestData.agentId, model: requestData.model });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let agent = null;
    let agentModules = requestData.modules || [];
    let agentOutputs = requestData.outputs || [];
    let routerConfig = requestData.router_config || null;

    // Fetch agent configuration if agentId provided
    if (requestData.agentId) {
      const { data: agentData, error: agentError } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('id', requestData.agentId)
        .single();

      if (agentError) {
        console.error('Error fetching agent:', agentError);
        throw new Error(`Failed to fetch agent: ${agentError.message}`);
      }

      agent = agentData;
      agentModules = agent.modules || [];
      agentOutputs = agent.outputs || [];
      routerConfig = agent.router_config || null;

      console.log(`Loaded agent "${agent.name}" with ${agentModules.length} modules`);
    }

    const xaiApiKey = Deno.env.get('XAI_API_KEY');
    if (!xaiApiKey) {
      throw new Error('XAI_API_KEY environment variable is not set');
    }

    // Build prompt with inputs
    let finalPrompt = requestData.prompt;
    const inputData = requestData.input || {};

    // Replace input variables in prompt
    for (const [key, value] of Object.entries(inputData)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      finalPrompt = finalPrompt.replace(regex, String(value));
    }

    console.log('Prepared prompt for model:', { model: requestData.model });

    // Check if structured output is needed
    const needsStructuredOutput = 
      agentModules.some((m: any) => m.type === 'json_extractor') ||
      finalPrompt.includes('JSON') ||
      finalPrompt.includes('структуриров') ||
      (requestData.context?.source !== 'trigger');

    // Prepare API request
    const apiBody: any = {
      model: requestData.model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: finalPrompt }
      ],
    };

    if (needsStructuredOutput) {
      apiBody.response_format = { type: 'json_object' };
    }

    console.log('Calling X.AI API...');
    const startTime = Date.now();

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${xaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('X.AI API error:', errorText);
      throw new Error(`X.AI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    let output = data.choices[0].message.content;
    console.log('Received response from X.AI:', { duration, outputLength: output.length });

    // Process modules
    const modulesChain: any[] = [];
    let extractedVariables: Record<string, any> = {};

    // Model module
    modulesChain.push({
      type: 'model',
      input: { prompt: finalPrompt },
      output: output,
      duration_ms: duration
    });

    // JSON Extractor module
    const jsonExtractorModule = agentModules.find((m: any) => m.type === 'json_extractor');
    if (jsonExtractorModule) {
      try {
        const parsedOutput = typeof output === 'string' ? JSON.parse(output) : output;
        const variables = jsonExtractorModule.config?.variables || [];

        for (const variable of variables) {
          try {
            const result = JSONPath({ path: variable.jsonPath, json: parsedOutput });
            extractedVariables[variable.id] = result[0];
            console.log(`Extracted variable "${variable.id}":`, result[0]);
          } catch (error) {
            console.error(`Error extracting variable "${variable.id}":`, error);
            extractedVariables[variable.id] = null;
          }
        }

        modulesChain.push({
          type: 'json_extractor',
          input: { rawOutput: output },
          output: extractedVariables,
          duration_ms: 0
        });
      } catch (error) {
        console.error('JSON extraction error:', error);
      }
    }

    // Router module
    if (routerConfig && routerConfig.rules && routerConfig.rules.length > 0) {
      const routingResults = await applyRoutingRules(
        routerConfig,
        extractedVariables,
        modulesChain,
        agentOutputs,
        requestData.context,
        supabaseAdmin
      );

      modulesChain.push({
        type: 'router',
        input: { extractedVariables, rules: routerConfig.rules },
        output: routingResults,
        duration_ms: 0
      });
    }

    // Log execution
    if (requestData.agentId) {
      const { error: logError } = await supabaseAdmin
        .from('agent_executions')
        .insert({
          agent_id: requestData.agentId,
          execution_type: requestData.context?.source || 'manual',
          input_data: inputData,
          output_data: { output, extractedVariables },
          context: requestData.context || {},
          modules_chain: modulesChain,
          status: 'success',
          duration_ms: duration,
        });

      if (logError) {
        console.error('Error logging execution:', logError);
      }
    }

    return new Response(
      JSON.stringify({
        output,
        extractedVariables,
        modules_chain: modulesChain,
        duration_ms: duration,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in test-agent:', error);

    // Log error execution
    if ((await req.json()).agentId) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabaseAdmin
        .from('agent_executions')
        .insert({
          agent_id: (await req.json()).agentId,
          execution_type: 'manual',
          input_data: {},
          output_data: {},
          context: {},
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        modules_chain: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function applyRoutingRules(
  routerConfig: any,
  extractedVariables: Record<string, any>,
  modulesChain: any[],
  agentOutputs: any[],
  context: any,
  supabaseAdmin: any
): Promise<any[]> {
  const results: any[] = [];
  const rules = routerConfig.rules || [];

  for (const rule of rules) {
    try {
      // Get source data
      let sourceData = extractedVariables[rule.sourceVariableId];
      if (!sourceData) {
        const sourceModule = modulesChain.find((m: any) => m.type === rule.sourceVariableId);
        sourceData = sourceModule?.output;
      }

      // Find destination
      const destination = agentOutputs.find((d: any) => d.id === rule.destinationId);
      if (!destination) {
        console.error(`Destination not found: ${rule.destinationId}`);
        continue;
      }

      // Write to database or trigger UI event
      if (destination.targetTable && destination.targetColumn) {
        await writeToDatabase(
          supabaseAdmin,
          destination.targetTable,
          destination.targetColumn,
          sourceData,
          context?.taskId || destination.targetRecordId
        );

        results.push({
          destinationId: rule.destinationId,
          status: 'success',
          target: `${destination.targetTable}.${destination.targetColumn}`,
        });
      } else if (destination.eventType) {
        await createUIEvent(
          supabaseAdmin,
          destination.eventType,
          sourceData,
          context?.taskId,
          destination.componentId
        );

        results.push({
          destinationId: rule.destinationId,
          status: 'success',
          target: `ui_event:${destination.eventType}`,
        });
      }
    } catch (error) {
      console.error(`Error applying routing rule:`, error);
      results.push({
        destinationId: rule.destinationId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

async function writeToDatabase(
  supabaseAdmin: any,
  targetTable: string,
  targetColumn: string,
  data: any,
  recordId?: string
): Promise<void> {
  if (!recordId) {
    throw new Error('Record ID is required for database write');
  }

  const updateData: Record<string, any> = {
    [targetColumn]: data,
  };

  const { error } = await supabaseAdmin
    .from(targetTable)
    .update(updateData)
    .eq('id', recordId);

  if (error) {
    console.error(`Error updating ${targetTable}.${targetColumn}:`, error);
    throw error;
  }

  console.log(`Updated ${targetTable}.${targetColumn} for record ${recordId}`);
}

async function createUIEvent(
  supabaseAdmin: any,
  eventType: string,
  data: any,
  taskId?: string,
  componentId?: string
): Promise<void> {
  if (!taskId) {
    throw new Error('Task ID is required for UI event');
  }

  const eventContent = JSON.stringify({
    type: 'ui_event',
    eventType,
    componentId,
    data,
    timestamp: new Date().toISOString(),
  });

  const { error } = await supabaseAdmin
    .from('comments')
    .insert({
      task_id: taskId,
      content: eventContent,
    });

  if (error) {
    console.error('Error creating UI event:', error);
    throw error;
  }

  console.log(`Created UI event: ${eventType} for task ${taskId}`);
}
