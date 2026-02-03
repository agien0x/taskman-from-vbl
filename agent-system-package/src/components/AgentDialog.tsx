import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Send, Loader2, Plus, History, HelpCircle, Star, FlaskConical, ChevronDown } from "lucide-react";
import { Agent, AVAILABLE_MODELS, INPUT_TYPES, INPUT_GROUPS, InputElement, DestinationElement, RouterConfig, TriggerConfig, AgentModule } from "../types/agent";
import { Textarea } from "./ui/textarea";
import { UnifiedEditor, UnifiedEditorHandle } from "./editor/UnifiedEditor";
import { AgentDestinationsEditor } from "./AgentDestinationsEditor";
import { AgentRouterRichEditor } from "./AgentRouterRichEditor";
import { AgentTriggerEditor } from "./AgentTriggerEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { AgentExecutionTable } from "./AgentExecutionTable";
import { AgentAnalytics } from "./AgentAnalytics";
import { Filter } from "lucide-react";
import { DESTINATION_TYPES } from "../types/agent";
import { InputSelectorButton } from "./InputSelectorButton";
import { useAgentVersions } from "../hooks/useAgentVersions";
import { AgentVersionCard } from "./AgentVersionCard";
import { useAgentRatings } from "../hooks/useAgentRatings";
import { AgentRatingWidget } from "./AgentRatingWidget";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { ModuleCard } from "./ModuleCard";
import { ModuleAdder } from "./ModuleAdder";
import { ModuleEditor } from "./ModuleEditor";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AgentInputsProvider } from "../contexts/AgentInputsContext";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { moduleRegistry } from "../modules";

interface AgentDialogProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  supabaseClient: any;
  toast: (props: { title?: string; description?: string; variant?: string }) => void;
}

const AgentDialog = ({ agent, open, onOpenChange, onSave, supabaseClient, toast }: AgentDialogProps) => {
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
  const { versions, saveVersion, restoreVersion } = useAgentVersions(agent?.id || "", supabaseClient, toast);
  const { averageRating, ratings, addRating } = useAgentRatings(agent?.id || "", supabaseClient, toast);
  const inputsEditorRef = useRef<UnifiedEditorHandle>(null);

  // Sanitize trigger config to remove outdated fields
  const sanitizeTriggerConfig = (config: any) => {
    const { rules, ...cleanConfig } = config;
    return {
      enabled: cleanConfig.enabled ?? false,
      inputTriggers: cleanConfig.inputTriggers || [],
      strategy: cleanConfig.strategy || 'any_match',
      correctActivateModuleId: cleanConfig.correctActivateModuleId,
      notCorrectActivateModuleId: cleanConfig.notCorrectActivateModuleId,
    };
  };
  
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
      
      if (agent.modules && agent.modules.length > 0) {
        let loadedModules = agent.modules as AgentModule[];
        
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
        const convertedModules: AgentModule[] = [];
        
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
        
        convertedModules.push({
          id: `model_${Date.now()}`,
          type: 'model',
          order: 2,
          config: { model: agent.model },
        });
        
        convertedModules.push({
          id: `json_extractor_${Date.now()}`,
          type: 'json_extractor',
          order: 3,
          config: { variables: [] },
        });
        
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

  const getDynamicInputs = (): InputElement[] => {
    const dynamicInputs: InputElement[] = [];
    
    modules.forEach(module => {
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
      
      if (module.type === 'model' && module.config?.model) {
        dynamicInputs.push({
          id: `module_${module.id}_output`,
          type: `module_${module.id}_llm_response`,
          label: `${module.config.model} ответ`,
          content: 'Ответ модели LLM',
        });
      }
      
      if (module.type === 'trigger' && module.config?.enabled) {
        dynamicInputs.push({
          id: `module_${module.id}_trigger_status`,
          type: `module_${module.id}_trigger_status`,
          label: `Триггер статус`,
          content: 'Информация о срабатывании триггера',
        });
      }
      
      if (module.type === 'router') {
        dynamicInputs.push({
          id: `module_${module.id}_routing_result`,
          type: `module_${module.id}_routing_result`,
          label: `Результат роутинга`,
          content: 'Выбранные направления',
        });
      }
      
      if (module.type === 'destinations' && module.config?.elements) {
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
        
        dynamicInputs.push({
          id: `module_${module.id}_destinations_result`,
          type: `module_${module.id}_destinations_result`,
          label: `Результат направлений`,
          content: 'Статус отправки в направления',
        });
      }
      
      if (module.type === 'channels' && module.config?.channels) {
        dynamicInputs.push({
          id: `module_${module.id}_channels_result`,
          type: `module_${module.id}_channels_result`,
          label: `Результат каналов`,
          content: 'Статус отправки в каналы',
        });
      }
      
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

  const getAllInputs = (): InputElement[] => {
    return [...inputElements, ...getDynamicInputs()];
  };

  const parseInputsFromHTML = (html: string): InputElement[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const inputTags = doc.querySelectorAll('agent-input');
    
    return Array.from(inputTags).map((tag, index) => ({
      id: tag.getAttribute('elementid') || `input_${index}`,
      type: tag.getAttribute('type') || 'text',
      label: tag.getAttribute('label') || 'Input',
      content: tag.getAttribute('value') || '',
    }));
  };

  const handleSave = async (updatedModule?: AgentModule) => {
    try {
      if (!name.trim()) {
        toast({
          title: "Ошибка",
          description: "Введите название агента",
          variant: "destructive",
        });
        return;
      }

      setSaving(true);
      
      // Получаем актуальный modules через функциональное обновление
      let modulesToSave: AgentModule[] = [];
      
      if (updatedModule) {
        console.info('[AgentDialog] Applying updatedModule before save:', JSON.stringify(updatedModule, null, 2));
        
        // Обновляем state и получаем актуальные данные одновременно
        await new Promise<void>((resolve) => {
          setModules(prev => {
            const moduleExists = prev.some(m => m.id === updatedModule.id);
            const updated = moduleExists 
              ? prev.map(m => m.id === updatedModule.id ? updatedModule : m)
              : [...prev, updatedModule]; // Добавляем новый модуль если его нет
            
            console.log('[AgentDialog] Updated modules array:', JSON.stringify(updated, null, 2));
            modulesToSave = updated; // Сохраняем для использования в БД
            resolve();
            return updated;
          });
        });
      } else {
        // Если updatedModule не передан, используем текущий state
        modulesToSave = modules;
      }

      // Проверяем что есть хотя бы один модуль промпта
      const promptCheck = modulesToSave.find(m => m.type === 'prompt');
      if (!promptCheck || !promptCheck.config.content?.trim()) {
        toast({
          title: "Ошибка",
          description: "Заполните промпт",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
      
      console.log('[AgentDialog] Saving to DB with modules:', JSON.stringify(modulesToSave, null, 2));

      // Sanitize trigger config before saving
      const sanitizedTriggerConfig = sanitizeTriggerConfig(triggerConfig);
      
      const agentData = {
        name,
        pitch,
        model,
        modules: modulesToSave,
        prompt: combinedPrompt,
        inputs: inputElements,
        outputs: destinationElements,
        router_config: routerConfig,
        trigger_config: sanitizedTriggerConfig,
        inputs_raw: combinedPrompt,
        router_raw: routerPrompt,
        channels: selectedChannels,
        channel_message: channelMessage,
      };

      if (agent) {
        const { error } = await supabaseClient
          .from("agents")
          .update(agentData)
          .eq("id", agent.id);

        if (error) {
          console.error('[AgentDialog] DB update error:', error);
          throw error;
        }

        console.log('[AgentDialog] Successfully updated agent in DB');

        // Validation: re-fetch and compare
        const { data: savedAgent, error: fetchError } = await supabaseClient
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

        await saveVersion(agentData);
      } else {
        const { error } = await supabaseClient
          .from("agents")
          .insert([agentData]);

        if (error) {
          console.error('[AgentDialog] DB insert error:', error);
          throw error;
        }
        
        console.log('[AgentDialog] Successfully created agent in DB');
      }

      toast({
        title: "Успешно",
        description: agent ? "Агент обновлен" : "Агент создан",
      });

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("[AgentDialog] Error saving agent:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить агента",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    const restoredVersion = await restoreVersion(versionId);
    if (restoredVersion) {
      setName(restoredVersion.name);
      setModel(restoredVersion.model);
      setCombinedPrompt(restoredVersion.inputs_raw || restoredVersion.prompt);
      setRouterPrompt(restoredVersion.router_raw || "");
      setInputElements(restoredVersion.inputs || []);
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

  const handleTest = async () => {
    if (!testInput.trim() && !selectedTestTask) {
      toast({
        title: "Ошибка",
        description: "Введите тестовые данные или выберите задачу",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestOutput("");
    setOutputPreview("");

    try {
      // Prepare input data based on selected task or manual input
      let inputData: Record<string, any> = {};
      if (selectedTestTask) {
        inputData = {
          task_id: selectedTestTask.id,
          task_title: selectedTestTask.title,
          task_content: selectedTestTask.content,
          task_pitch: selectedTestTask.pitch,
        };
      } else {
        try {
          inputData = JSON.parse(testInput);
        } catch {
          inputData = { input: testInput };
        }
      }

      const { data, error } = await supabaseClient.functions.invoke("test-agent", {
        body: {
          agentId: agent?.id, // Pass agent ID to fetch modules_chain
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
      
      // Save module execution logs
      if (data.modules_chain && Array.isArray(data.modules_chain)) {
        const logsMap: Record<string, any> = {};
        data.modules_chain.forEach((moduleLog: any) => {
          logsMap[moduleLog.type] = moduleLog;
        });
        setModuleExecutionLogs(logsMap);
      }
      
      setActiveTab("test"); // Auto-switch to test tab
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

  const handleAddModule = (moduleType: AgentModule['type']) => {
    const newModule: AgentModule = {
      id: `${moduleType}_${Date.now()}`,
      type: moduleType,
      order: modules.length,
      config: {},
    };

    setModules([...modules, newModule]);
    setEditingModule(newModule);
    setIsModuleEditorOpen(true);
  };

  const handleEditModule = (module: AgentModule) => {
    setEditingModule(module);
    setIsModuleEditorOpen(true);
  };

  const handleDeleteModule = (moduleId: string) => {
    setModules(modules.filter(m => m.id !== moduleId));
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
    } else {
      // Если updatedModule не передан, сохраняем текущий editingModule
      if (editingModule) {
        setModules(prev => prev.map(m => m.id === editingModule.id ? editingModule : m));
      }
    }
  };

  // Wrapper для сохранения триггер-модуля: сразу сохраняет в БД
  const saveTriggerModule = async (updatedModule?: AgentModule) => {
    if (!updatedModule) {
      console.warn('[AgentDialog] saveTriggerModule: updatedModule is undefined');
      return;
    }
    console.log('[AgentDialog] saveTriggerModule called with:', updatedModule);
    // Передаем updatedModule напрямую в handleSave, минуя handleSaveModule
    await handleSave(updatedModule);
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
          executionLog={moduleExecutionLogs[module.id]}
        />
      </div>
    );
  };

  return (
    <AgentInputsProvider availableInputs={getAllInputs()}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2 pr-12 border-b">
            <div className="space-y-1">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название агента"
                className="h-8 text-base font-semibold border-none shadow-none px-0 focus-visible:ring-0"
              />
              <div className="flex items-center gap-2">
                <Input
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  placeholder="Краткое описание (pitch)"
                  className="h-6 text-xs italic border-none shadow-none px-0 focus-visible:ring-0"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">Описание работы агента</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            {agent && (
              <AgentRatingWidget 
                averageRating={averageRating} 
                totalRatings={ratings.length}
                size="sm"
              />
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <div className="border-b">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">Основное</TabsTrigger>
                  <TabsTrigger value="history">История</TabsTrigger>
                  <TabsTrigger value="test">Тест</TabsTrigger>
                </TabsList>
              </div>

              <div className="py-4">
                <TabsContent value="general" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label>Модель</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Модули агента</h3>
                      <ModuleAdder onAddModule={handleAddModule} />
                    </div>

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
                          {modules.map((module) => (
                            <SortableModuleCard key={module.id} module={module} />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    {modules.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Нет модулей. Добавьте первый модуль.
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4 mt-0">
                  <Tabs defaultValue="executions" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="executions">Выполнения</TabsTrigger>
                      <TabsTrigger value="analytics">Аналитика</TabsTrigger>
                    </TabsList>
                    <TabsContent value="executions" className="mt-4">
                      {agent && (
                        <AgentExecutionTable
                          agentId={agent.id}
                          destinationFilter={destinationFilter}
                          supabaseClient={supabaseClient}
                          toast={toast}
                        />
                      )}
                    </TabsContent>
                    <TabsContent value="analytics" className="mt-4">
                      {agent && (
                        <AgentAnalytics agentId={agent.id} supabaseClient={supabaseClient} />
                      )}
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                <TabsContent value="test" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Тестовые данные</Label>
                      <Button
                        onClick={handleTest}
                        disabled={isTesting}
                        size="sm"
                      >
                        {isTesting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FlaskConical className="h-4 w-4 mr-2" />
                        )}
                        Запустить тест
                      </Button>
                    </div>
                    <Textarea
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      placeholder="Введите тестовые данные"
                      rows={4}
                    />
                  </div>

                  {testOutput && (
                    <div className="space-y-2">
                      <Label>Результат</Label>
                      <ScrollArea className="h-[300px] w-full border rounded-md p-4">
                        <pre className="text-xs">{outputPreview}</pre>
                      </ScrollArea>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="mt-auto bg-background border-t px-4 py-2 flex items-center justify-between shrink-0">
            {/* Левая часть */}
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

            {/* Правая часть */}
            <div className="flex gap-2 items-center">
              {agent && (
                <>
                  {/* Селектор задачи для тестирования */}
                  <div className="flex items-center gap-1">
                    <Popover open={testTaskSelectorOpen} onOpenChange={setTestTaskSelectorOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 text-xs flex items-center gap-1"
                          onClick={async () => {
                            if (!testTaskSelectorOpen) {
                              const { data: tasks } = await supabaseClient
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
                    
                    {/* Кнопка тестирования */}
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

                  {/* Блок рейтинга */}
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
                             className={`h-5 w-5 ${
                               star <= newRating ? 'text-pink-500 fill-pink-500' : 'text-gray-300'
                             }`}
                           >
                             <Star className="h-full w-full" />
                           </button>
                         ))}
                      </div>
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={handleRatingSubmit}
                        className="h-7 text-xs px-3"
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

              {/* Кнопка "Сохранить" */}
              <Button onClick={() => handleSave()} disabled={saving} className="h-8 text-xs">
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Сохранить
              </Button>
            </div>
          </div>

          <ModuleEditor
            module={editingModule}
            open={isModuleEditorOpen}
            onOpenChange={setIsModuleEditorOpen}
            onSave={handleSaveModule}
            availableInputs={inputElements}
            availableDestinations={destinationElements}
            modules={modules}
            agentId={agent?.id}
            onSaveModule={saveTriggerModule}
            supabaseClient={supabaseClient}
            toast={toast}
          />
        </DialogContent>
      </Dialog>
    </AgentInputsProvider>
  );
};

export default AgentDialog;
