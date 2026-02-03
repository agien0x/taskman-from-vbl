import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InputSelector } from "@/components/InputSelector";
import { InputElement, INPUT_GROUPS } from "@/types/agent";
import { cn } from "@/lib/utils";
import { Bot, GripVertical } from "lucide-react";
import { useState } from "react";
import { useAgentInputs } from "@/contexts/AgentInputsContext";

// Фиксированное маппирование групп на контрастные цвета
const GROUP_COLOR_MAP: Record<string, string> = {
  "Основные поля задачи": "bg-blue-100 text-blue-700 border-blue-200",
  "Участники": "bg-orange-100 text-orange-700 border-orange-200",
  "Иерархия задач": "bg-purple-100 text-purple-700 border-purple-200",
  "Даты и время": "bg-green-100 text-green-700 border-green-200",
  "Контент и сообщения": "bg-pink-100 text-pink-700 border-pink-200",
  "Промпты": "bg-violet-100 text-violet-700 border-violet-200",
  "Модель LLM": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Извлекатель Json": "bg-pink-100 text-pink-700 border-pink-200",
  "Правила роутинга": "bg-rose-100 text-rose-700 border-rose-200",
  "Направления": "bg-amber-100 text-amber-700 border-amber-200",
  "Каналы": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Триггеры": "bg-sky-100 text-sky-700 border-sky-200",
};

// Маппинг типов инпутов к группам
const INPUT_TO_GROUP: Record<string, string> = {
  "task_title": "Основные поля задачи",
  "task_pitch": "Основные поля задачи",
  "task_content": "Основные поля задачи",
  "task_priority": "Основные поля задачи",
  "task_column": "Основные поля задачи",
  "task_owner": "Участники",
  "task_assignees": "Участники",
  "task_parent_chain": "Иерархия задач",
  "profile_recommended_parents": "Иерархия задач",
  "task_subtasks": "Иерархия задач",
  "all_tasks_list": "Иерархия задач",
  "task_start_date": "Даты и время",
  "task_end_date": "Даты и время",
  "task_planned_hours": "Даты и время",
  "editor_content": "Контент и сообщения",
  "incoming_messages": "Контент и сообщения",
  "custom_text": "Контент и сообщения",
};

const getGroupColor = (type: string, contextGroups?: typeof INPUT_GROUPS): string => {
  // Сначала проверяем статический маппинг
  let group = INPUT_TO_GROUP[type];
  
  // Если не нашли, ищем в динамических группах
  if (!group && contextGroups) {
    for (const g of contextGroups) {
      const input = g.inputs.find(inp => inp.value === type || inp.value === type.replace('json_', ''));
      if (input) {
        group = g.name;
        break;
      }
    }
  }
  
  // Дополнительная проверка по содержанию типа для outputs модулей
  if (!group) {
    if (type.includes('prompt_output')) group = "Промпты";
    else if (type.includes('llm_response')) group = "Модель LLM";
    else if (type.includes('json_')) group = "Извлекатель Json";
    else if (type.includes('routing_result')) group = "Правила роутинга";
    else if (type.includes('destinations_result')) group = "Направления";
    else if (type.includes('channels_result')) group = "Каналы";
    else if (type.includes('trigger_status')) group = "Триггеры";
  }
  
  return GROUP_COLOR_MAP[group] || "bg-gray-100 text-gray-700 border-gray-200";
};

interface InputBadgeWithPopoverProps {
  value: string;
  onChange: (inputId: string) => void;
  availableInputs: InputElement[];
  className?: string;
  placeholder?: string;
}

export const InputBadgeWithPopover = ({
  value,
  onChange,
  availableInputs,
  className,
  placeholder = "Выбрать инпут",
}: InputBadgeWithPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [isChanged, setIsChanged] = useState(false);
  
  // Пытаемся получить контекст, но если его нет - используем INPUT_GROUPS напрямую
  let contextGroups = INPUT_GROUPS;
  try {
    const context = useAgentInputs();
    if (context?.getInputGroups) {
      contextGroups = context.getInputGroups();
    }
  } catch (e) {
    // Контекст недоступен, используем статические группы
  }
  
  // Ищем инпут сначала по ID, затем по type (для синтетических инпутов вида type_task_title)
  let selectedInput = availableInputs.find(inp => inp.id === value);
  if (!selectedInput && value?.startsWith('type_')) {
    const typeValue = value.replace('type_', '');
    selectedInput = availableInputs.find(inp => inp.type === typeValue);
  }
  // Если все еще не нашли, ищем по type напрямую (для случаев, когда передается просто type)
  if (!selectedInput) {
    selectedInput = availableInputs.find(inp => inp.type === value);
  }
  
  // Получаем label из contextGroups если не нашли в availableInputs
  let selectedLabel = selectedInput?.label;
  if (!selectedLabel) {
    for (const group of contextGroups) {
      const input = group.inputs.find(inp => inp.value === value || inp.value === value.replace('type_', ''));
      if (input) {
        selectedLabel = input.label;
        break;
      }
    }
  }
  
  selectedLabel = selectedLabel || selectedInput?.type || placeholder;
  const selectedType = selectedInput?.type || value.replace('type_', '');
  
  // Обрезаем текст до 10 символов
  const truncatedLabel = selectedLabel.length > 10 
    ? selectedLabel.substring(0, 10) + '...' 
    : selectedLabel;

  const handleSelectInput = (inputValue: string) => {
    console.log('InputBadgeWithPopover handleSelectInput:', { inputValue, currentValue: value, availableInputs });
    // Находим инпут по его type (value из INPUT_GROUPS)
    const matchingInput = availableInputs.find(inp => inp.type === inputValue);
    console.log('matchingInput:', matchingInput);
    if (matchingInput) {
      // Используем синтетический ID вида type_<type> для стабильности
      const stableId = matchingInput.id.startsWith('type_') ? matchingInput.id : `type_${inputValue}`;
      console.log('Calling onChange with stableId:', stableId);
      onChange(stableId);
      setOpen(false);
      setIsChanged(true);
      setTimeout(() => setIsChanged(false), 2000);
    } else {
      // Если не нашли в availableInputs, просто передаем type_<inputValue>
      const fallbackId = `type_${inputValue}`;
      console.log('Calling onChange with fallbackId:', fallbackId);
      onChange(fallbackId);
      setOpen(false);
      setIsChanged(true);
      setTimeout(() => setIsChanged(false), 2000);
    }
  };

  const handleSelectGroup = (groupInputs: Array<{ value: string; label: string }>) => {
    // Для триггеров выбор группы не имеет смысла, выбираем первый инпут из группы
    if (groupInputs.length > 0) {
      handleSelectInput(groupInputs[0].value);
    }
  };

  const groupColor = getGroupColor(selectedType, contextGroups);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 cursor-grab active:cursor-grabbing select-none transition-all hover-scale rounded-full border border-dashed px-2.5 py-0.5 text-xs font-semibold ring-offset-background hover:ring-2 hover:ring-primary/40",
            groupColor,
            isChanged && "ring-2 ring-primary ring-offset-2 animate-scale-in",
            className
          )}
          title={selectedLabel}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground/80 pulse" aria-hidden />
          <Bot className="h-3 w-3" />
          <span className="font-medium text-sm">{truncatedLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 bg-popover z-[100]" align="start">
        <InputSelector
          groups={contextGroups}
          onSelectInput={handleSelectInput}
          onSelectGroup={handleSelectGroup}
        />
      </PopoverContent>
    </Popover>
  );
};
