import { createContext, useContext, ReactNode } from 'react';
import { InputElement, INPUT_GROUPS } from '@/types/agent';

interface AgentInputsContextType {
  availableInputs: InputElement[];
  getInputGroups: () => typeof INPUT_GROUPS;
}

const AgentInputsContext = createContext<AgentInputsContextType>({
  availableInputs: [],
  getInputGroups: () => INPUT_GROUPS,
});

export const useAgentInputs = () => useContext(AgentInputsContext);

interface AgentInputsProviderProps {
  children: ReactNode;
  availableInputs?: InputElement[];
}

export const AgentInputsProvider = ({ 
  children, 
  availableInputs = [] 
}: AgentInputsProviderProps) => {
  const getInputGroups = () => {
    const dynamicGroups = [...INPUT_GROUPS];
    
    // Группируем inputs по типам модулей
    const promptInputs: Array<{ value: string; label: string }> = [];
    const modelInputs: Array<{ value: string; label: string }> = [];
    const jsonInputs: Array<{ value: string; label: string }> = [];
    const routerInputs: Array<{ value: string; label: string }> = [];
    const destinationInputs: Array<{ value: string; label: string }> = [];
    const channelInputs: Array<{ value: string; label: string }> = [];
    const triggerInputs: Array<{ value: string; label: string }> = [];
    
    availableInputs.forEach(inp => {
      const inputData = { value: inp.type, label: inp.label || inp.type };
      
      // JSON переменные
      if (inp.id.startsWith('json_')) {
        jsonInputs.push(inputData);
      }
      // Направления (destinations)
      else if (inp.type.startsWith('destination_')) {
        destinationInputs.push(inputData);
      }
      // Outputs модулей по типам
      else if (inp.type.includes('prompt_output')) {
        promptInputs.push(inputData);
      }
      else if (inp.type.includes('llm_response')) {
        modelInputs.push(inputData);
      }
      else if (inp.type.includes('routing_result')) {
        routerInputs.push(inputData);
      }
      else if (inp.type.includes('destinations_result')) {
        destinationInputs.push(inputData);
      }
      else if (inp.type.includes('channels_result')) {
        channelInputs.push(inputData);
      }
      else if (inp.type.includes('trigger_status')) {
        triggerInputs.push(inputData);
      }
    });
    
    // Обновляем группы
    const updateGroup = (groupName: string, inputs: Array<{ value: string; label: string }>) => {
      const groupIndex = dynamicGroups.findIndex(g => g.name === groupName);
      if (groupIndex !== -1 && inputs.length > 0) {
        dynamicGroups[groupIndex] = {
          ...dynamicGroups[groupIndex],
          inputs: inputs,
        };
      }
    };
    
    updateGroup("Промпты", promptInputs);
    updateGroup("Модель LLM", modelInputs);
    updateGroup("Извлекатель Json", jsonInputs);
    updateGroup("Правила роутинга", routerInputs);
    updateGroup("Направления", destinationInputs);
    updateGroup("Каналы", channelInputs);
    updateGroup("Триггеры", triggerInputs);
    
    return dynamicGroups;
  };

  return (
    <AgentInputsContext.Provider value={{ availableInputs, getInputGroups }}>
      {children}
    </AgentInputsContext.Provider>
  );
};
