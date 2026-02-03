import { ModulePreviewProps } from '../base/IModuleDefinition';
import { DestinationsConfig } from './DestinationsModule';
import { Database, Component } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const DestinationsPreview = ({ module }: ModulePreviewProps) => {
  const config = module.config as DestinationsConfig;
  // Обратная совместимость: читаем из elements если destinations пустой
  const destinations = config.destinations?.length > 0 
    ? config.destinations 
    : (config as any).elements || [];

  if (destinations.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Направления не настроены
      </div>
    );
  }

  const dbDestinations = destinations.filter(d => d.targetType === 'database');
  const uiDestinations = destinations.filter(d => d.targetType === 'ui_component');

  return (
    <div className="space-y-2">
      {dbDestinations.length > 0 && (
        <div className="flex items-center gap-2">
          <Database className="h-3 w-3 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {dbDestinations.map((dest) => (
              <Badge 
                key={dest.id} 
                variant="secondary"
                className="text-xs"
              >
                {dest.label || dest.type}
                {dest.targetTable && dest.targetColumn && (
                  <span className="ml-1 text-muted-foreground">
                    ({dest.targetTable}.{dest.targetColumn})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {uiDestinations.length > 0 && (
        <div className="flex items-center gap-2">
          <Component className="h-3 w-3 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {uiDestinations.map((dest) => (
              <Badge 
                key={dest.id} 
                variant="outline"
                className="text-xs"
              >
                {dest.label || dest.type}
                {dest.componentName && dest.eventType && (
                  <span className="ml-1 text-muted-foreground">
                    ({dest.componentName}:{dest.eventType})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
