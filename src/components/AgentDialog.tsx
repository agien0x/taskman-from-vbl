import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Send, Loader2, Plus, History, HelpCircle, Star, FlaskConical, ChevronDown } from "lucide-react";
import { Agent, AVAILABLE_MODELS, INPUT_TYPES, INPUT_GROUPS, InputElement, DestinationElement, RouterConfig, TriggerConfig, AgentModule } from "@/types/agent";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VoiceInputWithAgents } from "@/components/ui/VoiceInputWithAgents";
import { Textarea } from "./ui/textarea";
import { UnifiedEditor, UnifiedEditorHandle } from "@/components/editor/UnifiedEditor";
import { AgentDestinationsEditor } from "./AgentDestinationsEditor";
import { AgentRouterRichEditor } from "./AgentRouterRichEditor";
import { AgentTriggerEditor } from "./AgentTriggerEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "./ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { AgentExecutionTable } from "./AgentExecutionTable";
import { AgentAnalytics } from "./AgentAnalytics";
import { Filter } from "lucide-react";
import { DESTINATION_TYPES } from "@/types/agent";
import { InputSelectorButton } from "./InputSelectorButton";
import { useRef } from "react";
import { useAgentVersions } from "@/hooks/useAgentVersions";
import { AgentVersionCard } from "./AgentVersionCard";
import { useAgentRatings } from "@/hooks/useAgentRatings";
import { AgentRatingWidget } from "./AgentRatingWidget";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { ModuleCard } from "./ModuleCard";
import { ModuleAdder } from "./ModuleAdder";
import { ModuleEditor } from "./ModuleEditor";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AgentInputsProvider } from "@/contexts/AgentInputsContext";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { moduleRegistry } from "@/modules";

interface AgentDialogProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

const AgentDialog = ({ agent, open, onOpenChange, onSave }: AgentDialogProps) => {
  const [name, setName] = useState("");
  const [pitch, setPitch] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [combinedPrompt, setCombinedPrompt] = useState("");
  const [routerPrompt, setRouterPrompt] = useState("");
  const [inputElements, setInputElements] = useState<InputElement[]>([]);
  const [destinationElements, setDestinationElements] = useState<DestinationElement[]>([]);
  const [routerConfig, setRouterConfig] = useState<RouterConfig>({
    strategy: 'all_destinations',
    rules: [],
  });
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>({
    enabled: false,
    inputTriggers: [],
    strategy: 'any_match',
  });
  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [outputPreview, setOutputPreview] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [destinationFilter, setDestinationFilter] = useState<string>("all");
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [channelMessage, setChannelMessage] = useState("");
  const [modules, setModules] = useState<AgentModule[]>([]);
  const [editingModule, setEditingModule] = useState<AgentModule | null>(null);
  const [moduleExecutionLogs, setModuleExecutionLogs] = useState<Record<string, any>>({});
  const [isModuleEditorOpen, setIsModuleEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTestTask, setSelectedTestTask] = useState<any>(null);
  const [testTaskSelectorOpen, setTestTaskSelectorOpen] = useState(false);
  const [testTasks, setTestTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("general");
  const { toast } = useToast();
  const { versions, saveVersion, restoreVersion } = useAgentVersions(agent?.id || "");
  const { averageRating, ratings, addRating } = useAgentRatings(agent?.id || "");
  const inputsEditorRef = useRef<UnifiedEditorHandle>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setPitch(agent.pitch || "");
      setModel(agent.model);
      
      // Если уже есть модули, используем их
      if (agent.modules && agent.modules.length > 0) {
        let loadedModules = agent.modules as AgentModule[];
        
        // Auto-fix: если destinations модуль пустой и есть routing rules с type_ui_parent_suggestions,
        // создаем дефолтный destination для ParentSuggestions
        const destinationsModule = loadedModules.find(m => m.type === 'destinations');
        const routerModule = loadedModules.find(m => m.type === 'router');
        
        if (destinationsModule && 
            (!destinationsModule.config.elements || destinationsModule.config.elements.length === 0) &&
            routerModule?.config?.rules?.some((r: any) => r.destinationId === 'type_ui_parent_suggestions')) {
          console.log('[AgentDialog] Auto-creating ParentSuggestions destination');
          
          const parentSuggestionsDestination: DestinationElement = {
            id: 'dest_parent_suggestions',
            type: 'ui_parent_suggestions',
            label: 'Предложенные паренты',
            targetType: 'ui_component',
            componentName: 'ParentSuggestions',
            eventType: 'parent_suggestions_ready',
            order: 0
          };
          
          // Обновляем destinations модуль
          loadedModules = loadedModules.map(m => {
            if (m.type === 'destinations') {
              return {
                ...m,
                config: {
                  ...m.config,
                  elements: [parentSuggestionsDestination]
                }
              };
            }
            // Обновляем routing rules чтобы они ссылались на правильный ID
            if (m.type === 'router' && m.config?.rules) {
              return {
                ...m,
                config: {
                  ...m.config,
                  rules: m.config.rules.map((r: any) => {
                    if (r.destinationId === 'type_ui_parent_suggestions') {
                      return { ...r, destinationId: 'dest_parent_suggestions' };
                    }
                    return r;
                  })
                }
              };
            }
            return m;
          });
        }
        
        setModules(loadedModules);
      } else {
        // Конвертируем старый формат в модули
        const convertedModules: AgentModule[] = [];
        
        // 1. Триггер
        const triggerConfigData = (agent as any).trigger_config || {
          enabled: false,
          inputTriggers: [],
          strategy: 'any_match',
        };
        convertedModules.push({
          id: `trigger_${Date.now()}`,
          type: 'trigger',
          order: 0,
          config: triggerConfigData,
        });
        
        // 2. Промпт и инпуты
        const rawInputs = (agent as any).inputs_raw;
        let combinedContent = '';
        
        if (rawInputs) {
          combinedContent = rawInputs;
        } else {
          combinedContent = agent.prompt || '';
          const inputsArray = Array.isArray(agent.inputs) ? agent.inputs : [];
          const mappedInputs = inputsArray.map((inp: any) => ({
            id: inp.id,
            type: inp.type,
            label: inp.customText || inp.type,
            content: inp.customText,
          }));
          
          const inputsContent = mappedInputs.map(el => 
            el.type === 'text' || el.type === 'custom_text' 
              ? el.content 
              : `<agent-input elementId="${el.id}" label="${el.label}" type="${el.type}"></agent-input>`
          ).join(' ');
          
          if (inputsContent) {
            combinedContent += (combinedContent ? '\n\n' : '') + inputsContent;
          }
        }
        
        convertedModules.push({
          id: `prompt_${Date.now()}`,
          type: 'prompt',
          order: 1,
          config: { content: combinedContent },
        });
        
        // 3. Модель
        convertedModules.push({
          id: `model_${Date.now()}`,
          type: 'model',
          order: 2,
          config: { model: agent.model },
        });
        
        // 4. Извлекатель переменных JSON
        convertedModules.push({
          id: `json_extractor_${Date.now()}`,
          type: 'json_extractor',
          order: 3,
          config: { variables: [] },
        });
        
        // 5. Роутинг
        const rawRouter = (agent as any).router_raw;
        const routerConfigData = (agent as any).router_config || {
          strategy: 'all_destinations',
          rules: [],
        };
        convertedModules.push({
          id: `router_${Date.now()}`,
          type: 'router',
          order: 4,
          config: {
            ...routerConfigData,
            content: rawRouter || routerConfigData.description || '',
          },
        });
        
        // 6. Направления
        const outputsArray = Array.isArray(agent.outputs) ? agent.outputs : [];
        const mappedOutputs = outputsArray.map((out: any) => ({
          id: out.id,
          type: out.type,
          label: out.type,
          config: out.config,
        }));
        
        convertedModules.push({
          id: `destinations_${Date.now()}`,
          type: 'destinations',
          order: 5,
          config: { elements: mappedOutputs },
        });
        
        // 7. Каналы
        convertedModules.push({
          id: `channels_${Date.now()}`,
          type: 'channels',
          order: 6,
          config: {
            channels: (agent as any).channels || [],
            message: (agent as any).channel_message || '',
          },
        });
        
        setModules(convertedModules);
      }
      
      // Загружаем данные для обратной совместимости
      const rawInputs = (agent as any).inputs_raw;
      const rawRouter = (agent as any).router_raw;
      
      let combinedContent = '';
      if (rawInputs) {
        combinedContent = rawInputs;
      } else {
        combinedContent = agent.prompt || '';
        const inputsArray = Array.isArray(agent.inputs) ? agent.inputs : [];
        const mappedInputs = inputsArray.map((inp: any) => ({
          id: inp.id,
          type: inp.type,
          label: inp.customText || inp.type,
          content: inp.customText,
        }));
        
        const inputsContent = mappedInputs.map(el => 
          el.type === 'text' || el.type === 'custom_text' 
            ? el.content 
            : `<agent-input elementId="${el.id}" label="${el.label}" type="${el.type}"></agent-input>`
        ).join(' ');
        
        if (inputsContent) {
          combinedContent += (combinedContent ? '\n\n' : '') + inputsContent;
        }
        
        setInputElements(mappedInputs);
      }
      
      setCombinedPrompt(combinedContent);
      
      const outputsArray = Array.isArray(agent.outputs) ? agent.outputs : [];
      const mappedOutputs = outputsArray.map((out: any) => ({
        id: out.id,
        type: out.type,
        label: out.type,
        config: out.config,
      }));
      
      setRouterPrompt(rawRouter || (agent as any).router_config?.description || '');
      setDestinationElements(mappedOutputs);
      setRouterConfig((agent as any).router_config || {
        strategy: 'all_destinations',
        rules: [],
      });
      setTriggerConfig((agent as any).trigger_config || {
        enabled: false,
        inputTriggers: [],
        strategy: 'any_match',
      });
      setSelectedChannels((agent as any).channels || []);
      setChannelMessage((agent as any).channel_message || '');
    } else {
      setName("");
      setPitch("");
      setModel("google/gemini-2.5-flash");
      setCombinedPrompt("");
      setRouterPrompt("");
      setOutputPreview("");
      setInputElements([]);
      setDestinationElements([]);
      setRouterConfig({
        strategy: 'all_destinations',
        rules: [],
      });
      setTriggerConfig({
        enabled: false,
        inputTriggers: [],
        strategy: 'any_match',
      });
      setSelectedChannels([]);
      setChannelMessage('');
      setModules([]);
    }
    setTestInput("");
    setTestOutput("");
    setOutputPreview("");
  }, [agent, open]);

  useEffect(() => {
    if (combinedPrompt) {
      const parsed = parseInputsFromHTML(combinedPrompt);
      setInputElements(parsed);
    }
  }, [combinedPrompt]);

  // Вычисляем динамические инпуты из модулей (их outputs)
  const getDynamicInputs = (): InputElement[] => {
    const dynamicInputs: InputElement[] = [];
    
    modules.forEach(module => {
      // JSON extractor модуль: каждая переменная - отдельный output
      if (module.type === 'json_extractor' && module.config?.variables) {
        module.config.variables.forEach((variable: any) => {
          dynamicInputs.push({
            id: `json_${variable.id}`,
            type: `json_${variable.name}`,
            label: variable.name,
            content: variable.description || variable.path,
          });
        });
      }
      
      // Model модуль: output - ответ LLM
      if (module.type === 'model' && module.config?.model) {
        dynamicInputs.push({
          id: `module_${module.id}_output`,
          type: `module_${module.id}_llm_response`,
          label: `${module.config.model} ответ`,
          content: 'Ответ модели LLM',
        });
      }
      
      // Trigger модуль: output - статус триггера
      if (module.type === 'trigger' && module.config?.enabled) {
        dynamicInputs.push({
          id: `module_${module.id}_trigger_status`,
          type: `module_${module.id}_trigger_status`,
          label: `Триггер статус`,
          content: 'Информация о срабатывании триггера',
        });
      }
      
      // Router модуль: output - выбранные направления
      if (module.type === 'router') {
        dynamicInputs.push({
          id: `module_${module.id}_routing_result`,
          type: `module_${module.id}_routing_result`,
          label: `Результат роутинга`,
          content: 'Выбранные направления',
        });
      }
      
      // Destinations модуль: добавляем каждое направление как отдельный input + результат отправки
      if (module.type === 'destinations' && module.config?.elements) {
        // Добавляем каждое направление как отдельный input
        const elements = module.config.elements as DestinationElement[];
        elements.forEach((dest: DestinationElement) => {
          let displayLabel = dest.label;
          
          if (!displayLabel) {
            if (dest.targetType === 'ui_component') {
              displayLabel = dest.componentName || 'UI Component';
            } else if (dest.targetTable && dest.targetColumn) {
              displayLabel = `${dest.targetTable}.${dest.targetColumn}`;
            } else {
              displayLabel = dest.type || 'Database';
            }
          }
          
          dynamicInputs.push({
            id: dest.id,
            type: `destination_${dest.id}`,
            label: displayLabel,
            content: `Направление: ${displayLabel}`,
          });
        });
        
        // Также добавляем общий результат отправки
        dynamicInputs.push({
          id: `module_${module.id}_destinations_result`,
          type: `module_${module.id}_destinations_result`,
          label: `Результат направлений`,
          content: 'Статус отправки в направления',
        });
      }
      
      // Channels модуль: output - результаты отправки в каналы
      if (module.type === 'channels' && module.config?.channels) {
        dynamicInputs.push({
          id: `module_${module.id}_channels_result`,
          type: `module_${module.id}_channels_result`,
          label: `Результат каналов`,
          content: 'Статус отправки в каналы',
        });
      }
      
      // Prompt модуль: output - сформированный промпт
      if (module.type === 'prompt' && module.config?.content) {
        dynamicInputs.push({
          id: `module_${module.id}_prompt`,
          type: `module_${module.id}_prompt_output`,
          label: `Сформированный промпт`,
          content: 'Промпт с подставленными значениями',
        });
      }
    });
    
    return dynamicInputs;
  };

  // Объединяем inputElements с динамическими инпутами
  const allAvailableInputs = [...inputElements, ...getDynamicInputs()];

  const sanitizeTriggerConfig = (config: any) => {
    // Удаляем устаревшее поле rules, оставляем только inputTriggers
    const { rules, ...cleanConfig } = config;
    return {
      enabled: cleanConfig.enabled ?? false,
      inputTriggers: cleanConfig.inputTriggers || [],
      strategy: cleanConfig.strategy || 'any_match',
      correctActivateModuleId: cleanConfig.correctActivateModuleId,
      notCorrectActivateModuleId: cleanConfig.notCorrectActivateModuleId,
    };
  };

  const handleSave = async (updatedModule?: AgentModule) => {
    try {
      if (!name.trim()) {
        toast({
          title: "Ошибка",
          description: "Заполните название агента",
          variant: "destructive",
        });
        return;
      }

      // Если передан updatedModule, обновляем modules перед сохранением
      let modulesToSave = modules;
      if (updatedModule) {
        console.info('[AgentDialog] Applying updatedModule before save:', JSON.stringify(updatedModule, null, 2));
        modulesToSave = modules.map(m => m.id === updatedModule.id ? updatedModule : m);
      }

      // Проверяем что есть хотя бы один модуль промпта
      const promptCheck = modulesToSave.find(m => m.type === 'prompt');
      if (!promptCheck || !promptCheck.config.content?.trim()) {
        toast({
          title: "Ошибка",
          description: "Заполните промпт",
          variant: "destructive",
        });
        return;
      }

      setSaving(true);
      let agentId = agent?.id;

      // Extract data from modules for backward compatibility
      const promptModule = modulesToSave.find(m => m.type === 'prompt');
      const modelModule = modulesToSave.find(m => m.type === 'model');
      const triggerModule = modulesToSave.find(m => m.type === 'trigger');
      const routerModule = modulesToSave.find(m => m.type === 'router');
      
      // Sanitize trigger_config
      const sanitizedTriggerConfig = triggerModule?.config 
        ? sanitizeTriggerConfig(triggerModule.config)
        : { enabled: false, inputTriggers: [], strategy: 'any_match' };
      
      console.info('[AgentDialog] Saving agent with trigger_config:', JSON.stringify(sanitizedTriggerConfig, null, 2));
      console.info('[AgentDialog] Saving agent with modules:', JSON.stringify(modules, null, 2));
      
      const agentData = {
        name,
        pitch,
        model: modelModule?.config?.model || modelModule?.config?.selectedModel || 'grok-3',
        prompt: promptModule?.config?.content || '',
        modules: modulesToSave as any,
        trigger_config: sanitizedTriggerConfig as any,
        router_config: routerModule?.config || { strategy: 'all_destinations', rules: [] },
        updated_at: new Date().toISOString(),
      };

      if (agent) {
        const { error } = await supabase
          .from("agents")
          .update(agentData)
          .eq("id", agent.id);

        if (error) throw error;
        
        // Validation: re-fetch and compare
        const { data: savedAgent, error: fetchError } = await supabase
          .from("agents")
          .select('trigger_config, modules')
          .eq("id", agent.id)
          .single();
        
        if (!fetchError && savedAgent) {
          const savedTriggerConfig = savedAgent.trigger_config as any;
          const localTriggerConfig = sanitizedTriggerConfig;
          
          // Compare inputTriggers length
          if ((savedTriggerConfig?.inputTriggers?.length || 0) !== (localTriggerConfig?.inputTriggers?.length || 0)) {
            console.error('[AgentDialog] Mismatch detected!', {
              saved: savedTriggerConfig?.inputTriggers?.length,
              local: localTriggerConfig?.inputTriggers?.length
            });
            toast({
              title: "Несовпадение данных",
              description: "Сохранённые данные не соответствуют локальным. Повторите попытку.",
              variant: "destructive",
            });
          } else {
            console.info('[AgentDialog] Validation passed: trigger_config matches');
          }
        }
      } else {
        const { data, error } = await supabase
          .from("agents")
          .insert(agentData)
          .select()
          .single();

        if (error) throw error;
        agentId = data.id;
      }

      // Generate icon in background (non-blocking)
      if (agentId) {
        supabase.functions.invoke('generate-agent-icon', {
          body: { agentId, name, pitch }
        }).catch(err => {
          console.warn('Icon generation failed (non-critical):', err);
          // Don't show error to user - icon generation is optional
        });
      }

      toast({
        title: "Успешно",
        description: agent ? "Агент обновлён" : "Агент создан",
      });

      setSaving(false);
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving agent:", error);
      setSaving(false);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить агента",
        variant: "destructive",
      });
    }
  };

  const handleAddModule = (type: AgentModule['type']) => {
    const newModule: AgentModule = {
      id: `${type}_${Date.now()}`,
      type,
      order: modules.length,
      config: getDefaultModuleConfig(type),
    };
    setModules([...modules, newModule]);
  };

  const getDefaultModuleConfig = (type: AgentModule['type']): any => {
    // Проверяем, есть ли модуль в Registry
    const definition = moduleRegistry.get(type);
    if (definition) {
      return definition.getDefaultConfig();
    }
    
    // Fallback на старую логику для не мигрированных модулей
    switch (type) {
      case 'trigger':
        return { enabled: false, inputTriggers: [], strategy: 'any_match' };
      case 'prompt':
        return { content: '' };
      case 'model':
        return { model: 'google/gemini-2.5-flash' };
      case 'json_extractor':
        return { variables: [] };
      case 'router':
        return { strategy: 'all_destinations', rules: [], content: '' };
      case 'destinations':
        return { elements: [] };
      case 'channels':
        return { channels: [], message: '' };
      default:
        return {};
    }
  };

  const handleEditModule = (module: AgentModule) => {
    setEditingModule(module);
    setIsModuleEditorOpen(true);
  };

  const handleSaveModule = async (updatedModule?: AgentModule) => {
    console.log('[AgentDialog] handleSaveModule called with:', updatedModule);
    
    if (updatedModule) {
      // Обновляем массив modules немедленно, чтобы изменения были доступны другим модулям
      setModules(prev => {
        const updated = prev.map(m => m.id === updatedModule.id ? updatedModule : m);
        console.log('[AgentDialog] Updated modules array:', updated);
        return updated;
      });
      setEditingModule(updatedModule);
      
      // Логируем для отладки
      console.info('[AgentDialog] Module updated in state:', updatedModule.type, JSON.stringify(updatedModule.config, null, 2));
    } else {
      // Старая логика: обновляем из editingModule
      if (editingModule) {
        setModules(prev => prev.map(m => m.id === editingModule.id ? editingModule : m));
      }
    }
  };

  // Wrapper для сохранения триггер-модуля: обновляет стейт и сразу сохраняет в БД
  const saveTriggerModule = async (updatedModule?: AgentModule) => {
    if (!updatedModule) return;
    await handleSaveModule(updatedModule); // 1) Обновляем стейт
    await handleSave(updatedModule);       // 2) Сохраняем в БД с актуальными данными
  };

  const handleDeleteModule = (moduleId: string) => {
    setModules(modules.filter(m => m.id !== moduleId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setModules((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
    }
  };

  const SortableModuleCard = ({ module }: { module: AgentModule }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: module.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <ModuleCard
          module={module}
          onEdit={() => handleEditModule(module)}
          onDelete={() => handleDeleteModule(module.id)}
          isDragging={isDragging}
          dragHandleProps={listeners}
          executionLog={moduleExecutionLogs[module.type]}
        />
      </div>
    );
  };

  const handleTest = async () => {
    let inputData: any = {};
    
    if (selectedTestTask) {
      // Используем данные из выбранной задачи
      inputData = {
        task_title: selectedTestTask.title,
        task_content: selectedTestTask.content,
        task_pitch: selectedTestTask.pitch,
        task_priority: selectedTestTask.priority,
        task_column: selectedTestTask.column_id,
        task_owner: selectedTestTask.owner_id,
        task_start_date: selectedTestTask.start_date,
        task_end_date: selectedTestTask.end_date,
      };
    } else if (testInput.trim()) {
      inputData = { input: testInput };
    } else {
      toast({
        title: "Ошибка",
        description: "Выберите задачу или введите текст для тестирования",
        variant: "destructive",
      });
      return;
    }
    
    // Если есть DB-направления, требуем выбрать задачу для записи
    const hasDbDestinations = modules.some(m => m.type === 'destinations' && Array.isArray(m.config?.elements) && m.config.elements.some((e: any) => (e.targetType || 'database') === 'database'));
    if (hasDbDestinations && !selectedTestTask) {
      toast({
        title: "Нужна задача",
        description: "Выберите задачу для теста, чтобы записать результат в базу",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestOutput("");
    setModuleExecutionLogs({}); // Очищаем предыдущие логи

    try {
      const { data, error } = await supabase.functions.invoke("test-agent", {
        body: {
          agentId: agent?.id, // Передаем ID агента для получения modules_chain
          model,
          prompt: combinedPrompt,
          input: inputData,
          context: { 
            task_id: selectedTestTask?.id, 
            source: 'test' 
          }
        },
      });

      if (error) throw error;

      setTestOutput(data.output);
      setOutputPreview(data.output);
      
      // Сохраняем логи выполнения модулей
      if (data.modules_chain && Array.isArray(data.modules_chain)) {
        const logsMap: Record<string, any> = {};
        data.modules_chain.forEach((moduleLog: any) => {
          // Сопоставляем тип модуля из лога с модулями агента
          logsMap[moduleLog.type] = moduleLog;
        });
        setModuleExecutionLogs(logsMap);
      }
      
      setActiveTab("test"); // Автоматически переключаемся на вкладку "Тест"
      toast({
        title: "Тест завершён",
        description: "Результат отображён на вкладке 'Тест'",
      });
    } catch (error) {
      console.error("Error testing agent:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось протестировать агента",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const parseInputsFromHTML = (html: string): InputElement[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const elements: InputElement[] = [];
    
    const collectTextNodes = (node: Node): string => {
      let text = '';
      node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          text += child.textContent || '';
        } else if (child.nodeType === Node.ELEMENT_NODE && child.nodeName !== 'AGENT-INPUT') {
          text += collectTextNodes(child);
        }
      });
      return text;
    };
    
    const traverse = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        
        if (element.tagName === 'AGENT-INPUT') {
          elements.push({
            id: element.getAttribute('elementId') || `input_${Date.now()}`,
            type: element.getAttribute('type') || 'text',
            label: element.getAttribute('label') || '',
          });
        } else if (element.tagName === 'P' || element.tagName === 'DIV') {
          const textContent = collectTextNodes(element).trim();
          if (textContent) {
            elements.push({
              id: `text_${Date.now()}_${Math.random()}`,
              type: 'text',
              content: textContent,
            });
          }
          element.childNodes.forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName === 'AGENT-INPUT') {
              traverse(child);
            }
          });
          return;
        }
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        node.childNodes.forEach(traverse);
      }
    };
    
    traverse(doc.body);
    return elements;
  };

  const handleRestoreVersion = async (versionId: string) => {
    const restoredVersion = await restoreVersion(versionId);
    if (restoredVersion) {
      setName(restoredVersion.name);
      setModel(restoredVersion.model);
      setCombinedPrompt(restoredVersion.inputs_raw || restoredVersion.prompt);
      setRouterPrompt(restoredVersion.router_raw || "");
      setDestinationElements(restoredVersion.outputs || []);
      setRouterConfig(restoredVersion.router_config || {
        strategy: 'all_destinations',
        rules: [],
      });
      setTriggerConfig(restoredVersion.trigger_config || {
        enabled: false,
        inputTriggers: [],
        strategy: 'any_match',
      });
    }
  };

  const handleRatingSubmit = async () => {
    if (newRating === 0) {
      toast({
        title: "Ошибка",
        description: "Выберите оценку",
        variant: "destructive",
      });
      return;
    }
    await addRating(newRating);
    setShowRatingForm(false);
    setNewRating(0);
  };

  const getFieldValue = (task: any, fieldType: string): string => {
    if (!task) return '';
    
    switch(fieldType) {
      case 'task_title': return task.title || '';
      case 'task_content': return task.content || '';
      case 'task_priority': return task.priority || '';
      case 'task_column': return task.columnId || task.column_id || '';
      case 'task_owner': return task.owner_id || '';
      case 'task_start_date': return task.start_date || '';
      case 'task_end_date': return task.end_date || '';
      case 'task_pitch': return task.pitch || '';
      default:
        if (task.custom_columns) {
          const col = task.custom_columns.find((c: any) => c.id === fieldType);
          return col?.title || '';
        }
        return '';
    }
  };

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const insertInput = (type: string) => {
    const inputType = INPUT_TYPES.find(t => t.value === type);
    if (!inputType) return;

    const elementId = `input_${Date.now()}`;
    const variableName = type;
    
    const inputHtml = `<agent-input elementid="${elementId}" label="${inputType.label}" type="${type}" value="${variableName}"></agent-input>`;
    
    // Вставляем в позицию курсора через ref редактора
    if (inputsEditorRef.current?.insertContentAtCursor) {
      inputsEditorRef.current.insertContentAtCursor(inputHtml);
    } else {
      // Fallback: добавляем в конец
      setCombinedPrompt(prev => prev ? `${prev} ${inputHtml}` : inputHtml);
    }
  };

  const insertInputGroup = (inputs: Array<{ value: string; label: string }>) => {
    const inputsHtml = inputs.map(input => {
      const elementId = `input_${Date.now()}_${Math.random()}`;
      const variableName = input.value;
      return `<agent-input elementid="${elementId}" label="${input.label}" type="${input.value}" value="${variableName}"></agent-input>`;
    }).join(' ');
    
    // Вставляем группу в позицию курсора
    if (inputsEditorRef.current?.insertContentAtCursor) {
      inputsEditorRef.current.insertContentAtCursor(inputsHtml);
    } else {
      // Fallback: добавляем в конец
      setCombinedPrompt(prev => prev ? `${prev} ${inputsHtml}` : inputsHtml);
    }
  };

  return (
    <AgentInputsProvider availableInputs={allAvailableInputs}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2 pr-12">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-2">
                  <VoiceInputWithAgents value={name} onChange={setName}>
                    {({ value, onChange, disabled }) => (
                      <Input
                        value={value}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder="Название агента"
                      disabled={disabled}
                      className="h-8 text-base font-semibold border-none shadow-none focus-visible:ring-0 px-0"
                    />
                  )}
                </VoiceInputWithAgents>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="text-xs font-semibold mb-1">Последовательность работы агента:</p>
                      <ol className="text-xs space-y-0.5">
                        <li>1. <strong>Триггер</strong> - условия запуска агента</li>
                        <li>2. <strong>Промпт и инпуты</strong> - системный промпт с динамическими входными данными</li>
                        <li>3. <strong>Модель LLM</strong> - обработка запроса выбранной моделью</li>
                        <li>4. <strong>Правило роутинга</strong> - правила анализа аутпута для маршрутизации</li>
                        <li>5. <strong>Направления</strong> - места назначения с указанием что туда отправляется из аутпута</li>
                        <li>6. <strong>Каналы</strong> - каналы отправки сообщений (Email, Telegram)</li>
                      </ol>
                      {agent && combinedPrompt && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs font-semibold mb-1">Описание текущего агента:</p>
                          <p className="text-xs text-muted-foreground line-clamp-6">
                            {combinedPrompt.replace(/<[^>]*>/g, ' ').substring(0, 300)}...
                          </p>
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <VoiceInputWithAgents value={pitch} onChange={setPitch}>
                {({ value, onChange, disabled }) => (
                  <Input
                    value={value}
                    onChange={(e) => {
                      const words = e.target.value.split(' ');
                      if (words.length <= 7) {
                        onChange(e.target.value);
                      }
                    }}
                    placeholder="Краткое описание (до 7 слов)"
                    disabled={disabled}
                    className="h-6 text-xs text-muted-foreground/80 italic border-none shadow-none focus-visible:ring-0 px-0"
                  />
                )}
              </VoiceInputWithAgents>
            </div>
            {agent && (
              <AgentRatingWidget 
                averageRating={averageRating} 
                totalRatings={ratings.length}
                size="sm"
              />
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-2">
              <TabsTrigger value="general" className="text-xs py-1">Основное</TabsTrigger>
              <TabsTrigger value="history" className="text-xs py-1" disabled={!agent}>История</TabsTrigger>
              <TabsTrigger value="test" className="text-xs py-1">Тест</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-2 mt-0">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={modules.map(m => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {modules.sort((a, b) => a.order - b.order).map((module, index) => (
                      <div key={module.id}>
                        <SortableModuleCard module={module} />
                        <ModuleAdder onAddModule={handleAddModule} />
                      </div>
                    ))}
                    {modules.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground mb-4">
                          Нет модулей. Добавьте первый модуль для начала.
                        </p>
                        <ModuleAdder onAddModule={handleAddModule} />
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </TabsContent>

            <TabsContent value="history" className="space-y-3 mt-0">
              {agent && (
                <Tabs defaultValue="executions" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-3">
                    <TabsTrigger value="executions" className="text-xs">Выполнения</TabsTrigger>
                    <TabsTrigger value="analytics" className="text-xs">Аналитика</TabsTrigger>
                  </TabsList>

                  <TabsContent value="executions" className="space-y-3 mt-0">
                    {destinationElements && destinationElements.length > 0 && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Фильтр по направлению:</span>
                        </div>
                        <Select value={destinationFilter} onValueChange={setDestinationFilter}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Все направления" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Все направления</SelectItem>
                            {destinationElements.map((output: any) => {
                              const destType = DESTINATION_TYPES.find(d => d.value === output.type);
                              return (
                                <SelectItem key={output.id} value={output.type}>
                                  {destType?.label || output.type}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <AgentExecutionTable agentId={agent.id} destinationFilter={destinationFilter} />
                  </TabsContent>

                  <TabsContent value="analytics" className="mt-0">
                    <AgentAnalytics agentId={agent.id} />
                  </TabsContent>
                </Tabs>
              )}
            </TabsContent>

            <TabsContent value="test" className="space-y-3 mt-0">
              <div>
                <Label htmlFor="test-input" className="text-xs mb-1">Ввод</Label>
                <VoiceInputWithAgents value={testInput} onChange={setTestInput}>
                  {({ value, onChange, disabled }) => (
                    <Textarea
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder="Введите текст для тестирования"
                      disabled={disabled}
                      className="min-h-[100px]"
                    />
                  )}
                </VoiceInputWithAgents>
              </div>

              <Button onClick={handleTest} disabled={isTesting} className="w-full h-9">
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Тестирование...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Протестировать
                  </>
                )}
              </Button>

              {testOutput && (
                <div>
                  <Label htmlFor="test-output" className="text-xs mb-1">Вывод</Label>
                  <Textarea
                    id="test-output"
                    value={testOutput}
                    readOnly
                    className="min-h-[100px] bg-muted"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="mt-auto bg-background border-t px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">
              Отмена
            </Button>
            {agent && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <History className="h-3 w-3 mr-1" />
                    История ({versions.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[420px] bg-popover z-50" align="start">
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-2 pr-3">
                      {versions.length > 0 ? (
                        versions.map((version) => (
                          <AgentVersionCard
                            key={version.id}
                            version={version}
                            onRestore={handleRestoreVersion}
                          />
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Нет сохранённых версий
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="flex gap-2 items-center">
            {agent && (
              <>
                <div className="flex items-center gap-1">
                  <Popover open={testTaskSelectorOpen} onOpenChange={setTestTaskSelectorOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 text-xs flex items-center gap-1"
                        onClick={async () => {
                          if (!testTaskSelectorOpen) {
                            const { data: tasks } = await supabase
                              .from('tasks')
                              .select('id, title, content, pitch, priority, column_id, owner_id, start_date, end_date')
                              .order('created_at', { ascending: false })
                              .limit(100);
                            setTestTasks(tasks || []);
                          }
                        }}
                      >
                        {selectedTestTask ? selectedTestTask.title.slice(0, 20) + '...' : 'Выбрать задачу'}
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Поиск задачи..." />
                        <CommandList>
                          <CommandEmpty>Задачи не найдены</CommandEmpty>
                          <CommandGroup>
                            {testTasks.map((task) => (
                              <CommandItem
                                key={task.id}
                                value={`${task.id}-${task.title}`}
                                onSelect={() => {
                                  setSelectedTestTask(task);
                                  setTestTaskSelectorOpen(false);
                                }}
                              >
                                {task.title}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleTest}
                          disabled={isTesting || !combinedPrompt}
                          className="h-8 w-8 p-0"
                        >
                          <FlaskConical className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Запустить агента с данными из выбранной задачи
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {!showRatingForm ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowRatingForm(true)}
                    className="h-8 text-xs"
                  >
                    <Star className="h-3 w-3 mr-1" />
                    Оценить
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setNewRating(star)}
                          className="p-0"
                        >
                          <Star 
                            className={`h-4 w-4 ${star <= newRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        </button>
                      ))}
                    </div>
                    <Button 
                      size="sm" 
                      onClick={handleRatingSubmit}
                      className="h-7 text-xs px-2"
                    >
                      OK
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setShowRatingForm(false);
                        setNewRating(0);
                      }}
                      className="h-7 text-xs px-2"
                    >
                      Отмена
                    </Button>
                  </div>
                )}
              </>
            )}
            <Button onClick={() => handleSave()} className="h-8 text-xs">
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
      
      <ModuleEditor
        module={editingModule}
        open={isModuleEditorOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsModuleEditorOpen(false);
            setEditingModule(null);
          } else {
            setIsModuleEditorOpen(true);
          }
        }}
        onSave={handleSaveModule}
        availableInputs={allAvailableInputs}
        availableDestinations={modules.find(m => m.type === 'destinations')?.config?.elements || []}
        modules={modules}
        agentId={agent?.id}
        onSaveModule={saveTriggerModule}
      />
    </Dialog>
    </AgentInputsProvider>
  );
};

export default AgentDialog;