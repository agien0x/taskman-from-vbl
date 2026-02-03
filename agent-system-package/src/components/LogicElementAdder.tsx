import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Plus, Zap, Filter, Calculator, ChevronRight, Database, Box } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface LogicElementAdderProps {
  onAdd: (type: 'AND' | 'OR' | '(' | ')' | 'trigger' | 'filter' | 'IF' | 'AVG' | 'SUM' | 'COUNT' | 'input' | 'module' | '+' | '-' | '*' | '/' | '=' | 'value' | '→') => void;
}

export const LogicElementAdder = ({ onAdd }: LogicElementAdderProps) => {
  const addButton = (
    label: string,
    onClick: () => void,
    tooltip: string,
    className: string = ""
  ) => (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            className={`h-6 px-2 text-xs hover:bg-accent ${className}`}
          >
            {label}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 rounded-full hover:bg-primary/10 border border-dashed border-muted-foreground/30 hover:border-primary/50"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-2 bg-popover z-50">
        {/* AND OR ( ) → */}
        <DropdownMenuLabel className="text-xs text-muted-foreground px-1 py-0.5">
          Логика и операторы
        </DropdownMenuLabel>
        <div className="flex gap-1 mb-2 flex-wrap">
          {addButton("AND", () => onAdd('AND'), "Все условия должны выполняться", "font-bold text-blue-600")}
          {addButton("OR", () => onAdd('OR'), "Хотя бы одно условие должно выполняться", "font-bold text-purple-600")}
          {addButton("(", () => onAdd('('), "Открыть группу условий", "font-mono font-bold")}
          {addButton(")", () => onAdd(')'), "Закрыть группу условий", "font-mono font-bold")}
          {addButton("→", () => onAdd('→'), "Извлечь из input: данные передаются в следующие элементы в скобках", "font-mono text-lg")}
        </div>

        <DropdownMenuSeparator className="my-2" />

        {/* Математика */}
        <DropdownMenuLabel className="text-xs text-muted-foreground px-1 py-0.5">
          Математика
        </DropdownMenuLabel>
        <div className="flex gap-1 mb-2 flex-wrap">
          {addButton("+", () => onAdd('+'), "Сложение", "font-mono font-bold")}
          {addButton("−", () => onAdd('-'), "Вычитание", "font-mono font-bold")}
          {addButton("×", () => onAdd('*'), "Умножение", "font-mono font-bold")}
          {addButton("÷", () => onAdd('/'), "Деление", "font-mono font-bold")}
          {addButton("=", () => onAdd('='), "Равенство / присвоение значения", "font-mono font-bold")}
          {addButton("123", () => onAdd('value'), "Вставить текст или число", "font-mono")}
        </div>

        <DropdownMenuSeparator className="my-2" />

        {/* Условия */}
        <DropdownMenuLabel className="text-xs text-muted-foreground px-1 py-0.5">
          Условия
        </DropdownMenuLabel>
        <div className="flex gap-1 mb-2">
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAdd('trigger')}
                  className="h-6 px-2 text-xs gap-1.5 hover:bg-accent"
                >
                  <Zap className="h-3 w-3" />
                  Триггер
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-xs">
                Событие, которое запускает проверку (обновление поля, таймер, по запросу)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAdd('filter')}
                  className="h-6 px-2 text-xs gap-1.5 hover:bg-accent"
                >
                  <Filter className="h-3 w-3" />
                  Фильтр
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-xs">
                Условие для проверки значений (равно, больше, содержит и т.д.)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <DropdownMenuSeparator className="my-2" />

        {/* Данные */}
        <DropdownMenuLabel className="text-xs text-muted-foreground px-1 py-0.5">
          Данные
        </DropdownMenuLabel>
        <div className="flex gap-1 mb-2">
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAdd('input')}
                  className="h-6 px-2 text-xs gap-1.5 hover:bg-accent"
                >
                  <Database className="h-3 w-3" />
                  Инпут
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-xs">
                Входные данные из задач, профиля или других источников
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAdd('module')}
                  className="h-6 px-2 text-xs gap-1.5 hover:bg-accent"
                >
                  <Box className="h-3 w-3" />
                  Модуль
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-xs">
                Готовый модуль обработки данных (API, преобразование, AI)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <DropdownMenuSeparator className="my-2" />

        {/* Функции */}
        <DropdownMenuLabel className="text-xs text-muted-foreground px-1 py-0.5 flex items-center justify-between">
          Функции
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs max-w-xs">
                <div className="space-y-1">
                  <div><strong>MIN/MAX</strong> - минимум/максимум</div>
                  <div><strong>ROUND</strong> - округление</div>
                  <div><strong>LEN</strong> - длина текста</div>
                  <div><strong>CONCAT</strong> - объединение</div>
                  <div><strong>DATE</strong> - работа с датами</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DropdownMenuLabel>
        <div className="grid grid-cols-4 gap-1">
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAdd('IF')}
                  className="h-6 px-1 text-xs font-mono font-bold hover:bg-accent"
                >
                  IF
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-xs">
                Условие: если А, то Б, иначе В
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAdd('AVG')}
                  className="h-6 px-1 text-xs font-mono hover:bg-accent"
                >
                  AVG
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-xs">
                Среднее значение из списка
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAdd('SUM')}
                  className="h-6 px-1 text-xs font-mono hover:bg-accent"
                >
                  SUM
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-xs">
                Сумма всех значений
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAdd('COUNT')}
                  className="h-6 px-1 text-xs font-mono hover:bg-accent"
                >
                  CNT
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-xs">
                Количество элементов в списке
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
