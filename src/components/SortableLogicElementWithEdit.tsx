import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversalElementMenu } from "@/components/UniversalElementMenu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

interface SortableLogicElementWithEditProps {
  id: string;
  type: 'operator' | 'bracket' | 'function' | 'math' | 'value';
  value: string;
  onRemove: () => void;
  onToggle?: () => void;
  onValueChange?: (value: string) => void;
  error?: string;
}

export const SortableLogicElementWithEdit = ({
  id,
  type,
  value,
  onRemove,
  onToggle,
  onValueChange,
  error,
}: SortableLogicElementWithEditProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleChangeToTrigger = () => {
    // Логика смены на триггер не применима к operator/bracket
  };

  const handleChangeToFilter = () => {
    // Логика смены на фильтр не применима к operator/bracket
  };

  const handleChangeToAND = () => {
    if (type === 'operator' && value === 'OR') {
      onToggle?.();
    } else if (type === 'bracket') {
      // Превратить скобку в AND не можем напрямую, но можем удалить и попросить добавить
    }
  };

  const handleChangeToOR = () => {
    if (type === 'operator' && value === 'AND') {
      onToggle?.();
    }
  };

  const handleChangeToOpenBracket = () => {
    // Превращение в открывающую скобку
    if (type === 'bracket' && value === ')') {
      // Здесь нужна логика изменения типа скобки
    }
  };

  const handleChangeToCloseBracket = () => {
    // Превращение в закрывающую скобку
    if (type === 'bracket' && value === '(') {
      // Здесь нужна логика изменения типа скобки
    }
  };

  const elementDisplay = type === 'operator' ? (
    <Button
      variant="outline"
      size="sm"
      className={`h-5 px-2 text-[9px] font-bold cursor-pointer hover:bg-accent transition-all ${
        isHovered ? 'underline decoration-2 decoration-primary' : ''
      } ${error ? 'border-destructive text-destructive' : ''}`}
    >
      {value}
    </Button>
  ) : type === 'function' ? (
    <Button
      variant="outline"
      size="sm"
      className={`h-5 px-2 text-[9px] font-mono font-bold text-primary cursor-pointer hover:bg-primary/10 transition-all ${
        isHovered ? 'underline decoration-2 decoration-primary' : ''
      } ${error ? 'border-destructive text-destructive' : ''}`}
    >
      {value}
    </Button>
  ) : type === 'math' ? (
    <Button
      variant="outline"
      size="sm"
      className={`h-5 px-2 text-[9px] font-mono font-bold text-orange-600 cursor-pointer hover:bg-orange-50 transition-all ${
        isHovered ? 'underline decoration-2 decoration-primary' : ''
      } ${error ? 'border-destructive text-destructive' : ''}`}
    >
      {value === '*' ? '×' : value === '/' ? '÷' : value === '-' ? '−' : value}
    </Button>
  ) : type === 'value' ? (
    <input
      type="text"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      placeholder="123 или текст"
      className={`h-5 px-2 text-[9px] border rounded bg-background hover:bg-accent transition-all min-w-[60px] ${
        error ? 'border-destructive text-destructive' : 'border-border'
      }`}
    />
  ) : (
    <div
      className={`flex items-center justify-center h-5 w-5 text-sm font-bold cursor-pointer hover:bg-accent rounded transition-all ${
        isHovered ? 'underline decoration-2 decoration-primary' : ''
      } ${error ? 'text-destructive' : 'text-muted-foreground'}`}
    >
      {value}
    </div>
  );

  const content = (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-0.5 group ${
        error ? 'ring-2 ring-destructive bg-destructive/10 rounded' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-accent rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-2.5 w-2.5 text-muted-foreground" />
      </div>

      <UniversalElementMenu
        currentType={type}
        currentValue={value}
        onChangeToTrigger={undefined}
        onChangeToFilter={undefined}
        onChangeToAND={type === 'operator' || type === 'bracket' ? handleChangeToAND : undefined}
        onChangeToOR={type === 'operator' || type === 'bracket' ? handleChangeToOR : undefined}
        onChangeToOpenBracket={type === 'bracket' || type === 'operator' ? handleChangeToOpenBracket : undefined}
        onChangeToCloseBracket={type === 'bracket' || type === 'operator' ? handleChangeToCloseBracket : undefined}
        onDelete={onRemove}
      >
        {elementDisplay}
      </UniversalElementMenu>
    </div>
  );

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-destructive text-destructive-foreground">
            <p className="text-xs">⚠️ {error}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};