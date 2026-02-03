import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { TriggerCondition, InputElement } from "../types/agent";
import { ConditionLogicEditor } from "./ConditionLogicEditor";

interface ConditionsBuilderProps {
  title: string;
  icon?: React.ReactNode;
  conditions: TriggerCondition[];
  conditionLogic: string;
  onConditionsChange: (conditions: TriggerCondition[]) => void;
  onLogicChange: (logic: string) => void;
  availableInputs: InputElement[];
  showAddButton?: boolean;
}

export const ConditionsBuilder = ({
  title,
  icon,
  conditions,
  conditionLogic,
  onConditionsChange,
  onLogicChange,
  availableInputs,
  showAddButton = true
}: ConditionsBuilderProps) => {
  
  const updateCondition = (conditionId: string, updates: Partial<TriggerCondition>) => {
    const updatedConditions = conditions.map(c => 
      c.id === conditionId ? { ...c, ...updates } : c
    );
    onConditionsChange(updatedConditions);
  };

  const removeCondition = (conditionId: string) => {
    const conditionIndex = conditions.findIndex(c => c.id === conditionId);
    if (conditionIndex === -1) return;

    const updatedConditions = conditions.filter(c => c.id !== conditionId);
    
    // Обновляем conditionLogic, убирая индекс удалённого условия
    if (conditionLogic) {
      const tokens = conditionLogic.split(/\s+/);
      const newTokens = tokens
        .filter(token => token !== String(conditionIndex))
        .map(token => {
          const num = Number(token);
          if (!isNaN(num) && num > conditionIndex) {
            return String(num - 1);
          }
          return token;
        });
      onLogicChange(newTokens.join(' '));
    }
    
    onConditionsChange(updatedConditions);
  };

  const addCondition = (type: 'trigger' | 'filter') => {
    const newCondition: TriggerCondition = {
      id: `condition_${Date.now()}`,
      type,
      ...(type === 'trigger' ? {
        triggerType: 'on_demand' as const
      } : {
        operator: 'equals' as const,
        value: ''
      })
    };

    const updatedConditions = [...conditions, newCondition];
    onConditionsChange(updatedConditions);

    // Обновляем логику
    const newIndex = conditions.length;
    if (conditionLogic) {
      onLogicChange(`${conditionLogic} AND ${newIndex}`);
    } else {
      onLogicChange(String(newIndex));
    }
  };

  return (
    <div className="space-y-1">
      {icon && title && (
        <div className="flex items-center gap-1">
          {icon}
          <Label className="text-[10px] font-semibold">{title}</Label>
        </div>
      )}

      <ConditionLogicEditor
        conditions={conditions}
        conditionLogic={conditionLogic}
        onConditionsChange={onConditionsChange}
        onLogicChange={onLogicChange}
        onConditionUpdate={updateCondition}
        onConditionRemove={removeCondition}
        onAddCondition={addCondition}
        availableInputs={availableInputs}
        hideFormula={!title}
      />
    </div>
  );
};
