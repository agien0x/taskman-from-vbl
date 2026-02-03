import { AgentModule, InputElement } from '../../types/agent';

/**
 * Props for module editor components
 */
export interface ModuleEditorProps {
  module: AgentModule;
  onChange: (updated: AgentModule) => void;
  availableInputs: InputElement[];
  availableModules: AgentModule[];
  onTest?: () => Promise<void>;
  isTestingModule?: boolean;
  moduleTestOutput?: string;
  insertInput?: (type: string) => void;
  insertInputGroup?: (inputs: Array<{ value: string; label: string }>) => void;
  
  // Agent context for module operations
  agentId?: string;
  onSaveModule?: (updatedModule?: AgentModule) => Promise<void>;
  
  // Dependency Injection for external services
  supabaseClient?: any;
  toast?: (props: { title?: string; description?: string; variant?: string }) => void;
  onImageUpload?: (file: File) => Promise<string | null>;
}

/**
 * Props for module preview components
 */
export interface ModulePreviewProps {
  module: AgentModule;
  executionLog?: any;
}

/**
 * Validation result for module configuration
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings?: Array<{ field: string; message: string }>;
}

/**
 * Core interface for module definitions
 */
export interface IModuleDefinition {
  // Metadata
  type: string;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  description?: string;

  // Configuration
  getDefaultConfig: () => any;
  validateConfig: (config: any) => ValidationResult;

  // UI Components
  EditorComponent: React.ComponentType<ModuleEditorProps>;
  PreviewComponent: React.ComponentType<ModulePreviewProps>;

  // Dynamic outputs
  getDynamicOutputs: (config: any, moduleId: string) => InputElement[];

  // Optional execution logic description (for documentation)
  executeLogic?: string;
}
