import { ModulePreviewProps } from '../base/IModuleDefinition';
import { Badge } from '../../components/ui/badge';

export const PromptPreview: React.FC<ModulePreviewProps> = ({ module }) => {
  const content = module.config?.content || '';
  
  // Удаляем HTML теги для превью
  const plainText = content.replace(/<[^>]*>/g, ' ').trim();
  const preview = plainText.substring(0, 60) + (plainText.length > 60 ? '...' : '');
  
  // Считаем количество agent-input элементов
  const inputMatches = content.match(/<agent-input/g);
  const inputCount = inputMatches ? inputMatches.length : 0;
  
  return (
    <div className="space-y-2">
      {preview && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {preview}
        </p>
      )}
      
      {inputCount > 0 && (
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
            {inputCount} инпут{inputCount === 1 ? '' : inputCount > 1 && inputCount < 5 ? 'а' : 'ов'}
          </Badge>
        </div>
      )}
      
      {!preview && (
        <p className="text-xs text-muted-foreground italic">
          Промпт не заполнен
        </p>
      )}
    </div>
  );
};
