import { ModuleEditorProps } from '../base/IModuleDefinition';
import { AgentTriggerEditor } from '@/components/AgentTriggerEditor';
import { Button } from '@/components/ui/button';
import { Play, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const TriggerEditor: React.FC<ModuleEditorProps> = ({
  module,
  onChange,
  availableInputs,
  availableModules,
  onTest,
  isTestingModule,
  moduleTestOutput,
}) => {
  const handleConfigChange = (config: any) => {
    onChange({
      ...module,
      config,
    });
  };
  
  return (
    <div className="space-y-4">
      <AgentTriggerEditor
        triggerConfig={module.config}
        onChange={handleConfigChange}
        availableInputs={availableInputs}
        availableModules={availableModules}
      />
      
      {onTest && (
        <div className="pt-4 border-t">
          <Button 
            onClick={onTest} 
            disabled={isTestingModule}
            className="w-full"
            variant="outline"
          >
            {isTestingModule ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Проверка триггеров...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Проверить условия триггера
              </>
            )}
          </Button>
          
          {moduleTestOutput && (
            <Alert className="mt-3">
              <AlertDescription className="whitespace-pre-wrap text-sm">
                {moduleTestOutput}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
      
      <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
        <strong>Output:</strong> Статус срабатывания триггера (true/false) + контекст
      </div>
    </div>
  );
};
