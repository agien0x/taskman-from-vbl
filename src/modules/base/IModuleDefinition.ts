import { AgentModule, InputElement } from "@/types/agent";

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
}

export interface ModulePreviewProps {
  module: AgentModule;
  executionLog?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings?: Array<{ field: string; message: string }>;
}

export interface IModuleDefinition {
  // Метаданные
  type: string;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  description?: string;
  
  // Конфигурация
  getDefaultConfig: () => any;
  validateConfig: (config: any) => ValidationResult;
  
  // UI компоненты
  EditorComponent: React.ComponentType<ModuleEditorProps>;
  PreviewComponent: React.ComponentType<ModulePreviewProps>;
  
  // Динамические outputs
  getDynamicOutputs: (config: any, moduleId: string) => InputElement[];
  
  // Опциональное описание логики выполнения (для документации)
  executeLogic?: string;
}
