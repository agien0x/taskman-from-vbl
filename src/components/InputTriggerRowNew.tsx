import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { InputTrigger, InputElement, TriggerCondition } from "@/types/agent";
import { InputBadgeWithPopover } from "@/components/InputBadgeWithPopover";
import { ConditionLogicEditor } from "@/components/ConditionLogicEditor";
import { LogicElementAdder } from "@/components/LogicElementAdder";

interface InputTriggerRowNewProps {
  trigger: InputTrigger;
  onChange: (trigger: InputTrigger) => void;
  onRemove: () => void;
  availableInputs: InputElement[];
}

export const InputTriggerRowNew = ({
  trigger,
  onChange,
  onRemove,
  availableInputs,
}: InputTriggerRowNewProps) => {
  const addCondition = (type: 'trigger' | 'filter') => {
    const newCondition: TriggerCondition = type === 'trigger' 
      ? {
          id: `condition_${Date.now()}`,
          type: 'trigger',
          triggerType: 'on_update',
        }
      : {
          id: `condition_${Date.now()}`,
          type: 'filter',
          operator: 'is_not_empty',
        };
    
    const newConditions = [...trigger.conditions, newCondition];
    const newIndex = newConditions.length - 1;
    
    // Добавляем новое условие к существующей логике
    let newLogic = trigger.conditionLogic || '';
    if (newLogic) {
      // Если логика уже есть, добавляем AND и новый индекс
      newLogic = `${newLogic} AND ${newIndex}`;
    } else {
      // Если логика пустая, создаём новую
      newLogic = newIndex === 0 ? '0' : newConditions.map((_, idx) => idx).join(' AND ');
    }
    
    onChange({
      ...trigger,
      conditions: newConditions,
      conditionLogic: newLogic,
    });
  };

  const updateCondition = (conditionId: string, updates: Partial<TriggerCondition>) => {
    onChange({
      ...trigger,
      conditions: trigger.conditions.map(c => 
        c.id === conditionId ? { ...c, ...updates } : c
      ),
    });
  };

  const removeCondition = (conditionId: string) => {
    const conditionIdx = trigger.conditions.findIndex(c => c.id === conditionId);
    const newConditions = trigger.conditions.filter(c => c.id !== conditionId);
    
    // Обновляем логику, удаляя индекс и пересчитывая остальные
    let newLogic = trigger.conditionLogic || '';
    if (newLogic) {
      // Удаляем упоминания удалённого условия
      newLogic = newLogic.replace(new RegExp(`\\b${conditionIdx}\\b`, 'g'), '');
      // Удаляем лишние операторы
      newLogic = newLogic.replace(/\s+(AND|OR)\s+(AND|OR)\s+/g, ' $2 ');
      newLogic = newLogic.replace(/^\s*(AND|OR)\s+/g, '');
      newLogic = newLogic.replace(/\s+(AND|OR)\s*$/g, '');
      // Пересчитываем индексы условий, которые были после удалённого
      const tokens = newLogic.split(/\s+/);
      newLogic = tokens.map(token => {
        const idx = parseInt(token);
        if (!isNaN(idx) && idx > conditionIdx) {
          return String(idx - 1);
        }
        return token;
      }).join(' ').trim();
    }
    
    onChange({
      ...trigger,
      conditions: newConditions,
      conditionLogic: newConditions.length === 0 ? '' : newLogic,
    });
  };

  return (
    <div 
      className="flex items-center gap-1 flex-wrap"
      onDrop={(e) => {
        e.preventDefault();
        const droppedInputId = e.dataTransfer.getData('text/plain');
        if (droppedInputId) {
          onChange({ ...trigger, inputId: droppedInputId });
        }
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Input badge */}
      <InputBadgeWithPopover
        value={trigger.inputId}
        onChange={(inputId) => {
          console.log('InputTriggerRowNew onChange:', inputId);
          onChange({ ...trigger, inputId });
        }}
        availableInputs={availableInputs}
      />

      {/* Arrow separator */}
      {trigger.conditions.length > 0 && (
        <span className="text-muted-foreground text-xs">→</span>
      )}

      {/* Conditions with drag-and-drop logic editor */}
      {trigger.conditions.length > 0 && (
        <ConditionLogicEditor
          conditions={trigger.conditions}
          conditionLogic={trigger.conditionLogic}
          onConditionsChange={(newConditions) => {
            onChange({ ...trigger, conditions: newConditions });
          }}
          onLogicChange={(newLogic) => {
            onChange({ ...trigger, conditionLogic: newLogic });
          }}
          onConditionUpdate={updateCondition}
          onConditionRemove={removeCondition}
          onAddCondition={addCondition}
          availableInputs={availableInputs}
        />
      )}

      {/* Add button - только если нет условий */}
      {trigger.conditions.length === 0 && (
        <LogicElementAdder onAdd={(type) => {
          if (type === 'trigger' || type === 'filter') {
            addCondition(type);
          }
        }} />
      )}

      {/* Remove button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-5 w-5 p-0 ml-auto"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};
