import { ModuleEditorProps } from '../base/IModuleDefinition';
import { DestinationsConfig } from './DestinationsModule';
import { AgentDestinationsEditor } from '@/components/AgentDestinationsEditor';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

export const DestinationsEditor = ({ 
  module, 
  onChange,
  onTest,
  isTestingModule,
  moduleTestOutput
}: ModuleEditorProps) => {
  const config = module.config as DestinationsConfig;
  
  // Обратная совместимость: читаем из elements если destinations пустой
  const currentDestinations = config.destinations?.length > 0 
    ? config.destinations 
    : (config as any).elements || [];

  const handleDestinationsChange = (destinations: any[]) => {
    onChange({
      ...module,
      config: {
        ...config,
        destinations,
        // Удаляем старое поле elements для миграции
        elements: undefined
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Настройте направления для вывода данных агента
        </div>
        {onTest && (
          <Button
            onClick={onTest}
            disabled={isTestingModule}
            size="sm"
            variant="outline"
          >
            <Play className="h-4 w-4 mr-2" />
            {isTestingModule ? 'Тестирование...' : 'Протестировать'}
          </Button>
        )}
      </div>

      <AgentDestinationsEditor
        elements={currentDestinations}
        onChange={handleDestinationsChange}
      />

      {moduleTestOutput && (
        <div className="mt-4 p-3 bg-muted rounded-md">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Результат тестирования:
          </div>
          <pre className="text-xs text-foreground whitespace-pre-wrap">
            {moduleTestOutput}
          </pre>
        </div>
      )}
    </div>
  );
};
