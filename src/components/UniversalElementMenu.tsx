import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Zap, Filter, Trash2, Bot } from "lucide-react";
import { InputBadgeWithPopover } from "@/components/InputBadgeWithPopover";
import { InputElement } from "@/types/agent";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UniversalElementMenuProps {
  children: React.ReactNode;
  currentType: 'input' | 'trigger' | 'filter' | 'operator' | 'bracket' | 'function' | 'math' | 'value';
  currentValue?: string; // для operator: 'AND'/'OR', для bracket: '('/')', для input: inputId, для function: 'IF', для math: '+'/'-'/'*'/'/'/'=', для value: string
  onChangeInput?: (inputId: string) => void;
  availableInputs?: InputElement[];
  onChangeToTrigger?: () => void;
  onChangeToFilter?: () => void;
  onChangeToAND?: () => void;
  onChangeToOR?: () => void;
  onChangeToOpenBracket?: () => void;
  onChangeToCloseBracket?: () => void;
  onDelete: () => void;
}

export const UniversalElementMenu = ({
  children,
  currentType,
  currentValue,
  onChangeInput,
  availableInputs = [],
  onChangeToTrigger,
  onChangeToFilter,
  onChangeToAND,
  onChangeToOR,
  onChangeToOpenBracket,
  onChangeToCloseBracket,
  onDelete,
}: UniversalElementMenuProps) => {
  const isCurrentInput = currentType === 'input';
  const isCurrentTrigger = currentType === 'trigger';
  const isCurrentFilter = currentType === 'filter';
  const isCurrentAND = currentType === 'operator' && currentValue === 'AND';
  const isCurrentOR = currentType === 'operator' && currentValue === 'OR';
  const isCurrentOpenBracket = currentType === 'bracket' && currentValue === '(';
  const isCurrentCloseBracket = currentType === 'bracket' && currentValue === ')';

  const menuItem = (
    onClick: () => void,
    label: string | React.ReactNode,
    tooltip: string,
    disabled: boolean = false,
    className: string = ""
  ) => (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <DropdownMenuItem 
            onClick={onClick} 
            disabled={disabled}
            className={className}
          >
            {label}
          </DropdownMenuItem>
        </TooltipTrigger>
        {!disabled && (
          <TooltipContent side="right" className="text-xs max-w-xs">
            {tooltip}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44 bg-popover z-50">
        {/* Инпут */}
        {onChangeInput && (
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Инпут:</span>
            </div>
            <InputBadgeWithPopover
              value={currentValue || ''}
              onChange={onChangeInput}
              availableInputs={availableInputs}
              className="w-full justify-center"
            />
          </div>
        )}

        {onChangeInput && (
          <DropdownMenuSeparator />
        )}

        {/* Триггер и Фильтр */}
        {onChangeToTrigger && menuItem(
          onChangeToTrigger,
          <><Zap className="h-3.5 w-3.5" /><span className="text-xs">Триггер</span></>,
          "Событие, которое запускает проверку условий",
          isCurrentTrigger,
          `gap-2 ${isCurrentTrigger ? 'bg-accent' : ''}`
        )}
        
        {onChangeToFilter && menuItem(
          onChangeToFilter,
          <><Filter className="h-3.5 w-3.5" /><span className="text-xs">Фильтр</span></>,
          "Условие для проверки значений",
          isCurrentFilter,
          `gap-2 ${isCurrentFilter ? 'bg-accent' : ''}`
        )}

        {(onChangeToTrigger || onChangeToFilter) && (
          <DropdownMenuSeparator />
        )}

        {/* Операторы AND/OR */}
        {onChangeToAND && menuItem(
          onChangeToAND,
          "AND",
          "Логическое И: все условия должны выполняться",
          isCurrentAND,
          `text-xs font-bold ${isCurrentAND ? 'bg-accent' : ''}`
        )}

        {onChangeToOR && menuItem(
          onChangeToOR,
          "OR",
          "Логическое ИЛИ: хотя бы одно условие должно выполняться",
          isCurrentOR,
          `text-xs font-bold ${isCurrentOR ? 'bg-accent' : ''}`
        )}

        {(onChangeToAND || onChangeToOR) && (
          <DropdownMenuSeparator />
        )}

        {/* Скобки */}
        {onChangeToOpenBracket && menuItem(
          onChangeToOpenBracket,
          "( открыть",
          "Открывающая скобка для группировки условий",
          isCurrentOpenBracket,
          `text-sm ${isCurrentOpenBracket ? 'bg-accent' : ''}`
        )}

        {onChangeToCloseBracket && menuItem(
          onChangeToCloseBracket,
          ") закрыть",
          "Закрывающая скобка для завершения группы условий",
          isCurrentCloseBracket,
          `text-sm ${isCurrentCloseBracket ? 'bg-accent' : ''}`
        )}

        {(onChangeToOpenBracket || onChangeToCloseBracket) && (
          <DropdownMenuSeparator />
        )}

        {/* Удаление */}
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-xs text-destructive focus:text-destructive gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Удалить</span>
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Удалить этот элемент из формулы
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
