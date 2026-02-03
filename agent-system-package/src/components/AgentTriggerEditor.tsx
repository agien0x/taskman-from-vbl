import { TriggerConfig, InputElement, AgentModule } from "../types/agent";
import { FormulaEditor } from "./FormulaEditor";
import { INPUT_TYPES } from "../types/agent";

interface AgentTriggerEditorProps {
  triggerConfig: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
  availableInputs: InputElement[];
  availableModules?: AgentModule[];
  selectedTaskId?: string;
  agentId?: string;
  moduleId?: string;
  onSaveModule?: (updatedModule?: AgentModule) => Promise<void>;
  supabaseClient?: any;
  toast?: (props: { title?: string; description?: string; variant?: string }) => void;
}

export const AgentTriggerEditor = ({ 
  triggerConfig, 
  onChange, 
  availableInputs,
  availableModules = [],
  selectedTaskId,
  agentId,
  moduleId,
  onSaveModule,
  supabaseClient,
  toast
}: AgentTriggerEditorProps) => {

  // Создаем список всех возможных инпутов (из availableInputs + все типы INPUT_TYPES)
  const allAvailableInputs: InputElement[] = [
    ...availableInputs,
    ...INPUT_TYPES.map((type, idx) => ({
      id: `type_${type.value}`,
      type: type.value,
      label: type.label,
      order: availableInputs.length + idx,
    })),
  ];

  // Удаляем дубликаты по type
  const uniqueInputs = allAvailableInputs.filter(
    (input, index, self) =>
      index === self.findIndex((t) => t.type === input.type)
  );

  return (
    <FormulaEditor
      triggerConfig={triggerConfig}
      onChange={onChange}
      availableInputs={uniqueInputs}
      availableModules={availableModules}
      selectedTaskId={selectedTaskId}
      agentId={agentId}
      moduleId={moduleId}
      onSaveModule={onSaveModule}
      supabaseClient={supabaseClient}
      toast={toast}
    />
  );
};