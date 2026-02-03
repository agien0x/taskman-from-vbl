import { ModulePreviewProps } from '../base/IModuleDefinition';
import { JsonExtractorConfig } from './JsonExtractorModule';
import { Badge } from '../../components/ui/badge';
import { Code2 } from 'lucide-react';

export const JsonExtractorPreview = ({ module }: ModulePreviewProps) => {
  const config = module.config as JsonExtractorConfig;
  const variables = config.variables || [];

  if (variables.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Переменные не настроены
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Code2 className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {variables.length} {variables.length === 1 ? 'переменная' : 'переменных'}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {variables.map((variable) => (
          <Badge 
            key={variable.id} 
            variant="secondary"
            className="text-xs font-mono"
          >
            {variable.name}
            {variable.path && (
              <span className="ml-1 text-muted-foreground opacity-70">
                ({variable.path.length > 20 ? variable.path.substring(0, 20) + '...' : variable.path})
              </span>
            )}
          </Badge>
        ))}
      </div>
      {config.sourceInputId && (
        <div className="text-xs text-muted-foreground">
          Источник: <code className="text-primary">{config.sourceInputId}</code>
        </div>
      )}
    </div>
  );
};
