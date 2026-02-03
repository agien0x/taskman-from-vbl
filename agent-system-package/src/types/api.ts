import { AgentModule, InputElement } from './agent';

export const AGENT_SYSTEM_VERSION = '1.0.0';

/**
 * Configuration for the Agent System
 */
export interface AgentSystemConfig {
  supabaseUrl: string;
  supabaseKey: string;
  tables?: {
    agents?: string;           // default: 'agents'
    executions?: string;       // default: 'agent_executions'
    triggers?: string;         // default: 'trigger_executions'
    versions?: string;         // default: 'agent_versions'
    ratings?: string;          // default: 'agent_ratings'
    inputVersions?: string;    // default: 'agent_input_versions'
  };
  functions?: {
    testAgent?: string;        // default: 'test-agent'
    checkTriggers?: string;    // default: 'check-and-execute-triggers'
    listTables?: string;       // default: 'list-tables'
    listColumns?: string;      // default: 'list-columns'
  };
}

/**
 * Agent creation input
 */
export interface AgentCreateInput {
  name: string;
  model: string;
  prompt: string;
  modules?: AgentModule[];
  pitch?: string;
  trigger_config?: any;
  router_config?: any;
  inputs?: InputElement[];
  outputs?: any[];
}

/**
 * Agent update input
 */
export interface AgentUpdateInput extends Partial<AgentCreateInput> {
  id: string;
}

/**
 * Agent execution result
 */
export interface ExecutionResult {
  success: boolean;
  output: any;
  modules_chain?: any[];
  duration_ms?: number;
  error?: string;
}

/**
 * Main API interface for Agent System
 */
export interface AgentSystemAPI {
  // Agent CRUD
  createAgent(data: AgentCreateInput): Promise<any>;
  updateAgent(id: string, data: AgentUpdateInput): Promise<any>;
  deleteAgent(id: string): Promise<void>;
  getAgent(id: string): Promise<any>;
  listAgents(): Promise<any[]>;
  
  // Agent execution
  executeAgent(agentId: string, input: any, context?: any): Promise<ExecutionResult>;
  
  // Triggers
  checkAndExecuteTriggers(triggerType: string, sourceEntity: any): Promise<void>;
  
  // Modules
  registerModule(definition: any): void;
  getAvailableModules(): any[];
  
  // Database schema
  listTables(): Promise<string[]>;
  listColumns(tableName: string): Promise<any[]>;
}

/**
 * Agent destination configuration
 */
export interface AgentDestination {
  id: string;
  label: string;
  targetTable: string;
  targetColumn: string;
  targetRecordId?: string;
  eventType?: string;
  componentId?: string;
}

/**
 * Trigger execution context
 */
export interface TriggerContext {
  triggerType: 'on_create' | 'on_update' | 'scheduled' | 'on_demand';
  sourceEntity: {
    type: string;
    id: string;
    data?: any;
  };
  changedFields?: string[];
}
