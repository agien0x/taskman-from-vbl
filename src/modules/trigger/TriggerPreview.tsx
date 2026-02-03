import { ModulePreviewProps } from '../base/IModuleDefinition';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export const TriggerPreview: React.FC<ModulePreviewProps> = ({ module, executionLog }) => {
  const triggerCount = module.config.inputTriggers?.length || 0;
  const enabled = module.config.enabled;
  const strategy = module.config.strategy === 'all_match' ? 'ВСЕ условия' : 'ЛЮБОЕ условие';
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant={enabled ? 'default' : 'secondary'}>
          {enabled ? 'Включен' : 'Выключен'}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {triggerCount} триггер{triggerCount === 1 ? '' : triggerCount > 1 && triggerCount < 5 ? 'а' : 'ов'}
        </span>
      </div>
      
      {enabled && triggerCount > 0 && (
        <div className="text-xs text-muted-foreground">
          Стратегия: {strategy}
        </div>
      )}
      
      {executionLog && (
        <div className="flex items-center gap-1 text-xs">
          {executionLog.triggered ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span className="text-green-600">Сработал</span>
            </>
          ) : executionLog.checked ? (
            <>
              <XCircle className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Не сработал</span>
            </>
          ) : (
            <>
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Ожидание</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
