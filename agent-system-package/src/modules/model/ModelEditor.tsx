import { ModuleEditorProps } from '../base/IModuleDefinition';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { AVAILABLE_MODELS } from '../../types/agent';
import { ModuleInputSelector } from '../../components/ModuleInputSelector';
import { Label } from '../../components/ui/label';
import { Separator } from '../../components/ui/separator';
import { Button } from '../../components/ui/button';
import { Play, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';

export const ModelEditor: React.FC<ModuleEditorProps> = ({
  module,
  onChange,
  availableInputs,
  onTest,
  isTestingModule,
  moduleTestOutput,
  agentId,
  onSaveModule,
}) => {
  const handleChange = (field: string, value: any) => {
    onChange({
      ...module,
      config: { ...module.config, [field]: value },
    });
  };
  
  return (
    <div className="space-y-3">
      <ModuleInputSelector
        label="Входные данные для модели"
        value={module.config.sourceInputId}
        onChange={(id) => handleChange('sourceInputId', id)}
        availableInputs={availableInputs}
        placeholder="Выберите входные данные"
        description="Что будет обрабатывать модель"
      />
      
      <Separator />
      
      <div>
        <Label>Выберите модель LLM</Label>
        <Select
          value={module.config.model}
          onValueChange={(value) => handleChange('model', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите модель" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {onTest && (
        <div className="pt-4">
          <Button 
            onClick={onTest} 
            disabled={isTestingModule}
            className="w-full"
          >
            {isTestingModule ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Тестирование...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Тестировать модуль
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
        <strong>Output:</strong> Ответ LLM (текст или JSON)
      </div>
    </div>
  );
};
