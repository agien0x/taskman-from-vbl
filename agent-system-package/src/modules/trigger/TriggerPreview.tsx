import { ModulePreviewProps } from '../base/IModuleDefinition';

export const TriggerPreview: React.FC<ModulePreviewProps> = ({ module }) => {
  const enabled = module.config.enabled;
  const strategy = module.config.strategy;
  const triggersCount = module.config.inputTriggers?.length || 0;
  
  return (
    <div className="text-sm space-y-1">
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded ${enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
          {enabled ? 'Включен' : 'Выключен'}
        </span>
      </div>
      
      <div className="text-xs text-muted-foreground">
        {triggersCount} {triggersCount === 1 ? 'триггер' : 'триггера'} • {strategy === 'all_match' ? 'Все' : 'Любое'}
      </div>
    </div>
  );
};
