import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { GripVertical, Settings, Trash2 } from "lucide-react";
import { AgentModule } from "@/types/agent";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { moduleRegistry } from "@/modules";

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
  destinations: "bg-pink-100 text-pink-700 border-pink-200",
  channels: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

export const ModuleCard = ({ module, onEdit, onDelete, isDragging, dragHandleProps, executionLog }: ModuleCardProps) => {
  // Проверяем, есть ли модуль в Registry
  const definition = moduleRegistry.get(module.type);
  
  // Используем данные из Registry или fallback на старые константы
  const moduleLabel = definition?.label || MODULE_LABELS[module.type];
  const moduleColor = definition?.color || MODULE_COLORS[module.type];
  const ModuleIcon = definition?.icon;
  const PreviewComponent = definition?.PreviewComponent;
  
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

  const outputs = getModuleOutputs(module);

  return (
    <Card
      className={cn(
        "group relative p-3 hover:border-primary/50 transition-all cursor-pointer",
        isDragging && "opacity-50 border-primary"
      )}
    >
      <div className="flex items-start gap-2">
        <div 
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-move"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0" onClick={onEdit}>
          <div className="flex items-center gap-2 mb-1">
            {ModuleIcon && <ModuleIcon className="h-3 w-3" />}
            <Badge 
              variant="outline" 
              className={cn("text-xs", moduleColor)}
            >
              {moduleLabel}
            </Badge>
          </div>
          
          {PreviewComponent ? (
            <PreviewComponent module={module} executionLog={executionLog} />
          ) : (
            <>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                {getModulePreview(module)}
              </p>
              
              {outputs.length > 0 && module.type === 'json_extractor' && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {outputs.slice(0, 3).map((output, idx) => (
                    <Badge 
                      key={idx}
                      variant="secondary" 
                      className="text-[10px] px-1 py-0 h-4"
                    >
                      → {output}
                    </Badge>
                  ))}
                  {outputs.length > 3 && (
                    <Badge 
                      variant="secondary" 
                      className="text-[10px] px-1 py-0 h-4"
                    >
                      +{outputs.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="h-7 w-7 p-0"
          >
            <Settings className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Лог выполнения */}
      {executionLog && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={executionLog.status === 'success' ? 'default' : 'destructive'}
                  className="h-4 text-[10px]"
                >
                  {executionLog.status === 'success' ? '✓ Успешно' : '✗ Ошибка'}
                </Badge>
              </div>
              {executionLog.output && (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-medium whitespace-nowrap">Результат:</span>
                  <div className="p-1 px-2 bg-muted/30 rounded text-[10px] font-mono truncate flex-1">
                    {typeof executionLog.output === 'string' 
                      ? executionLog.output
                      : JSON.stringify(executionLog.output, null, 2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
