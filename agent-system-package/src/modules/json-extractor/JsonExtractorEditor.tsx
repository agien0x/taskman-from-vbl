import { ModuleEditorProps } from '../base/IModuleDefinition';
import { JsonExtractorConfig } from './JsonExtractorModule';
import { JsonExtractorEditor as JsonExtractorEditorComponent } from '../../components/JsonExtractorEditor';
import { Button } from '../../components/ui/button';
import { Play } from 'lucide-react';
import { Label } from '../../components/ui/label';
import { InputBadgeWithPopover } from '../../components/InputBadgeWithPopover';

export const JsonExtractorEditor = ({ 
  module, 
  onChange,
  availableInputs = [],
  onTest,
  isTestingModule,
  moduleTestOutput,
  agentId,
  onSaveModule,
  supabaseClient,
  toast
}: ModuleEditorProps) => {
  const config = module.config as JsonExtractorConfig;

  const handleVariablesChange = (variables: any[]) => {
    onChange({
      ...module,
      config: {
        ...config,
        variables
      }
    });
  };

  const handleSourceChange = (sourceInputId: string) => {
    onChange({
      ...module,
      config: {
        ...config,
        sourceInputId
      }
    });
  };

  const handleSourceSelect = (inputId: string) => {
    handleSourceChange(inputId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Настройте извлечение данных из JSON с помощью JSONPath
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

      <div className="space-y-2">
        <Label>Источник JSON данных</Label>
        <InputBadgeWithPopover
          availableInputs={availableInputs}
          value={config.sourceInputId || ''}
          onChange={handleSourceSelect}
          placeholder="Выберите источник (по умолчанию - вывод модели)"
        />
        <p className="text-xs text-muted-foreground">
          Если не указан, будет использован вывод предыдущего модуля (обычно модель)
        </p>
      </div>

      <JsonExtractorEditorComponent
        variables={config.variables || []}
        onChange={handleVariablesChange}
        sourceInputId={config.sourceInputId}
        onSourceChange={handleSourceChange}
        availableInputs={availableInputs}
        supabaseClient={supabaseClient}
        toast={toast}
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

      <div className="p-3 bg-accent/20 rounded-md border border-accent/30">
        <div className="text-xs font-semibold text-accent-foreground mb-2">
          💡 Примеры JSONPath:
        </div>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li><code className="text-primary">$.user.name</code> - получить user.name</li>
          <li><code className="text-primary">$.items[0].price</code> - первый элемент массива items</li>
          <li><code className="text-primary">$.data.*.id</code> - все id в объекте data</li>
          <li><code className="text-primary">$..email</code> - все поля email на любом уровне</li>
        </ul>
      </div>
    </div>
  );
};
