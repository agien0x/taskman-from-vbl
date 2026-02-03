import React, { createContext, useContext, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AgentSystemConfig, AgentSystemAPI, AgentCreateInput, AgentUpdateInput, ExecutionResult, TriggerContext } from '../types/api';
import { moduleRegistry } from '../modules/base/ModuleRegistry';

const AgentSystemContext = createContext<AgentSystemAPI | null>(null);

/**
 * Hook to access Agent System API
 */
export const useAgentSystem = () => {
  const context = useContext(AgentSystemContext);
  if (!context) {
    throw new Error('useAgentSystem must be used within AgentSystemProvider');
  }
  return context;
};

/**
 * Create Agent System API instance
 */
function createAgentSystemAPI(config: AgentSystemConfig, supabase: SupabaseClient): AgentSystemAPI {
  const tables = {
    agents: config.tables?.agents || 'agents',
    executions: config.tables?.executions || 'agent_executions',
    triggers: config.tables?.triggers || 'trigger_executions',
    versions: config.tables?.versions || 'agent_versions',
    ratings: config.tables?.ratings || 'agent_ratings',
    inputVersions: config.tables?.inputVersions || 'agent_input_versions',
  };

  const functions = {
    testAgent: config.functions?.testAgent || 'test-agent',
    checkTriggers: config.functions?.checkTriggers || 'check-and-execute-triggers',
    listTables: config.functions?.listTables || 'list-tables',
    listColumns: config.functions?.listColumns || 'list-columns',
  };

  return {
    // Agent CRUD
    async createAgent(data: AgentCreateInput) {
      const { data: agent, error } = await supabase
        .from(tables.agents)
        .insert({
          ...data,
          modules: data.modules || [],
          inputs: data.inputs || [],
          outputs: data.outputs || [],
        })
        .select()
        .single();

      if (error) throw error;
      return agent;
    },

    async updateAgent(id: string, data: AgentUpdateInput) {
      const { data: agent, error } = await supabase
        .from(tables.agents)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return agent;
    },

    async deleteAgent(id: string) {
      const { error } = await supabase
        .from(tables.agents)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    async getAgent(id: string) {
      const { data: agent, error } = await supabase
        .from(tables.agents)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return agent;
    },

    async listAgents() {
      const { data: agents, error } = await supabase
        .from(tables.agents)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return agents || [];
    },

    // Agent execution
    async executeAgent(agentId: string, input: any, context?: any): Promise<ExecutionResult> {
      const { data, error } = await supabase.functions.invoke(functions.testAgent, {
        body: {
          agentId,
          input,
          context,
        },
      });

      if (error) throw error;

      return {
        success: !data.error,
        output: data.output,
        modules_chain: data.modules_chain,
        duration_ms: data.duration_ms,
        error: data.error,
      };
    },

    // Triggers
    async checkAndExecuteTriggers(triggerType: string, sourceEntity: any) {
      const { error } = await supabase.functions.invoke(functions.checkTriggers, {
        body: {
          triggerType,
          sourceEntity,
        },
      });

      if (error) throw error;
    },

    // Modules
    registerModule(definition: any) {
      moduleRegistry.register(definition);
    },

    getAvailableModules() {
      return moduleRegistry.getAll();
    },

    // Database schema
    async listTables() {
      const { data, error } = await supabase.functions.invoke(functions.listTables);
      if (error) throw error;
      return data || [];
    },

    async listColumns(tableName: string) {
      const { data, error } = await supabase.functions.invoke(functions.listColumns, {
        body: { tableName },
      });
      if (error) throw error;
      return data || [];
    },
  };
}

interface AgentSystemProviderProps {
  config: AgentSystemConfig;
  children: React.ReactNode;
}

/**
 * Provider component for Agent System
 */
export const AgentSystemProvider: React.FC<AgentSystemProviderProps> = ({ config, children }) => {
  const supabase = useMemo(
    () => createClient(config.supabaseUrl, config.supabaseKey),
    [config.supabaseUrl, config.supabaseKey]
  );

  const api = useMemo(
    () => createAgentSystemAPI(config, supabase),
    [config, supabase]
  );

  return (
    <AgentSystemContext.Provider value={api}>
      {children}
    </AgentSystemContext.Provider>
  );
};
