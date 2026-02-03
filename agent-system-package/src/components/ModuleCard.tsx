import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { GripVertical, Settings, Trash2 } from "lucide-react";
import { AgentModule } from "../types/agent";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { moduleRegistry } from "../modules";

interface ModuleCardProps {
  module: AgentModule;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  executionLog?: any;
}

const MODULE_LABELS: Record<AgentModule['type'], string> = {
  trigger: "Триггер",
  prompt: "Промпт и инпуты",
  model: "Модель",
  json_extractor: "Извлекатель переменных JSON",
  router: "Правило роутинга",
  destinations: "Направления",
  channels: "Каналы",
};

const MODULE_COLORS: Record<AgentModule['type'], string> = {
  trigger: "bg-blue-100 text-blue-700 border-blue-200",
  prompt: "bg-purple-100 text-purple-700 border-purple-200",
  model: "bg-green-100 text-green-700 border-green-200",
  json_extractor: "bg-orange-100 text-orange-700 border-orange-200",
  router: "bg-pink-100 text-pink-700 border-pink-200",
  destinations: "bg-yellow-100 text-yellow-700 border-yellow-200",
  channels: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

export const ModuleCard = ({ module, onEdit, onDelete, isDragging, dragHandleProps, executionLog }: ModuleCardProps) => {
  const definition = moduleRegistry.get(module.type);
  
  const moduleLabel = definition?.label || MODULE_LABELS[module.type];
  const moduleColor = definition?.color || MODULE_COLORS[module.type];
  const ModuleIcon = definition?.icon;
  const PreviewComponent = definition?.PreviewComponent;
  
  const getModuleOutputs = (module: AgentModule): string[] => {
    switch (module.type) {
      case 'prompt':
        return module.config?.content ? ['Сформированный промпт'] : [];
      case 'model':
        return module.config?.model ? ['LLM ответ'] : [];
      case 'json_extractor':
        return (module.config?.variables || []).map((v: any) => v.name);
      case 'trigger':
        return module.config?.enabled ? ['Статус триггера'] : [];
      case 'router':
        return ['Результат роутинга'];
      case 'destinations':
        return ['Результат направлений'];
      case 'channels':
        return ['Результат каналов'];
      default:
        return [];
    }
  };
  
  const getModulePreview = (module: AgentModule): string => {
    switch (module.type) {
      case 'trigger':
        return module.config?.enabled 
          ? `${module.config.inputTriggers?.length || 0} триггеров настроено`
          : "Триггеры отключены";
      case 'prompt':
        const text = module.config?.content || "";
        const preview = text.replace(/<[^>]*>/g, ' ').trim();
        return preview.substring(0, 25) + (preview.length > 25 ? "..." : "");
      case 'model':
        return module.config?.model || "Модель не выбрана";
      case 'json_extractor':
        const jsonVariablesCount = module.config?.variables?.length || 0;
        const hasSource = module.config?.sourceInputId ? '✓ источник' : '⚠ источник не выбран';
        return `${jsonVariablesCount} переменных (${hasSource})`;
      case 'router':
        return module.config?.strategy === 'all_destinations' 
          ? "Во все направления"
          : `${module.config?.rules?.length || 0} правил`;
      case 'destinations':
        const destCount = module.config?.elements?.length || 0;
        return `${destCount} направлений`;
      case 'channels':
        const chanCount = module.config?.channels?.length || 0;
        return `${chanCount} каналов`;
      default:
        return "Нет данных";
    }
  };

  const outputs = getModuleOutputs(module);

  return (
    <Card className={cn(
      "group relative p-4 border transition-all hover:shadow-md cursor-pointer hover:border-primary/50",
      isDragging && "opacity-50 border-primary"
    )}>
      <div className="flex items-start gap-3">
        {dragHandleProps && (
          <div {...dragHandleProps} className="opacity-0 group-hover:opacity-100 transition-opacity cursor-move mt-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        
        <div className="flex-1 min-w-0" onClick={onEdit}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {ModuleIcon && (
                <div 
                  className="p-1.5 rounded"
                  style={{ backgroundColor: moduleColor }}
                >
                  <ModuleIcon className="h-4 w-4" style={{ color: 'currentColor' }} />
                </div>
              )}
              <Badge variant="outline" className={cn("text-xs font-medium", moduleColor)}>
                {moduleLabel}
              </Badge>
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          
          {PreviewComponent ? (
            <div className="text-sm text-muted-foreground">
              <PreviewComponent module={module} executionLog={executionLog} />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {getModulePreview(module)}
              </p>
              
              {outputs.length > 0 && module.type === 'json_extractor' && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {outputs.slice(0, 3).map((output, idx) => (
                    <Badge 
                      key={idx}
                      variant="secondary" 
                      className="text-xs"
                    >
                      → {output}
                    </Badge>
                  ))}
                  {outputs.length > 3 && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs"
                    >
                      +{outputs.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Лог выполнения */}
      {executionLog && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-2 text-xs">
            <Badge 
              variant={executionLog.status === 'success' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {executionLog.status === 'success' ? '✓ Успешно' : '✗ Ошибка'}
            </Badge>
            {executionLog.output && (
              <div className="flex-1 min-w-0">
                <span className="font-medium">Результат:</span>
                <div className="mt-1 p-2 bg-muted rounded text-xs font-mono overflow-auto max-h-20">
                  {typeof executionLog.output === 'string' 
                    ? executionLog.output
                    : JSON.stringify(executionLog.output, null, 2)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
