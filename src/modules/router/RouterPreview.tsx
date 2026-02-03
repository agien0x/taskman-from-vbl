import { ModulePreviewProps } from '../base/IModuleDefinition';
import { RouterConfig } from './RouterModule';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Database, Zap, Target } from 'lucide-react';

export const RouterPreview = ({ module }: ModulePreviewProps) => {
  const config = module.config as RouterConfig;
  
  // Подсчитываем правила, включая старый формат
  const rulesCount = config.rules?.length || 0;

  const strategyLabels = {
    'all_destinations': 'Все направления',
    'based_on_input': 'По входным данным',
    'based_on_llm': 'LLM решение'
  };

  const strategyIcons = {
    'all_destinations': Target,
    'based_on_input': Database,
    'based_on_llm': Zap
  };

  const StrategyIcon = strategyIcons[config.strategy] || GitBranch;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <StrategyIcon className="h-3 w-3 text-muted-foreground" />
        <Badge variant="outline" className="text-xs">
          {strategyLabels[config.strategy] || config.strategy}
        </Badge>
      </div>

      {(config.strategy === 'based_on_input' || config.strategy === 'based_on_llm') && (
        <div className="text-xs text-muted-foreground">
          {rulesCount > 0 ? (
            <span>
              {rulesCount} {rulesCount === 1 ? 'правило' : 'правил'} роутинга
            </span>
          ) : (
            <span className="text-destructive">Нет правил роутинга</span>
          )}
        </div>
      )}

      {config.strategy === 'based_on_llm' && config.content && config.content !== '<p></p>' && (
        <div className="text-xs text-muted-foreground">
          Описание логики настроено
        </div>
      )}
    </div>
  );
};
