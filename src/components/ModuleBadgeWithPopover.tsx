import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { AgentModule } from "@/types/agent";

const MODULE_LABELS: Record<AgentModule['type'], string> = {
  trigger: "Триггер",
  prompt: "Промпт",
  model: "Модель LLM",
  json_extractor: "JSON экстрактор",
  router: "Роутер",
  destinations: "Направления",
  channels: "Каналы",
};

interface ModuleBadgeWithPopoverProps {
  value: string;
  onChange: (moduleId: string) => void;
  availableModules: AgentModule[];
  allowStop?: boolean;
  variant?: 'correct' | 'notCorrect' | 'default';
}

export const ModuleBadgeWithPopover = ({ 
  value, 
  onChange, 
  availableModules,
  allowStop = false,
  variant = 'default'
}: ModuleBadgeWithPopoverProps) => {
  const getModuleName = (moduleId?: string) => {
    if (!moduleId) return null;
    if (moduleId === 'stop') return 'Stop';
    const module = availableModules.find(m => m.id === moduleId);
    return module ? MODULE_LABELS[module.type] : moduleId;
  };

  const buttonVariant = variant === 'correct' ? 'bg-green-500/10 hover:bg-green-500/20 border-green-500/40' :
                        variant === 'notCorrect' ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/40' :
                        'bg-accent/20 hover:bg-accent/30 border-accent/40';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`h-6 px-2 text-[10px] ${buttonVariant}`}
        >
          {getModuleName(value) || '+ модуль'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 bg-popover z-50" align="start">
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground mb-1">
            {allowStop ? 'Выберите действие:' : 'Выберите модуль:'}
          </div>
          {allowStop && (
            <>
              <Button
                variant={value === 'stop' ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start text-xs text-yellow-600 dark:text-yellow-400"
                onClick={() => onChange('stop')}
              >
                Stop
              </Button>
              <div className="text-[10px] text-muted-foreground mt-2 mb-1">Или выберите модуль:</div>
            </>
          )}
          {availableModules.map((module) => (
            <Button
              key={module.id}
              variant={value === module.id ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => onChange(module.id)}
            >
              {MODULE_LABELS[module.type]}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
