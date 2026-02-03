import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sparkles, RefreshCw, Play, Clock, Filter } from "lucide-react";
import { TriggerCondition } from "@/types/agent";
import { RecurrenceTimeSelector } from "@/components/RecurrenceTimeSelector";

interface TriggerConditionItemProps {
  condition: TriggerCondition;
  onChange: (condition: TriggerCondition) => void;
  onRemove: () => void;
}

const TRIGGER_TYPES = [
  { value: 'on_create', label: 'При создании', icon: Sparkles },
  { value: 'on_update', label: 'При обновлении', icon: RefreshCw },
  { value: 'scheduled', label: 'По расписанию', icon: Clock },
  { value: 'on_demand', label: 'По запросу', icon: Play },
] as const;

const FILTER_OPERATORS = [
  { value: 'is_empty', label: 'Пустой' },
  { value: 'is_not_empty', label: 'Не пустой' },
  { value: 'equals', label: 'Равно' },
  { value: 'contains', label: 'Содержит' },
  { value: 'not_contains', label: 'Не содержит' },
  { value: 'starts_with', label: 'Начинается' },
  { value: 'ends_with', label: 'Заканчивается' },
] as const;

export const TriggerConditionItem = ({
  condition,
  onChange,
  onRemove,
}: TriggerConditionItemProps) => {
  const needsValue = condition.type === 'filter' && 
    condition.operator && 
    !['is_empty', 'is_not_empty'].includes(condition.operator);

  if (condition.type === 'trigger') {
    const selectedType = TRIGGER_TYPES.find(t => t.value === condition.triggerType);
    const Icon = selectedType?.icon;

    return (
      <div className="flex items-center gap-0.5 bg-primary/10 border border-primary/30 rounded-full px-1.5 py-0.5">
        {Icon && <Icon className="h-2.5 w-2.5 text-primary" />}
        <Select
          value={condition.triggerType || ''}
          onValueChange={(value: any) => 
            onChange({ ...condition, triggerType: value })
          }
        >
          <SelectTrigger className="h-5 text-[9px] w-auto min-w-[70px] border-0 bg-transparent p-0 gap-0.5">
            <SelectValue placeholder="Триггер" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-[100]">
            {TRIGGER_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value} className="text-[10px]">
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {condition.triggerType === 'scheduled' && (
          <RecurrenceTimeSelector
            value={condition.scheduledTime || null}
            onChange={(time) => onChange({ ...condition, scheduledTime: time })}
            timezone={condition.scheduledTimezone || 'UTC'}
            onTimezoneChange={(tz) => onChange({ ...condition, scheduledTimezone: tz })}
          />
        )}

        <button
          onClick={onRemove}
          className="text-destructive hover:bg-destructive/10 rounded p-0.5 text-xs ml-0.5"
        >
          ×
        </button>
      </div>
    );
  }

  // Filter
  return (
    <div className="flex items-center gap-0.5 bg-accent/10 border border-accent/30 rounded-full px-1.5 py-0.5">
      <Filter className="h-2.5 w-2.5 text-accent-foreground/70" />
      <Select
        value={condition.operator || ''}
        onValueChange={(value: any) => 
          onChange({ ...condition, operator: value })
        }
      >
        <SelectTrigger className="h-5 text-[9px] w-auto min-w-[60px] border-0 bg-transparent p-0 gap-0.5">
          <SelectValue placeholder="Оператор" />
        </SelectTrigger>
        <SelectContent className="bg-popover z-[100]">
          {FILTER_OPERATORS.map((op) => (
            <SelectItem key={op.value} value={op.value} className="text-[10px]">
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {needsValue && (
        <Input
          value={condition.value || ''}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder="Значение"
          className="h-5 text-[9px] w-[60px] bg-transparent border-0 border-b border-accent/30 rounded-none px-1"
        />
      )}

      <button
        onClick={onRemove}
        className="text-destructive hover:bg-destructive/10 rounded p-0.5 text-xs ml-0.5"
      >
        ×
      </button>
    </div>
  );
};
