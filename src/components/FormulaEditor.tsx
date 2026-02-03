import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useModuleVersions } from "@/hooks/useModuleVersions";
import { ModuleVersionCard } from "@/components/ModuleVersionCard";
import { Plus, X, Zap, Play, Loader2, Copy, History, RotateCcw } from "lucide-react";
import { TriggerConfig, InputElement, AgentModule, TriggerCondition } from "@/types/agent";
import { TriggerConditionItem } from "@/components/TriggerConditionItem";
import { InputBadgeWithPopover } from "@/components/InputBadgeWithPopover";
import { ModuleBadgeWithPopover } from "@/components/ModuleBadgeWithPopover";
import { ConditionsBuilder } from "@/components/ConditionsBuilder";
import { LogicElementAdder } from "@/components/LogicElementAdder";
import { SortableLogicElementWithEdit } from "@/components/SortableLogicElementWithEdit";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star } from "lucide-react";
import { validateConditionLogic } from "@/utils/conditionLogicValidator";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface FormulaEditorProps {
  triggerConfig: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
  availableInputs: InputElement[];
  availableModules: AgentModule[];
  selectedTaskId?: string;
  agentId?: string;
  moduleId?: string;
  onSaveModule?: (updatedModule?: AgentModule) => Promise<void>;
}

type FormulaFunction = 'IF' | 'COUNT' | 'SUM' | 'AVG' | 'MAX' | 'MIN' | 'CONTAINS';

const FORMULA_FUNCTIONS: { value: FormulaFunction; label: string; template: string }[] = [
  { value: 'IF', label: 'IF', template: 'IF(condition, If_true, If_not_true)' },
  { value: 'COUNT', label: 'COUNT', template: 'COUNT(input)' },
  { value: 'SUM', label: 'SUM', template: 'SUM(input)' },
  { value: 'AVG', label: 'AVG', template: 'AVG(input)' },
  { value: 'MAX', label: 'MAX', template: 'MAX(input)' },
  { value: 'MIN', label: 'MIN', template: 'MIN(input)' },
  { value: 'CONTAINS', label: 'CONTAINS', template: 'CONTAINS(input, value)' },
];

const MODULE_LABELS: Record<AgentModule['type'], string> = {
  trigger: "Триггер",
  prompt: "Промпт",
  model: "Модель LLM",
  json_extractor: "JSON экстрактор",
  router: "Роутер",
  destinations: "Направления",
  channels: "Каналы",
};

export const FormulaEditor = ({ 
  triggerConfig, 
  onChange, 
  availableInputs,
  availableModules,
  selectedTaskId,
  agentId,
  moduleId,
  onSaveModule
}: FormulaEditorProps) => {
  const [selectedFunction, setSelectedFunction] = useState<FormulaFunction>('IF');
  const [editingPart, setEditingPart] = useState<'condition' | 'correct' | 'notCorrect' | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testOutput, setTestOutput] = useState<string>("");
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testInput, setTestInput] = useState<{ text: string; isError: boolean }>({ text: "", isError: false });
  const [testOutputDisplay, setTestOutputDisplay] = useState<{ text: string; isError: boolean }>({ text: "", isError: false });
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [formulaElements, setFormulaElements] = useState<Array<{
    id: string;
    type: 'function' | 'bracket' | 'operator' | 'math' | 'value' | 'input' | 'module' | 'condition' | 'if-structure' | 'arrow';
    value?: string;
    inputId?: string;
    moduleId?: string;
    // Для IF структуры
    conditionElements?: Array<{
      id: string;
      type: 'bracket' | 'operator' | 'math' | 'value' | 'input' | 'arrow' | 'condition';
      value?: string;
      inputId?: string;
      condition?: TriggerCondition;
    }>;
    correctModuleId?: string;
    notCorrectModuleId?: string;
  }>>([]);

  // Инициализация первого IF элемента из triggerConfig при монтировании
  useEffect(() => {
    if (formulaElements.length === 0 && triggerConfig.inputTriggers && triggerConfig.inputTriggers.length > 0) {
      const conditionElements: Array<{
        id: string;
        type: 'input' | 'condition' | 'bracket' | 'operator';
        inputId?: string;
        value?: string;
        condition?: TriggerCondition;
      }> = [];

      // Для каждого inputTrigger создаем элементы
      triggerConfig.inputTriggers.forEach((trigger, triggerIdx) => {
        // Добавляем input badge
        if (trigger.inputId) {
          conditionElements.push({
            id: `input_${triggerIdx}`,
            type: 'input',
            inputId: trigger.inputId,
          });
        }

        // Добавляем условия из trigger.conditions
        if (trigger.conditions && trigger.conditions.length > 0) {
          // Парсим conditionLogic для добавления скобок и операторов
          const logic = trigger.conditionLogic || '';
          let currentConditionIndex = 0;

          if (logic) {
            // Простой парсинг логики: разбиваем по пробелам и обрабатываем
            const tokens = logic.split(/\s+/);
            tokens.forEach((token) => {
              if (token === 'AND' || token === 'OR') {
                conditionElements.push({
                  id: `operator_${Date.now()}_${Math.random()}`,
                  type: 'operator',
                  value: token,
                });
              } else if (token === '(' || token === ')') {
                conditionElements.push({
                  id: `bracket_${Date.now()}_${Math.random()}`,
                  type: 'bracket',
                  value: token,
                });
              } else if (/^\d+$/.test(token)) {
                // Это индекс условия
                const conditionIdx = parseInt(token);
                if (trigger.conditions[conditionIdx]) {
                  conditionElements.push({
                    id: `condition_${triggerIdx}_${conditionIdx}`,
                    type: 'condition',
                    condition: trigger.conditions[conditionIdx],
                  });
                }
              }
            });
          } else {
            // Если нет логики, добавляем все условия подряд с OR между ними
            trigger.conditions.forEach((condition, condIdx) => {
              if (condIdx > 0) {
                conditionElements.push({
                  id: `operator_${triggerIdx}_${condIdx}`,
                  type: 'operator',
                  value: 'OR',
                });
              }
              conditionElements.push({
                id: `condition_${triggerIdx}_${condIdx}`,
                type: 'condition',
                condition: condition,
              });
            });
          }
        }
      });

      const initialIfStructure = {
        id: `if_main`,
        type: 'if-structure' as const,
        conditionElements,
        correctModuleId: triggerConfig.correctActivateModuleId,
        notCorrectModuleId: triggerConfig.notCorrectActivateModuleId || 'stop',
      };
      setFormulaElements([initialIfStructure]);
    }
  }, [triggerConfig.inputTriggers, triggerConfig.correctActivateModuleId, triggerConfig.notCorrectActivateModuleId]);

  const { versions, templates, saveVersion, saveAsTemplate, restoreVersion, deleteVersion } = useModuleVersions(moduleId || "", agentId || "");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  
  const handleSave = async () => {
    if (!onSaveModule) {
      toast.error("Функция сохранения не настроена");
      return;
    }
    try {
      // Синхронизируем первый IF элемент обратно в triggerConfig
      const firstIfStructure = formulaElements.find(el => el.type === 'if-structure');
      if (firstIfStructure && firstIfStructure.conditionElements) {
        const updated = { ...triggerConfig };
        
        // Извлекаем условия триггера из conditionElements
        const conditions = firstIfStructure.conditionElements
          .filter(el => el.type === 'condition' && el.condition)
          .map(el => el.condition!);
        
        // Извлекаем inputId
        const inputIds = firstIfStructure.conditionElements
          .filter(el => el.type === 'input' && el.inputId)
          .map(el => el.inputId!);
        
        // Строим conditionLogic из порядка элементов в conditionElements
        const logicParts: string[] = [];
        let conditionIndex = 0;
        
        firstIfStructure.conditionElements.forEach(el => {
          if (el.type === 'condition') {
            logicParts.push(String(conditionIndex));
            conditionIndex++;
          } else if (el.type === 'operator') {
            logicParts.push(el.value || '');
          } else if (el.type === 'bracket') {
            logicParts.push(el.value || '');
          }
        });
        
        const conditionLogic = logicParts.join(' ').trim();
        
        // Создаем inputTriggers по сегментам: каждый inputId получает СВОИ условия и логику
        const segments: Array<{ inputId: string; elements: typeof firstIfStructure.conditionElements }>=[] as any;
        {
          let currentInputId: string | undefined;
          let currentSegment: any[] = [];
          let preamble: any[] = []; // Элементы до первого input
          
          for (const el of firstIfStructure.conditionElements) {
            if (el.type === 'input') {
              // Сохраняем предыдущий сегмент
              if (currentInputId) {
                segments.push({ inputId: currentInputId, elements: currentSegment });
              }
              currentInputId = el.inputId!;
              // Если это первый input и есть preamble, добавляем его в начало сегмента
              currentSegment = currentInputId && preamble.length > 0 ? [...preamble] : [];
              preamble = []; // Очищаем preamble после использования
            } else {
              if (currentInputId) {
                currentSegment.push(el);
              } else {
                // Накапливаем элементы до первого input
                preamble.push(el);
              }
            }
          }
          if (currentInputId) {
            segments.push({ inputId: currentInputId, elements: currentSegment });
          }
          
          // НОВАЯ ЛОГИКА: Если нет inputId, но есть условия в preamble,
          // создаем глобальный триггер без привязки к input
          if (segments.length === 0 && preamble.length > 0) {
            // Проверяем, что в preamble есть хотя бы одно условие типа 'trigger'
            const hasTriggerCondition = preamble.some(el => 
              el.type === 'condition' && el.condition?.type === 'trigger'
            );
            
            if (hasTriggerCondition) {
              // Создаем псевдо-сегмент для глобального триггера
              // Используем специальный inputId для обозначения глобального триггера
              segments.push({ inputId: '_global_trigger', elements: preamble });
              console.info('[FormulaEditor] Created global trigger without input binding');
            }
          }
          
          console.info('[FormulaEditor] Segments before building inputTriggers:', JSON.stringify(segments, null, 2));
        }

        // Вспомогательная: собрать условия и локальную логику для сегмента
        const buildSegment = (elements: any[]) => {
          const segConditions: TriggerCondition[] = [];
          const logicParts: string[] = [];
          let localIndex = 0;
          for (const el of elements) {
            if (el.type === 'condition' && el.condition) {
              segConditions.push(el.condition);
              logicParts.push(String(localIndex));
              localIndex++;
            } else if (el.type === 'operator' || el.type === 'bracket') {
              if (el.value) logicParts.push(el.value);
            }
          }
          const segLogic = logicParts.join(' ').trim() || (segConditions.length > 1 ? segConditions.map((_, i) => i).join(' OR') : (segConditions.length === 1 ? '0' : ''));
          return { segConditions, segLogic };
        };

        // Сопоставим существующие триггеры по inputId, чтобы сохранить id
        const existingByInput: Record<string, { id: string }>=Object.fromEntries((triggerConfig.inputTriggers||[]).map(t=>[t.inputId, {id:t.id}]));

        updated.inputTriggers = segments.map((seg, idx) => {
          const { segConditions, segLogic } = buildSegment(seg.elements || []);
          const existing = existingByInput[seg.inputId];
          return {
            id: existing?.id || `trigger_${Date.now()}_${idx}`,
            inputId: seg.inputId,
            conditions: segConditions,
            conditionLogic: segConditions.length === 0 ? '' : (segLogic || '0'),
          };
        });

        
        updated.correctActivateModuleId = firstIfStructure.correctModuleId;
        updated.notCorrectActivateModuleId = firstIfStructure.notCorrectModuleId;
        
        // Обновляем состояние
        onChange(updated);
        
        // Сохраняем в версии ДО onSaveModule
        if (moduleId && agentId) {
          await saveVersion(updated, 'trigger');
        }
        
        // Формируем обновлённый модуль для передачи в onSaveModule
        const updatedModule: AgentModule = {
          id: moduleId || `trigger_${Date.now()}`,
          type: 'trigger',
          order: 0,
          config: updated,
        };
        
        console.info('[FormulaEditor] Saving trigger module with config:', JSON.stringify(updated, null, 2));
        
        // Передаем обновлённый модуль явно, чтобы избежать гонки
        await onSaveModule?.(updatedModule);
      }
      
      toast.success("Триггер сохранен");
    } catch (error) {
      console.error("Error saving trigger:", error);
      toast.error("Ошибка сохранения триггера");
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Введите название шаблона");
      return;
    }
    if (moduleId && agentId) {
      await saveAsTemplate(triggerConfig, 'trigger', templateName);
      setShowTemplateDialog(false);
      setTemplateName("");
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    const config = await restoreVersion(versionId);
    if (config) {
      onChange(config);
    }
  };

  // Цвета для логических блоков
  const blockColors = [
    'bg-blue-500/10 border-blue-500/30',
    'bg-purple-500/10 border-purple-500/30',
    'bg-green-500/10 border-green-500/30',
    'bg-orange-500/10 border-orange-500/30',
  ];

  const addFormulaElement = (elementType: 'AND' | 'OR' | '(' | ')' | 'trigger' | 'filter' | 'IF' | 'AVG' | 'SUM' | 'COUNT' | 'input' | 'module' | '+' | '-' | '*' | '/' | '=' | 'value') => {
    // Для IF создаем полноценную структуру
    if (elementType === 'IF') {
      const newElement = {
        id: `if_${Date.now()}`,
        type: 'if-structure' as const,
        conditionElements: [],
        correctModuleId: undefined,
        notCorrectModuleId: 'stop',
      };
      setFormulaElements([...formulaElements, newElement]);
      return;
    }

    const newElement = {
      id: `elem_${Date.now()}`,
      type: elementType === 'AND' || elementType === 'OR' ? 'operator' as const :
            elementType === '(' || elementType === ')' ? 'bracket' as const :
            ['+', '-', '*', '/', '='].includes(elementType) ? 'math' as const :
            elementType === 'value' ? 'value' as const :
            elementType === 'input' ? 'input' as const :
            elementType === 'module' ? 'module' as const :
            'condition' as const,
      value: elementType === 'AND' || elementType === 'OR' ? elementType :
             ['(', ')'].includes(elementType) ? elementType :
             ['+', '-', '*', '/', '='].includes(elementType) ? elementType :
             elementType === 'value' ? '' : undefined,
      inputId: elementType === 'input' ? '' : undefined,
      moduleId: elementType === 'module' ? '' : undefined,
    };
    setFormulaElements([...formulaElements, newElement]);
  };

  const removeFormulaElement = (id: string) => {
    setFormulaElements(formulaElements.filter(el => el.id !== id));
  };

  const updateFormulaElement = (id: string, updates: Partial<typeof formulaElements[0]>) => {
    setFormulaElements(formulaElements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const duplicateFormulaElement = (id: string) => {
    const elementToDuplicate = formulaElements.find(el => el.id === id);
    if (!elementToDuplicate) return;

    // Глубокое копирование элемента с новыми ID
    const duplicated = {
      ...elementToDuplicate,
      id: `${elementToDuplicate.type}_${Date.now()}`,
      conditionElements: elementToDuplicate.conditionElements?.map(condEl => ({
        ...condEl,
        id: `cond_elem_${Date.now()}_${Math.random()}`,
      })),
    };

    setFormulaElements([...formulaElements, duplicated]);
    toast.success("IF-блок скопирован");
  };

  const handleTestTrigger = async (element: typeof formulaElements[0]) => {
    if (element.type !== 'if-structure') return;

    // Получаем input из триггера
    const inputIds = element.conditionElements
      ?.filter(el => el.type === 'input' && el.inputId)
      .map(el => el.inputId!) || [];
    if (inputIds.length === 0) {
      toast.error("Не выбран input для триггера");
      return;
    }

    // Находим модуль для тестирования (correctModuleId)
    const moduleId = element.correctModuleId;
    if (!moduleId) {
      toast.error("Не выбран модуль для активации");
      return;
    }

    const module = availableModules.find(m => m.id === moduleId);
    if (!module) {
      toast.error("Модуль не найден");
      return;
    }

    setIsTesting(true);
    setTestOutput("");
    setShowTestDialog(true);

    try {
      // Получаем данные задачи если передан selectedTaskId
      let inputData: any = {};
      
      if (selectedTaskId) {
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', selectedTaskId)
          .single();

        if (taskError) {
          console.warn("Не удалось загрузить задачу:", taskError);
          setTestOutput("⚠️ Задача не выбрана. Тестирование с пустыми данными.\n\nДля полноценного тестирования выберите задачу в системе.");
          setIsTesting(false);
          return;
        }

        // Подставляем данные из задачи в зависимости от типа input
        inputIds.forEach(inputId => {
          const input = availableInputs.find(i => i.id === inputId);
          if (input) {
            switch (input.type) {
              case 'task_title':
                inputData['task_title'] = task.title;
                break;
              case 'task_content':
                inputData['task_content'] = task.content;
                break;
              case 'task_pitch':
                inputData['task_pitch'] = task.pitch;
                break;
              case 'task_priority':
                inputData['task_priority'] = task.priority;
                break;
              case 'task_column':
                inputData['task_column'] = task.column_id;
                break;
              case 'task_owner':
                inputData['task_owner'] = task.owner_id;
                break;
              case 'task_start_date':
                inputData['task_start_date'] = task.start_date;
                break;
              case 'task_end_date':
                inputData['task_end_date'] = task.end_date;
                break;
              default:
                inputData[input.type] = task[input.type] || '';
            }
          }
        });
      } else {
        // Если selectedTaskId не передан, показываем предупреждение
        setTestOutput("⚠️ Задача не выбрана для тестирования.\n\nДля полноценного тестирования триггера с реальными данными необходимо:\n1. Открыть задачу в системе\n2. Нажать кнопку тестирования триггера\n\nСейчас тестирование будет выполнено с пустыми данными.");
        setIsTesting(false);
        return;
      }

      // Формируем тестовые данные
      let testData: any = {
        input: JSON.stringify(inputData, null, 2),
      };

      // В зависимости от типа модуля формируем разные данные
      switch (module.type) {
        case 'model':
          testData = {
            model: module.config.model || 'grok-3',
            prompt: "Обработай следующие данные:",
            input: JSON.stringify(inputData, null, 2),
          };
          break;
        
        case 'prompt':
          testData = {
            model: 'grok-3',
            prompt: module.config.content || "",
            input: JSON.stringify(inputData, null, 2),
          };
          break;

        default:
          testData = {
            input: JSON.stringify(inputData, null, 2),
          };
      }

      const { data, error } = await supabase.functions.invoke("test-agent", {
        body: testData,
      });

      if (error) throw error;

      const output = data?.output || JSON.stringify(data, null, 2);
      setTestOutput(`✅ Тестирование успешно завершено\n\n📥 Input данные:\n${JSON.stringify(inputData, null, 2)}\n\n📤 Output:\n${output}`);
      toast.success("Тестирование завершено");
    } catch (error) {
      console.error("Error testing trigger:", error);
      toast.error("Ошибка при тестировании триггера");
      setTestOutput(`❌ Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Генерируем отображение формулы
  const generateFormulaDisplay = () => {
    const parts: JSX.Element[] = [];
    
    // Начало формулы
    parts.push(
      <span key="equals" className="text-primary font-mono font-bold">=</span>
    );

    // Функция
    parts.push(
      <Popover key="function-popover">
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 font-mono font-bold text-primary hover:bg-primary/10"
          >
            {selectedFunction}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2 bg-popover z-50" align="start">
          <div className="space-y-1">
            {FORMULA_FUNCTIONS.map((func) => (
              <Button
                key={func.value}
                variant={selectedFunction === func.value ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start text-xs font-mono"
                onClick={() => setSelectedFunction(func.value)}
              >
                {func.label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );

    parts.push(
      <span key="open-paren" className="text-muted-foreground font-mono">(</span>
    );

    // Основное IF условие теперь отображается через formulaElements
    parts.push(
      <span key="empty-hint" className="text-muted-foreground text-xs italic">
        Добавьте IF блок ниже →
      </span>
    );

    parts.push(
      <span key="close-paren" className="text-muted-foreground font-mono">)</span>
    );

    return parts;
  };


  const getModuleName = (moduleId?: string) => {
    if (!moduleId) return null;
    const module = availableModules.find(m => m.id === moduleId);
    return module ? MODULE_LABELS[module.type] : moduleId;
  };

  return (
    <Card className="p-3 space-y-3 bg-muted/30">
      {/* Заголовок с иконкой */}
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Триггер</span>
      </div>
      
      {/* Test Input */}
      {testInput.text && (
        <div className={`text-xs ${testInput.isError ? 'text-destructive' : 'text-muted-foreground'}`}>
          {testInput.text}
        </div>
      )}

      {/* Формула - редактируемая строка */}
      <div className="bg-background border border-border rounded-md p-2 min-h-[40px] flex items-center flex-wrap gap-1">
        {generateFormulaDisplay()}
        
        {/* Редактируемые элементы формулы */}
        {formulaElements.map((element, idx) => {
          // Определяем цвет блока на основе вложенности скобок
          let nestingLevel = 0;
          for (let i = 0; i < idx; i++) {
            if (formulaElements[i].type === 'bracket' && formulaElements[i].value === '(') nestingLevel++;
            if (formulaElements[i].type === 'bracket' && formulaElements[i].value === ')') nestingLevel--;
          }
          const blockColor = blockColors[nestingLevel % blockColors.length];

          if (element.type === 'operator') {
            return (
              <SortableLogicElementWithEdit
                key={element.id}
                id={element.id}
                type="operator"
                value={element.value!}
                onRemove={() => removeFormulaElement(element.id)}
                onToggle={() => updateFormulaElement(element.id, { 
                  value: element.value === 'AND' ? 'OR' : 'AND' 
                })}
              />
            );
          }

          if (element.type === 'bracket') {
            return (
              <div key={element.id} className={`flex items-center gap-0.5 px-1 rounded border ${blockColor}`}>
                <SortableLogicElementWithEdit
                  id={element.id}
                  type="bracket"
                  value={element.value!}
                  onRemove={() => removeFormulaElement(element.id)}
                />
              </div>
            );
          }

          if (element.type === 'math') {
            return (
              <SortableLogicElementWithEdit
                key={element.id}
                id={element.id}
                type="math"
                value={element.value!}
                onRemove={() => removeFormulaElement(element.id)}
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
                onRemove={() => removeFormulaElement(element.id)}
                onValueChange={(newValue) => updateFormulaElement(element.id, { value: newValue })}
              />
            );
          }

          if (element.type === 'input') {
            return (
              <div key={element.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${blockColor}`}>
                <span className="text-primary text-xs">→</span>
                <InputBadgeWithPopover
                  value={element.inputId || ''}
                  onChange={(inputId) => updateFormulaElement(element.id, { inputId })}
                  availableInputs={availableInputs}
                />
                <button
                  onClick={() => removeFormulaElement(element.id)}
                  className="text-destructive hover:bg-destructive/10 rounded p-0.5 text-xs"
                >
                  ×
                </button>
              </div>
            );
          }

          if (element.type === 'arrow') {
            return (
              <div key={element.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${blockColor}`}>
                <span className="text-primary text-lg font-bold">→</span>
                <button
                  onClick={() => removeFormulaElement(element.id)}
                  className="text-destructive hover:bg-destructive/10 rounded p-0.5 text-xs"
                >
                  ×
                </button>
              </div>
            );
          }

          if (element.type === 'module') {
            return (
              <div key={element.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${blockColor}`}>
                <ModuleBadgeWithPopover
                  value={element.moduleId || ''}
                  onChange={(moduleId) => updateFormulaElement(element.id, { moduleId })}
                  availableModules={availableModules}
                />
                <button
                  onClick={() => removeFormulaElement(element.id)}
                  className="text-destructive hover:bg-destructive/10 rounded p-0.5 text-xs"
                >
                  ×
                </button>
              </div>
            );
          }

          if (element.type === 'if-structure') {
            // Вычисляем conditionLogic для валидации (без хуков, т.к. мы внутри map)
            const conditionLogic = !element.conditionElements || element.conditionElements.length === 0 
              ? '' 
              : element.conditionElements
                  .map(condEl => {
                    if (condEl.type === 'operator') return condEl.value;
                    if (condEl.type === 'bracket') return condEl.value;
                    if (condEl.type === 'condition') {
                      const condIndex = element.conditionElements!.findIndex(el => el.id === condEl.id);
                      return condIndex >= 0 ? condIndex.toString() : '';
                    }
                    return '';
                  })
                  .filter(v => v)
                  .join(' ');

            // Подсчитываем количество условий для валидации
            const conditionsCount = element.conditionElements?.filter(el => el.type === 'condition').length || 0;

            // Валидация
            const validation = validateConditionLogic(conditionLogic, conditionsCount);

            return (
              <div key={element.id} className={`flex items-center flex-wrap gap-1 px-2 py-1 rounded border ${blockColors[0]}`}>
                {/* IF функция */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 font-mono font-bold text-primary hover:bg-primary/10 pointer-events-none"
                >
                  IF
                </Button>
                
                <span className="text-muted-foreground font-mono">(</span>

                {/* Condition - inline формула с подсветкой */}
                <div className="flex flex-col gap-1 w-full">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event: DragEndEvent) => {
                      const { active, over } = event;
                      if (over && active.id !== over.id && element.conditionElements) {
                        const oldIndex = element.conditionElements.findIndex(el => el.id === active.id);
                        const newIndex = element.conditionElements.findIndex(el => el.id === over.id);
                        const reordered = arrayMove(element.conditionElements, oldIndex, newIndex);
                        updateFormulaElement(element.id, { conditionElements: reordered });
                      }
                    }}
                  >
                    <SortableContext
                      items={element.conditionElements?.map(el => el.id) || []}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex items-center flex-wrap gap-0.5 bg-card border border-primary/20 rounded p-0.5 shadow-sm">
                        {element.conditionElements && element.conditionElements.length > 0 ? (
                          element.conditionElements.map((condEl) => {
                      if (condEl.type === 'operator') {
                        return (
                          <SortableLogicElementWithEdit
                            key={condEl.id}
                            id={condEl.id}
                            type="operator"
                            value={condEl.value!}
                            onRemove={() => {
                              const updated = { ...element };
                              updated.conditionElements = updated.conditionElements?.filter(el => el.id !== condEl.id);
                              updateFormulaElement(element.id, updated);
                            }}
                            onToggle={() => {
                              const updated = { ...element };
                              const condIndex = updated.conditionElements?.findIndex(el => el.id === condEl.id);
                              if (condIndex !== undefined && condIndex >= 0 && updated.conditionElements) {
                                updated.conditionElements[condIndex].value = condEl.value === 'AND' ? 'OR' : 'AND';
                                updateFormulaElement(element.id, updated);
                              }
                            }}
                          />
                        );
                      }

                      if (condEl.type === 'bracket') {
                        return (
                          <SortableLogicElementWithEdit
                            key={condEl.id}
                            id={condEl.id}
                            type="bracket"
                            value={condEl.value!}
                            onRemove={() => {
                              const updated = { ...element };
                              updated.conditionElements = updated.conditionElements?.filter(el => el.id !== condEl.id);
                              updateFormulaElement(element.id, updated);
                            }}
                          />
                        );
                      }

                      if (condEl.type === 'math') {
                        return (
                          <SortableLogicElementWithEdit
                            key={condEl.id}
                            id={condEl.id}
                            type="math"
                            value={condEl.value!}
                            onRemove={() => {
                              const updated = { ...element };
                              updated.conditionElements = updated.conditionElements?.filter(el => el.id !== condEl.id);
                              updateFormulaElement(element.id, updated);
                            }}
                          />
                        );
                      }

                      if (condEl.type === 'value') {
                        return (
                          <SortableLogicElementWithEdit
                            key={condEl.id}
                            id={condEl.id}
                            type="value"
                            value={condEl.value || ''}
                            onRemove={() => {
                              const updated = { ...element };
                              updated.conditionElements = updated.conditionElements?.filter(el => el.id !== condEl.id);
                              updateFormulaElement(element.id, updated);
                            }}
                            onValueChange={(newValue) => {
                              const updated = { ...element };
                              const condIndex = updated.conditionElements?.findIndex(el => el.id === condEl.id);
                              if (condIndex !== undefined && condIndex >= 0 && updated.conditionElements) {
                                updated.conditionElements[condIndex].value = newValue;
                                updateFormulaElement(element.id, updated);
                              }
                            }}
                          />
                        );
                      }

                      if (condEl.type === 'input') {
                        return (
                          <div key={condEl.id} className="flex items-center gap-1">
                            <InputBadgeWithPopover
                              value={condEl.inputId || ''}
                              onChange={(inputId) => {
                                const updated = { ...element };
                                const condIndex = updated.conditionElements?.findIndex(el => el.id === condEl.id);
                                if (condIndex !== undefined && condIndex >= 0 && updated.conditionElements) {
                                  updated.conditionElements[condIndex].inputId = inputId;
                                  updateFormulaElement(element.id, updated);
                                }
                              }}
                              availableInputs={availableInputs}
                            />
                            <button
                              onClick={() => {
                                const updated = { ...element };
                                updated.conditionElements = updated.conditionElements?.filter(el => el.id !== condEl.id);
                                updateFormulaElement(element.id, updated);
                              }}
                              className="text-destructive hover:bg-destructive/10 rounded p-0.5 text-xs"
                            >
                              ×
                            </button>
                          </div>
                        );
                      }

                      if (condEl.type === 'arrow') {
                        return (
                          <div key={condEl.id} className="flex items-center gap-1">
                            <span className="text-primary text-lg font-bold">→</span>
                            <button
                              onClick={() => {
                                const updated = { ...element };
                                updated.conditionElements = updated.conditionElements?.filter(el => el.id !== condEl.id);
                                updateFormulaElement(element.id, updated);
                              }}
                              className="text-destructive hover:bg-destructive/10 rounded p-0.5 text-xs"
                            >
                              ×
                            </button>
                          </div>
                        );
                      }

                      if (condEl.type === 'condition' && condEl.condition) {
                        return (
                          <div key={condEl.id} className="flex items-center gap-1">
                            <TriggerConditionItem
                              condition={condEl.condition}
                              onChange={(updatedCondition) => {
                                const updated = { ...element };
                                const condIndex = updated.conditionElements?.findIndex(el => el.id === condEl.id);
                                if (condIndex !== undefined && condIndex >= 0 && updated.conditionElements) {
                                  updated.conditionElements[condIndex].condition = updatedCondition;
                                  updateFormulaElement(element.id, updated);
                                }
                              }}
                              onRemove={() => {
                                const updated = { ...element };
                                updated.conditionElements = updated.conditionElements?.filter(el => el.id !== condEl.id);
                                updateFormulaElement(element.id, updated);
                              }}
                            />
                          </div>
                        );
                      }

                      return null;
                    })
                    ) : (
                      <span className="text-[10px] text-muted-foreground">пусто</span>
                    )}
                    
                    {/* Плюсик для добавления элементов в условие */}
                    <LogicElementAdder
                    onAdd={(elementType) => {
                      const updated = { ...element };
                      if (!updated.conditionElements) updated.conditionElements = [];
                      
                      // Обработка типов 'trigger' и 'filter'
                      if (elementType === 'trigger' || elementType === 'filter') {
                        const newCondition: TriggerCondition = {
                          id: `condition_${Date.now()}`,
                          type: elementType,
                          ...(elementType === 'trigger' ? {
                            triggerType: 'on_demand' as const
                          } : {
                            operator: 'equals' as const,
                            value: ''
                          })
                        };
                        
                        updated.conditionElements.push({
                          id: `cond_elem_${Date.now()}`,
                          type: 'condition' as const,
                          condition: newCondition,
                        });
                      } else {
                        const newCondElement = {
                          id: `cond_elem_${Date.now()}`,
                          type: elementType === 'AND' || elementType === 'OR' ? 'operator' as const :
                                elementType === '(' || elementType === ')' ? 'bracket' as const :
                                ['+', '-', '*', '/', '='].includes(elementType) ? 'math' as const :
                                elementType === 'value' ? 'value' as const :
                                elementType === '→' ? 'arrow' as const :
                                'input' as const,
                          value: elementType === 'AND' || elementType === 'OR' ? elementType :
                                 ['(', ')'].includes(elementType) ? elementType :
                                 ['+', '-', '*', '/', '='].includes(elementType) ? elementType :
                                 elementType === '→' ? '→' :
                                 elementType === 'value' ? '' : undefined,
                          inputId: elementType === 'input' ? '' : undefined,
                        };
                        
                        updated.conditionElements.push(newCondElement);
                      }
                        
                        updateFormulaElement(element.id, updated);
                      }} 
                    />
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* Строка валидации формулы */}
                  {conditionLogic && (
                    <TooltipProvider>
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
                    </TooltipProvider>
                  )}
                </div>

                <span className="text-muted-foreground font-mono">, </span>

                {/* If_true */}
                <span className="text-xs text-green-600 dark:text-green-400 font-mono">
                  If_true:
                </span>
                <ModuleBadgeWithPopover
                  value={element.correctModuleId || ''}
                  onChange={(moduleId) => updateFormulaElement(element.id, { correctModuleId: moduleId })}
                  availableModules={availableModules}
                  variant="correct"
                />

                <span className="text-muted-foreground font-mono">, </span>

                {/* If_not_true */}
                <span className="text-xs text-yellow-600 dark:text-yellow-400 font-mono">
                  If_not_true:
                </span>
                <ModuleBadgeWithPopover
                  value={element.notCorrectModuleId || ''}
                  onChange={(moduleId) => updateFormulaElement(element.id, { notCorrectModuleId: moduleId })}
                  availableModules={availableModules}
                  allowStop={true}
                  variant="notCorrect"
                />

                <span className="text-muted-foreground font-mono">)</span>

                {/* Кнопка тестирования триггера */}
                <button
                  onClick={() => handleTestTrigger(element)}
                  disabled={isTesting}
                  className="text-primary hover:bg-primary/10 rounded p-0.5 text-xs ml-1"
                  title="Тестировать триггер"
                >
                  {isTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                </button>

                {/* Кнопка копирования IF */}
                <button
                  onClick={() => duplicateFormulaElement(element.id)}
                  className="text-primary hover:bg-primary/10 rounded p-0.5 text-xs"
                  title="Копировать IF-блок"
                >
                  <Copy className="h-3 w-3" />
                </button>

                {/* Кнопка удаления IF */}
                <button
                  onClick={() => removeFormulaElement(element.id)}
                  className="text-destructive hover:bg-destructive/10 rounded p-0.5 text-xs"
                >
                  ×
                </button>
              </div>
            );
          }

          return null;
        })}
        
        {/* Кнопка добавления элементов */}
        <LogicElementAdder onAdd={addFormulaElement} />
      </div>

      {/* Блок управления */}
      <Separator />
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={triggerConfig.enabled}
            onCheckedChange={(enabled) => onChange({ ...triggerConfig, enabled })}
          />
          <Label className="text-xs">Включен</Label>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8">
            <Play className="h-3 w-3 mr-1" />
            Тестировать
          </Button>
          
          {agentId && moduleId && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <History className="h-3 w-3 mr-1" />
                    Версии ({versions.length + templates.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[420px] bg-popover z-50" align="end">
                  <Tabs defaultValue="versions" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-2">
                      <TabsTrigger value="versions">Версии</TabsTrigger>
                      <TabsTrigger value="templates">Шаблоны</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="versions">
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2 pr-3">
                          {versions.length > 0 ? (
                            versions.map((version) => (
                              <ModuleVersionCard
                                key={version.id}
                                version={version}
                                onRestore={handleRestoreVersion}
                                onDelete={deleteVersion}
                              />
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-4">
                              Нет сохранённых версий
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="templates">
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2 pr-3">
                          {templates.length > 0 ? (
                            templates.map((template) => (
                              <ModuleVersionCard
                                key={template.id}
                                version={template}
                                onRestore={handleRestoreVersion}
                                onDelete={deleteVersion}
                              />
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-4">
                              Нет шаблонов
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </PopoverContent>
              </Popover>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={() => setShowTemplateDialog(true)}
              >
                <Star className="h-3 w-3 mr-1" />
                Шаблон
              </Button>
            </>
          )}
          
          {onSaveModule && (
            <Button variant="default" size="sm" className="h-8" onClick={handleSave}>
              Сохранить
            </Button>
          )}
        </div>
      </div>
      
      {/* Test Output */}
      {testOutputDisplay.text && (
        <div className={`text-xs ${testOutputDisplay.isError ? 'text-destructive' : 'text-muted-foreground'} pt-2`}>
          {testOutputDisplay.text}
        </div>
      )}

      {/* Диалог с результатами тестирования */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Результат тестирования триггера</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isTesting ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Тестирование...</span>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  <pre className="whitespace-pre-wrap font-mono text-xs bg-muted p-3 rounded">
                    {testOutput || "Нет результатов"}
                  </pre>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог для сохранения шаблона */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Сохранить как шаблон</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Название шаблона</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Например: Проверка контента"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Отмена
              </Button>
              <Button onClick={handleSaveAsTemplate}>
                Сохранить шаблон
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
