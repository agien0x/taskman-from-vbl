import { ModulePreviewProps } from '../base/IModuleDefinition';
import { Badge } from '../../components/ui/badge';

export const ModelPreview: React.FC<ModulePreviewProps> = ({ module, executionLog }) => {
  return (
    <div className="text-sm space-y-2">
      <Badge variant="outline">{module.config.model || 'Модель не выбрана'}</Badge>
      
      {executionLog?.output && (
        <div className="text-xs text-muted-foreground line-clamp-2">
          {executionLog.output}
        </div>
      )}
    </div>
  );
};
