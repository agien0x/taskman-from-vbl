import { ModuleEditorProps } from '../base/IModuleDefinition';
import { RouterConfig } from './RouterModule';
import { AgentRouterRichEditor } from '../../components/AgentRouterRichEditor';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Play } from 'lucide-react';
import { DestinationElement } from '../../types/agent';

export const RouterEditor = ({ 
  module, 
  onChange,
  availableInputs = [],
  availableModules = [],
  onTest,
  isTestingModule,
  moduleTestOutput,
  agentId,
  onSaveModule,
  supabaseClient,
  toast
}: ModuleEditorProps) => {
  // Обратная совместимость: читаем старый формат router config
  let config = module.config as RouterConfig;
  
  // Если rules содержат старые поля (conditions, conditionLogic, variableMapping),
  // конвертируем их в новый формат
  if (config.rules && config.rules.length > 0) {
    const hasOldFormat = config.rules.some((rule: any) => 
      rule.conditions || rule.conditionLogic || rule.variableMapping
    );
    
    if (hasOldFormat) {
      config = {
        ...config,
        rules: config.rules.map((rule: any) => ({
          id: rule.id,
          sourceVariableId: rule.sourceVariableId,
          destinationId: rule.destinationId,
          // Сохраняем старые поля для обратной совместимости, но не используем
        }))
      };
    }
  }

  // Получаем destinations из модуля destinations (если есть)
  const destinationsModule = availableModules.find(m => m.type === 'destinations');
  // Обратная совместимость: читаем из destinations или elements
  const destinations: DestinationElement[] = 
    destinationsModule?.config?.destinations?.length > 0
      ? destinationsModule.config.destinations
      : (destinationsModule?.config as any)?.elements || [];

  const handleStrategyChange = (strategy: string) => {
    onChange({
      ...module,
      config: {
        ...config,
        strategy: strategy as RouterConfig['strategy']
      }
    });
  };

  const handleContentChange = (content: string) => {
    onChange({
      ...module,
      config: {
        ...config,
        content
      }
    });
  };

  const handleRulesChange = (rules: any[]) => {
    onChange({
      ...module,
      config: {
        ...config,
        rules
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Настройте маршрутизацию данных к направлениям
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
        <Label>Стратегия роутинга</Label>
        <Select value={config.strategy} onValueChange={handleStrategyChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_destinations">
              Все направления
            </SelectItem>
            <SelectItem value="based_on_input">
              На основе входных данных
            </SelectItem>
            <SelectItem value="based_on_llm">
              На основе LLM решения
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {config.strategy === 'all_destinations' && 
            'Данные будут отправлены во все настроенные направления'}
          {config.strategy === 'based_on_input' && 
            'Данные будут отправлены в направления согласно правилам на основе входных данных'}
          {config.strategy === 'based_on_llm' && 
            'LLM определит целевые направления на основе описания логики роутинга'}
        </p>
      </div>

      {destinations.length === 0 && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">
            ⚠️ Нет настроенных направлений. Добавьте модуль "Направления" для настройки целевых направлений.
          </p>
        </div>
      )}

      {(config.strategy === 'based_on_input' || config.strategy === 'based_on_llm') && (
        <AgentRouterRichEditor
          content={config.content || ''}
          onChange={handleContentChange}
          destinations={destinations}
          rules={config.rules || []}
          onRulesChange={handleRulesChange}
          availableInputs={availableInputs}
          modules={availableModules}
          supabaseClient={supabaseClient}
          toast={toast}
        />
      )}

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

      {config.strategy === 'all_destinations' && destinations.length > 0 && (
        <div className="p-3 bg-accent/20 rounded-md border border-accent/30">
          <div className="text-xs font-semibold text-accent-foreground mb-2">
            💡 Данные будут отправлены в следующие направления:
          </div>
          <ul className="text-xs space-y-1 text-muted-foreground">
            {destinations.map((dest, idx) => (
              <li key={dest.id}>
                {idx + 1}. <span className="text-primary">{dest.label || dest.type}</span>
                {dest.targetTable && dest.targetColumn && (
                  <span className="ml-1">({dest.targetTable}.{dest.targetColumn})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
