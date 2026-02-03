import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { AgentModule, JsonExtractorConfig, AVAILABLE_MODELS, InputElement, DestinationElement } from "@/types/agent";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AgentTriggerEditor } from "./AgentTriggerEditor";
import { UnifiedEditor, UnifiedEditorHandle } from "./editor/UnifiedEditor";
import { JsonExtractorEditor } from "./JsonExtractorEditor";
import { AgentRouterRichEditor } from "./AgentRouterRichEditor";
import { AgentDestinationsEditor } from "./AgentDestinationsEditor";
import { Button } from "./ui/button";
import { InputSelectorButton } from "./InputSelectorButton";
import { useRef, useEffect, useState } from "react";
import { INPUT_TYPES } from "@/types/agent";
import { Separator } from "./ui/separator";
import { ModuleInputSelector } from "./ModuleInputSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { moduleRegistry } from "@/modules";

interface ModuleEditorProps {
  module: AgentModule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (module: AgentModule) => void;
  availableInputs: InputElement[];
  availableDestinations: DestinationElement[];
  modules?: AgentModule[];
  agentId?: string;
  onSaveModule?: (updatedModule?: AgentModule) => Promise<void>;
}

const MODULE_LABELS: Record<AgentModule['type'], string> = {
  trigger: "Триггер",
  prompt: "Промпт и инпуты",
  model: "Модель LLM",
  json_extractor: "Извлекатель переменных JSON",
  router: "Правило роутинга",
  destinations: "Направления",
  channels: "Каналы",
};

export const ModuleEditor = ({
  module,
  open,
  onOpenChange,
  onSave,
  availableInputs,
  availableDestinations,
  modules = [],
  agentId,
  onSaveModule,
}: ModuleEditorProps) => {
  const editorRef = useRef<UnifiedEditorHandle>(null);
  const [isTestingModule, setIsTestingModule] = useState(false);
  const [moduleTestOutput, setModuleTestOutput] = useState<string>("");
  const [testInput, setTestInput] = useState<string>("");
  const [showExecutionHistory, setShowExecutionHistory] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);

  // Логируем изменения module prop
  useEffect(() => {
    console.log('ModuleEditor: module prop changed:', module);
    // Сбрасываем output при смене модуля
    setModuleTestOutput("");
    setTestInput("");
  }, [module]);

  // Загружаем историю выполнений
  useEffect(() => {
    if (agentId && module?.type === 'trigger') {
      loadExecutionHistory();
    }
  }, [agentId, module?.type]);

  const loadExecutionHistory = async () => {
    if (!agentId) return;
    
    try {
      const { data, error } = await supabase
        .from('agent_executions')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setExecutionHistory(data || []);
    } catch (error) {
      console.error('Error loading execution history:', error);
    }
  };

  if (!module) return null;

  const handleConfigChange = (field: string, value: any) => {
    console.log('ModuleEditor: handleConfigChange called:', { field, value });
    // Сохраняем изменения сразу в родительский компонент
    const updatedModule = {
      ...module,
      config: {
        ...module.config,
        [field]: value,
      },
    };
    onSave(updatedModule);
  };

  const handleTestModule = async () => {
    if (!testInput.trim()) {
      toast.error("Введите тестовые данные");
      return;
    }

    setIsTestingModule(true);
    setModuleTestOutput("");

    try {
      let testData: any = { input: testInput };

      // Подготовка данных в зависимости от типа модуля
      switch (module.type) {
        case 'model':
          if (!module.config.model) {
            toast.error("Выберите модель LLM");
            return;
          }
          testData = {
            model: module.config.model,
            prompt: "Обработай следующие данные:",
            input: testInput,
          };
          break;
        
        case 'prompt':
          testData = {
            model: "grok-3",
            prompt: module.config.content || "",
            input: testInput,
          };
          break;

        case 'json_extractor':
          testData = {
            model: "grok-3",
            prompt: `Извлеки из текста следующие переменные: ${module.config.variables?.map((v: any) => v.name).join(', ')}. Верни в формате JSON.`,
            input: testInput,
          };
          break;

        case 'router':
          testData = {
            model: "grok-3",
            prompt: module.config.routingLogic || "Определи направление для данных",
            input: testInput,
          };
          break;

        default:
          toast.error("Тестирование этого типа модуля пока не поддерживается");
          return;
      }

      const { data, error } = await supabase.functions.invoke("test-agent", {
        body: testData,
      });

      if (error) throw error;

      const output = data?.output || JSON.stringify(data, null, 2);
      setModuleTestOutput(output);
      toast.success("Тестирование завершено");
    } catch (error) {
      console.error("Error testing module:", error);
      toast.error("Ошибка при тестировании модуля");
      setModuleTestOutput(`Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTestingModule(false);
    }
  };

  // Получаем динамические инпуты из модулей (их outputs)
  const getDynamicInputsFromModules = (): InputElement[] => {
    const dynamicInputs: InputElement[] = [];
    
    modules.forEach(mod => {
      // Проверяем, есть ли модуль в Registry
      const definition = moduleRegistry.get(mod.type);
      if (definition) {
        const outputs = definition.getDynamicOutputs(mod.config, mod.id);
        dynamicInputs.push(...outputs);
        return; // Переходим к следующему модулю
      }
      
      // Fallback на старую логику для не мигрированных модулей
      // JSON extractor модуль: каждая переменная - отдельный output
      if (mod.type === 'json_extractor' && mod.config?.variables) {
        // Добавляем общий output - полный JSON файл
        dynamicInputs.push({
          id: `module_${mod.id}_json_file`,
          type: `module_${mod.id}_json_file`,
          label: `JSON файл (${mod.config.variables.length} переменных)`,
          content: 'Полный JSON со всеми извлеченными переменными',
        });
        
        // Добавляем каждую переменную как отдельный output
        mod.config.variables.forEach((variable: any) => {
          dynamicInputs.push({
            id: `json_${variable.id}`,
            type: `json_${variable.name}`,
            label: variable.name,
            content: variable.description || variable.path,
          });
        });
      }
      
      // Model модуль: output - ответ LLM
      if (mod.type === 'model' && mod.config?.model) {
        dynamicInputs.push({
          id: `module_${mod.id}_output`,
          type: `module_${mod.id}_llm_response`,
          label: `${mod.config.model} ответ`,
          content: 'Ответ модели LLM',
        });
      }
      
      // Trigger модуль: output - статус триггера
      if (mod.type === 'trigger' && mod.config?.enabled) {
        dynamicInputs.push({
          id: `module_${mod.id}_trigger_status`,
          type: `module_${mod.id}_trigger_status`,
          label: `Триггер статус`,
          content: 'Информация о срабатывании триггера',
        });
      }
      
      // Router модуль: output - выбранные направления
      if (mod.type === 'router') {
        dynamicInputs.push({
          id: `module_${mod.id}_routing_result`,
          type: `module_${mod.id}_routing_result`,
          label: `Результат роутинга`,
          content: 'Выбранные направления',
        });
      }
      
      // Destinations модуль: output - результаты отправки
      if (mod.type === 'destinations') {
        // Обратная совместимость: читаем из elements если destinations пустой
        const destinations = mod.config?.destinations?.length > 0 
          ? mod.config.destinations 
          : mod.config?.elements || [];
        
        if (destinations.length > 0) {
          dynamicInputs.push({
            id: `module_${mod.id}_destinations_result`,
            type: `module_${mod.id}_destinations_result`,
            label: `Результат направлений`,
            content: 'Статус отправки в направления',
          });
        }
      }
      
      // Channels модуль: output - результаты отправки в каналы
      if (mod.type === 'channels' && mod.config?.channels) {
        dynamicInputs.push({
          id: `module_${mod.id}_channels_result`,
          type: `module_${mod.id}_channels_result`,
          label: `Результат каналов`,
          content: 'Статус отправки в каналы',
        });
      }
      
      // Prompt модуль: output - сформированный промпт
      if (mod.type === 'prompt' && mod.config?.content) {
        dynamicInputs.push({
          id: `module_${mod.id}_prompt`,
          type: `module_${mod.id}_prompt_output`,
          label: `Сформированный промпт`,
          content: 'Промпт с подставленными значениями',
        });
      }
    });
    
    return dynamicInputs;
  };

  const insertInput = (type: string) => {
    const inputType = INPUT_TYPES.find(t => t.value === type);
    if (!inputType) return;

    const elementId = `type_${type}`;
    const variableName = type;
    
    const inputHtml = `<agent-input elementid="${elementId}" label="${inputType.label}" type="${type}" value="${variableName}"></agent-input>`;
    
    const editor = editorRef.current?.getEditor();
    if (editor) {
      editor.chain().focus().insertContent(inputHtml).run();
    } else {
      handleConfigChange('content', (module.config.content || '') + ' ' + inputHtml);
    }
  };

  const insertInputGroup = (inputs: Array<{ value: string; label: string }>) => {
    const inputsHtml = inputs.map(input => {
      const elementId = `type_${input.value}`;
      return `<agent-input elementid="${elementId}" label="${input.label}" type="${input.value}" value="${input.value}"></agent-input>`;
    }).join(' ');
    
    const editor = editorRef.current?.getEditor();
    if (editor) {
      editor.chain().focus().insertContent(inputsHtml).run();
    } else {
      handleConfigChange('content', (module.config.content || '') + ' ' + inputsHtml);
    }
  };

  const renderModuleContent = () => {
    // Проверяем, есть ли модуль в Registry
    const definition = moduleRegistry.get(module.type);
    
    if (definition) {
      const EditorComponent = definition.EditorComponent;
      return (
        <EditorComponent
          module={module}
          onChange={(updated) => onSave(updated)}
          availableInputs={[...availableInputs, ...getDynamicInputsFromModules()]}
          availableModules={modules}
          onTest={handleTestModule}
          isTestingModule={isTestingModule}
          moduleTestOutput={moduleTestOutput}
          insertInput={insertInput}
          insertInputGroup={insertInputGroup}
        />
      );
    }
    
    // Fallback на старую логику для не мигрированных модулей
    switch (module.type) {
      case 'trigger':
        return (
          <div className="space-y-3">
            <AgentTriggerEditor
              triggerConfig={module.config}
              onChange={(config) => onSave({ ...module, config })}
              availableInputs={availableInputs}
              availableModules={modules}
              agentId={agentId}
              moduleId={module.id}
              onSaveModule={onSaveModule}
            />
          </div>
        );

      case 'prompt':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Промпт и инпуты</Label>
              <InputSelectorButton
                onSelectInput={insertInput}
                onSelectGroup={insertInputGroup}
              />
            </div>
            <UnifiedEditor
              ref={editorRef}
              content={module.config.content || ""}
              onChange={(content) => {
                console.log('ModuleEditor prompt onChange:', content);
                handleConfigChange('content', content);
              }}
              placeholder="Введите промпт и добавьте инпуты..."
              enableAgentInputs={true}
            />
            
            <Separator />
            
            <div className="space-y-3 pt-2">
              <Label className="text-sm">Тестирование промпта</Label>
              <div className="space-y-2">
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Введите тестовые данные для промпта..."
                  className="w-full min-h-[80px] p-2 text-sm border rounded-md bg-background"
                />
                <Button
                  onClick={handleTestModule}
                  disabled={isTestingModule || !testInput.trim() || !module.config.content}
                  size="sm"
                  className="w-full"
                >
                  {isTestingModule ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Тестирование...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Протестировать
                    </>
                  )}
                </Button>
              </div>
              
              {moduleTestOutput && (
                <Alert className="mt-2">
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">Output промпта:</div>
                      <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-2 rounded overflow-auto max-h-[200px]">
                        {moduleTestOutput}
                      </pre>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            {module.config.content && (
              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border mt-2">
                <strong>Output:</strong> Сформированный промпт (промпт с подставленными значениями)
              </div>
            )}
          </div>
        );

      case 'model':
        return (
          <div className="space-y-3">
            <ModuleInputSelector
              label="Входные данные для модели"
              value={module.config.sourceInputId}
              onChange={(inputId) => handleConfigChange('sourceInputId', inputId)}
              availableInputs={[...availableInputs, ...getDynamicInputsFromModules()]}
              placeholder="Выберите входные данные"
              description="Что будет обрабатывать модель (промпт, текст задачи и т.д.)"
            />
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-sm">Выберите модель LLM</Label>
              <Select
                value={module.config.model}
                onValueChange={(value) => handleConfigChange('model', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите модель" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            <div className="space-y-3 pt-2">
              <Label className="text-sm">Тестирование модуля</Label>
              <div className="space-y-2">
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Введите тестовые данные для модели..."
                  className="w-full min-h-[80px] p-2 text-sm border rounded-md bg-background"
                />
                <Button
                  onClick={handleTestModule}
                  disabled={isTestingModule || !testInput.trim()}
                  size="sm"
                  className="w-full"
                >
                  {isTestingModule ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Тестирование...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Протестировать
                    </>
                  )}
                </Button>
              </div>
              
              {moduleTestOutput && (
                <Alert className="mt-2">
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">Output модели:</div>
                      <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-2 rounded overflow-auto max-h-[200px]">
                        {moduleTestOutput}
                      </pre>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border mt-2">
              <strong>Output:</strong> LLM ответ модели
            </div>
          </div>
        );

      case 'json_extractor':
        return (
          <div className="space-y-3">
            <JsonExtractorEditor
              variables={module.config.variables || []}
              onChange={(variables) => handleConfigChange('variables', variables)}
              sourceInputId={module.config.sourceInputId}
              onSourceChange={(sourceInputId) => handleConfigChange('sourceInputId', sourceInputId)}
              availableInputs={[...availableInputs, ...getDynamicInputsFromModules()]}
            />
            
            <Separator />
            
            <div className="space-y-3 pt-2">
              <Label className="text-sm">Тестирование экстрактора</Label>
              <div className="space-y-2">
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Введите JSON или текст для извлечения переменных..."
                  className="w-full min-h-[80px] p-2 text-sm border rounded-md bg-background"
                />
                <Button
                  onClick={handleTestModule}
                  disabled={isTestingModule || !testInput.trim() || !module.config.variables?.length}
                  size="sm"
                  className="w-full"
                >
                  {isTestingModule ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Тестирование...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Протестировать
                    </>
                  )}
                </Button>
              </div>
              
              {moduleTestOutput && (
                <Alert className="mt-2">
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">Извлеченные переменные:</div>
                      <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-2 rounded overflow-auto max-h-[200px]">
                        {moduleTestOutput}
                      </pre>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        );

      case 'router':
        return (
          <div className="space-y-3">
            <ModuleInputSelector
              label="Данные для роутинга"
              value={module.config.sourceInputIds || module.config.sourceInputId}
              onChange={(inputIds) => {
                // Сохраняем как массив для множественного выбора
                if (Array.isArray(inputIds)) {
                  handleConfigChange('sourceInputIds', inputIds);
                } else {
                  handleConfigChange('sourceInputId', inputIds);
                }
              }}
              availableInputs={[...availableInputs, ...getDynamicInputsFromModules()]}
              placeholder="Выберите данные"
              description="Что будет использоваться для принятия решения о направлении"
              multiple={true}
            />
            
            <Separator />
            
            <AgentRouterRichEditor
              content={module.config.content || ""}
              onChange={(content) => handleConfigChange('content', content)}
              destinations={availableDestinations}
              rules={module.config.rules || []}
              onRulesChange={(rules) => handleConfigChange('rules', rules)}
              availableInputs={[...availableInputs, ...getDynamicInputsFromModules()]}
              modules={modules}
            />
            
            <Separator />
            
            <div className="space-y-3 pt-2">
              <Label className="text-sm">Тестирование роутера</Label>
              <div className="space-y-2">
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Введите тестовые данные для роутинга..."
                  className="w-full min-h-[80px] p-2 text-sm border rounded-md bg-background"
                />
                <Button
                  onClick={handleTestModule}
                  disabled={isTestingModule || !testInput.trim()}
                  size="sm"
                  className="w-full"
                >
                  {isTestingModule ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Тестирование...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Протестировать
                    </>
                  )}
                </Button>
              </div>
              
              {moduleTestOutput && (
                <Alert className="mt-2">
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">Output роутера:</div>
                      <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-2 rounded overflow-auto max-h-[200px]">
                        {moduleTestOutput}
                      </pre>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border mt-2">
              <strong>Output:</strong> Результат роутинга (выбранные направления)
            </div>
          </div>
        );

      case 'destinations':
        return (
          <div className="space-y-3">
            <ModuleInputSelector
              label="Данные для отправки"
              value={module.config.sourceInputIds || module.config.sourceInputId}
              onChange={(inputIds) => {
                if (Array.isArray(inputIds)) {
                  handleConfigChange('sourceInputIds', inputIds);
                } else {
                  handleConfigChange('sourceInputId', inputIds);
                }
              }}
              availableInputs={[...availableInputs, ...getDynamicInputsFromModules()]}
              placeholder="Выберите данные"
              description="Что будет отправлено в направления"
              multiple={true}
            />
            
            <Separator />
            
            <AgentDestinationsEditor
              elements={module.config.destinations || module.config.elements || []}
              onChange={(elements) => {
                // Update both for backward compatibility
                handleConfigChange('destinations', elements);
                handleConfigChange('elements', elements);
              }}
            />
            
            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
              <strong>Output:</strong> Результат направлений (статус отправки)
            </div>
          </div>
        );

      case 'channels':
        return (
          <div className="space-y-3">
            <ModuleInputSelector
              label="Данные для отправки"
              value={module.config.sourceInputIds || module.config.sourceInputId}
              onChange={(inputIds) => {
                if (Array.isArray(inputIds)) {
                  handleConfigChange('sourceInputIds', inputIds);
                } else {
                  handleConfigChange('sourceInputId', inputIds);
                }
              }}
              availableInputs={[...availableInputs, ...getDynamicInputsFromModules()]}
              placeholder="Выберите данные"
              description="Что будет отправлено в каналы (Email, Telegram)"
              multiple={true}
            />
            
            <Separator />
            
            <div className="text-sm text-muted-foreground">
              Редактор каналов (Email, Telegram) - в разработке
            </div>
            
            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
              <strong>Output:</strong> Результат отправки в каналы
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{MODULE_LABELS[module.type]}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {renderModuleContent()}
        </div>

        <Separator />

        {module.type === 'trigger' && (
          <div className="p-4 space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExecutionHistory(!showExecutionHistory)}
              className="w-full"
            >
              История выполнений {showExecutionHistory ? '▲' : '▼'}
            </Button>

            {showExecutionHistory && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {executionHistory.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    Нет данных о выполнениях
                  </div>
                ) : (
                  executionHistory.map((execution) => {
                    const modulesChain = execution.modules_chain as any[];
                    const triggerModule = modulesChain?.[0];
                    const inputTriggerType = triggerModule?.input?.trigger_type;
                    const outputAgentTriggered = triggerModule?.output?.agent_triggered;

                    return (
                      <div
                        key={execution.id}
                        className="text-xs text-muted-foreground border rounded p-2 space-y-1"
                      >
                        <div>
                          <span className="font-medium">Input:</span> {inputTriggerType || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Output:</span>{' '}
                          {outputAgentTriggered !== undefined ? String(outputAgentTriggered) : 'N/A'}
                        </div>
                        <div className="text-[10px] opacity-70">
                          {new Date(execution.created_at).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
