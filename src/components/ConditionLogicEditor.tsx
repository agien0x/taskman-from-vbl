import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TriggerCondition, InputElement } from "@/types/agent";
import { SortableConditionItemWithEdit } from "@/components/SortableConditionItemWithEdit";
import { SortableLogicElementWithEdit } from "@/components/SortableLogicElementWithEdit";
import { LogicElementAdder } from "@/components/LogicElementAdder";
import { InputBadgeWithPopover } from "@/components/InputBadgeWithPopover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  validateConditionLogic,
} from "@/utils/conditionLogicValidator";

interface LogicElement {
  id: string;
  type: 'condition' | 'operator' | 'bracket' | 'function' | 'math' | 'value' | 'input' | 'module';
  conditionIndex?: number;
  operator?: 'AND' | 'OR';
  bracket?: '(' | ')';
  functionType?: 'IF';
  mathOperator?: '+' | '-' | '*' | '/' | '=';
  value?: string;
  inputId?: string;
  moduleId?: string;
}

interface ConditionLogicEditorProps {
  conditions: TriggerCondition[];
  conditionLogic: string;
  onConditionsChange: (conditions: TriggerCondition[]) => void;
  onLogicChange: (logic: string) => void;
  onConditionUpdate: (conditionId: string, updates: Partial<TriggerCondition>) => void;
  onConditionRemove: (conditionId: string) => void;
  onAddCondition: (type: 'trigger' | 'filter') => void;
  availableInputs?: InputElement[];
  hideFormula?: boolean;
}

export const ConditionLogicEditor = ({
  conditions,
  conditionLogic,
  onConditionsChange,
  onLogicChange,
  onConditionUpdate,
  onConditionRemove,
  onAddCondition,
  availableInputs = [],
  hideFormula = false,
}: ConditionLogicEditorProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Валидация в реальном времени
  const validation = useMemo(() => {
    return validateConditionLogic(conditionLogic, conditions.length);
  }, [conditionLogic, conditions.length]);

  // Парсим conditionLogic в структуру элементов
  const logicElements = useMemo(() => {
    // Если логика пустая, но есть хотя бы одно условие — показываем одно условие по умолчанию
    if (!conditionLogic) {
      if (conditions.length > 0) {
        return [{ id: 'condition_0', type: 'condition' as const, conditionIndex: 0 }];
      }
      return [];
    }
    
    const tokens = conditionLogic.split(/\s+/).filter(t => t.length > 0);
    const elements: LogicElement[] = [];
    
    tokens.forEach((token, idx) => {
      if (token === 'AND' || token === 'OR') {
        elements.push({
          id: `op_${idx}`,
          type: 'operator',
          operator: token as 'AND' | 'OR',
        });
      } else if (token === '(' || token === ')') {
        elements.push({
          id: `bracket_${idx}_${token}`,
          type: 'bracket',
          bracket: token as '(' | ')',
        });
      } else if (token === 'IF') {
        elements.push({
          id: `func_${idx}_IF`,
          type: 'function',
          functionType: 'IF',
        });
      } else if (!isNaN(Number(token))) {
        const conditionIdx = Number(token);
        if (conditionIdx < conditions.length) {
          elements.push({
            id: `condition_${conditionIdx}`,
            type: 'condition',
            conditionIndex: conditionIdx,
          });
        }
      }
    });
    
    return elements;
  }, [conditionLogic, conditions]);

  // Генерируем conditionLogic из элементов
  const generateLogic = (elements: LogicElement[]) => {
    return elements.map(el => {
      if (el.type === 'condition') return String(el.conditionIndex);
      if (el.type === 'operator') return el.operator;
      if (el.type === 'bracket') return el.bracket;
      if (el.type === 'function') return el.functionType;
      return '';
    }).join(' ');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = logicElements.findIndex(el => el.id === active.id);
      const newIndex = logicElements.findIndex(el => el.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newElements = arrayMove(logicElements, oldIndex, newIndex);
        
        // Пересобираем индексы условий
        let conditionCounter = 0;
        const reindexedElements = newElements.map(el => {
          if (el.type === 'condition') {
            const result = { ...el, conditionIndex: conditionCounter };
            conditionCounter++;
            return result;
          }
          return el;
        });

        // Переупорядочиваем сами условия
        const newConditions = [...conditions];
        const conditionElements = reindexedElements.filter(el => el.type === 'condition');
        const reorderedConditions = conditionElements.map(el => {
          const originalIndex = logicElements.find(
            origEl => origEl.id === el.id
          )?.conditionIndex ?? 0;
          return newConditions[originalIndex];
        });

        onConditionsChange(reorderedConditions);
        onLogicChange(generateLogic(reindexedElements));
      }
    }
  };

  const addElement = (elementType: 'AND' | 'OR' | '(' | ')' | 'trigger' | 'filter' | 'IF' | 'AVG' | 'SUM' | 'COUNT' | 'input' | 'module' | '+' | '-' | '*' | '/' | '=' | 'value' | '→', position?: number) => {
    // Для ConditionLogicEditor поддерживаем только базовые элементы
    if (elementType === 'trigger' || elementType === 'filter') {
      onAddCondition(elementType);
      return;
    }
    
    // Игнорируем только функции агрегации (они для формул, не для условий)
    if (['AVG', 'SUM', 'COUNT'].includes(elementType)) {
      console.log(`Element type ${elementType} is not supported in ConditionLogicEditor`);
      return;
    }
    
    let newElement: LogicElement;
    
    if (elementType === 'IF') {
      // IF с шаблоном: IF (условие) THEN действие ELSE действие
      newElement = {
        id: `func_${Date.now()}`,
        type: 'function',
        functionType: 'IF',
      };
    } else if (elementType === 'AND' || elementType === 'OR') {
      newElement = {
        id: `op_${Date.now()}`,
        type: 'operator',
        operator: elementType,
      };
    } else if (elementType === '(' || elementType === ')') {
      newElement = {
        id: `bracket_${Date.now()}_${elementType}`,
        type: 'bracket',
        bracket: elementType,
      };
    } else if (['+', '-', '*', '/', '='].includes(elementType)) {
      newElement = {
        id: `math_${Date.now()}`,
        type: 'math',
        mathOperator: elementType as '+' | '-' | '*' | '/' | '=',
      };
    } else if (elementType === 'value') {
      newElement = {
        id: `val_${Date.now()}`,
        type: 'value',
        value: '',
      };
    } else if (elementType === 'input') {
      newElement = {
        id: `input_${Date.now()}`,
        type: 'input',
        inputId: '',
      };
    } else if (elementType === 'module') {
      newElement = {
        id: `module_${Date.now()}`,
        type: 'module',
        moduleId: '',
      };
    } else {
      return;
    }

    let newElements: LogicElement[];
    if (position !== undefined && position >= 0 && position <= logicElements.length) {
      newElements = [
        ...logicElements.slice(0, position),
        newElement,
        ...logicElements.slice(position),
      ];
    } else {
      newElements = [...logicElements, newElement];
    }

    onLogicChange(generateLogic(newElements));
  };

  const removeElement = (elementId: string) => {
    const elementToRemove = logicElements.find(el => el.id === elementId);
    
    // Если удаляем условие, удаляем его из массива conditions
    if (elementToRemove?.type === 'condition' && elementToRemove.conditionIndex !== undefined) {
      const newConditions = conditions.filter((_, idx) => idx !== elementToRemove.conditionIndex);
      onConditionsChange(newConditions);
      
      // Обновляем формулу: переиндексируем все оставшиеся условия
      const newElements = logicElements
        .filter(el => el.id !== elementId)
        .map(el => {
          if (el.type === 'condition' && el.conditionIndex !== undefined) {
            // Если индекс был больше удаленного, уменьшаем его на 1
            const newIndex = el.conditionIndex > elementToRemove.conditionIndex 
              ? el.conditionIndex - 1 
              : el.conditionIndex;
            return { ...el, conditionIndex: newIndex };
          }
          return el;
        });
      
      onLogicChange(generateLogic(newElements));
    } else {
      // Для не-условий просто удаляем элемент
      const newElements = logicElements.filter(el => el.id !== elementId);
      onLogicChange(generateLogic(newElements));
    }
  };

  const toggleOperator = (elementId: string) => {
    const newElements = logicElements.map(el => {
      if (el.id === elementId && el.type === 'operator') {
        return {
          ...el,
          operator: el.operator === 'AND' ? 'OR' : 'AND',
        } as LogicElement;
      }
      return el;
    });
    onLogicChange(generateLogic(newElements));
  };

  if (conditions.length === 0) {
    return null;
  }

  // Удалили специальный рендер для одного условия. Всегда показываем общий редактор

  // Находим ошибки для конкретных элементов
  const getElementError = (elementIndex: number): string | undefined => {
    if (validation.isValid) return undefined;
    const positionErrors = validation.errors.filter(err => 
      err.position !== undefined && err.position === elementIndex
    );
    return positionErrors.length > 0 ? positionErrors[0].message : undefined;
  };

  return (
    <TooltipProvider>
      <div className="space-y-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={logicElements.map(el => el.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-wrap items-center gap-0.5">
              {logicElements.map((element, idx) => {
                const error = getElementError(idx);

                if (element.type === 'condition' && element.conditionIndex !== undefined) {
                  const condition = conditions[element.conditionIndex];
                  if (!condition) return null;
                  
                  return (
                    <SortableConditionItemWithEdit
                      key={element.id}
                      id={element.id}
                      condition={condition}
                      conditionIndex={element.conditionIndex}
                      onUpdate={(updates) => onConditionUpdate(condition.id, updates)}
                      onRemove={() => onConditionRemove(condition.id)}
                      onRemoveFromLogic={() => removeElement(element.id)}
                      isDraggable={true}
                      availableInputs={availableInputs}
                    />
                  );
                }

                if (element.type === 'operator') {
                  return (
                    <SortableLogicElementWithEdit
                      key={element.id}
                      id={element.id}
                      type="operator"
                      value={element.operator!}
                      onRemove={() => removeElement(element.id)}
                      onToggle={() => toggleOperator(element.id)}
                      error={error}
                    />
                  );
                }

                if (element.type === 'bracket') {
                  return (
                    <SortableLogicElementWithEdit
                      key={element.id}
                      id={element.id}
                      type="bracket"
                      value={element.bracket!}
                      onRemove={() => removeElement(element.id)}
                      error={error}
                    />
                  );
                }

                if (element.type === 'function') {
                  return (
                    <SortableLogicElementWithEdit
                      key={element.id}
                      id={element.id}
                      type="function"
                      value={element.functionType!}
                      onRemove={() => removeElement(element.id)}
                      error={error}
                    />
                  );
                }

                if (element.type === 'math') {
                  return (
                    <SortableLogicElementWithEdit
                      key={element.id}
                      id={element.id}
                      type="math"
                      value={element.mathOperator!}
                      onRemove={() => removeElement(element.id)}
                      error={error}
                    />
                  );
                }

                if (element.type === 'value') {
                  return (
                    <SortableLogicElementWithEdit
                      key={element.id}
                      id={element.id}
                      type="value"
                      value={element.value || ''}
                      onRemove={() => removeElement(element.id)}
                      onValueChange={(newValue) => {
                        const newElements = logicElements.map(el =>
                          el.id === element.id ? { ...el, value: newValue } : el
                        );
                        onLogicChange(generateLogic(newElements));
                      }}
                      error={error}
                    />
                  );
                }

                if (element.type === 'input') {
                  return (
                    <div key={element.id} className="flex items-center gap-1">
                      <span className="text-primary text-xs">→</span>
                      <InputBadgeWithPopover
                        value={element.inputId || ''}
                        onChange={(inputId) => {
                          const newElements = logicElements.map(el =>
                            el.id === element.id ? { ...el, inputId } : el
                          );
                          onLogicChange(generateLogic(newElements));
                        }}
                        availableInputs={availableInputs || []}
                      />
                      <button
                        onClick={() => removeElement(element.id)}
                        className="text-destructive hover:bg-destructive/10 rounded p-0.5"
                      >
                        ×
                      </button>
                    </div>
                  );
                }

                if (element.type === 'module') {
                  return (
                    <div key={element.id} className="flex items-center gap-1">
                      <span className="text-xs bg-accent px-2 py-0.5 rounded border">
                        Модуль: {element.moduleId || 'выбрать'}
                      </span>
                      <button
                        onClick={() => removeElement(element.id)}
                        className="text-destructive hover:bg-destructive/10 rounded p-0.5"
                      >
                        ×
                      </button>
                    </div>
                  );
                }

                return null;
              })}
              
              {/* Кнопка добавления в конце */}
              <LogicElementAdder onAdd={(type) => addElement(type)} />
            </div>
          </SortableContext>
        </DndContext>

        {/* Показываем текущую формулу с валидацией - отдельная строка */}
        {!hideFormula && conditionLogic && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`w-full text-[9px] font-mono px-1.5 py-0.5 rounded border cursor-help ${
                validation.isValid 
                  ? 'bg-muted/20 text-muted-foreground border-border/50' 
                  : 'bg-destructive/10 text-destructive border-destructive/30'
              }`}>
                {validation.isValid ? '✓' : '⚠️'} {conditionLogic}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-md bg-popover z-[100]">
              {validation.isValid ? (
                <p className="text-xs text-green-600 dark:text-green-400">✓ Формула корректна</p>
              ) : (
                <div className="space-y-1">
                  {validation.errors.map((error, idx) => (
                    <p key={idx} className="text-xs">⚠️ {error.message}</p>
                  ))}
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
