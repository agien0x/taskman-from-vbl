import { ModuleEditorProps } from '../base/IModuleDefinition';
import { Label } from '../../components/ui/label';
import { UnifiedEditor, UnifiedEditorHandle } from '../../components/editor/UnifiedEditor';
import { InputSelectorButton } from '../../components/InputSelectorButton';
import { Separator } from '../../components/ui/separator';
import { Button } from '../../components/ui/button';
import { Play, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { useRef, useState } from 'react';

export const PromptEditor: React.FC<ModuleEditorProps> = ({
  module,
  onChange,
  availableInputs,
  onTest,
  isTestingModule,
  moduleTestOutput,
  insertInput,
  insertInputGroup,
  agentId,
  onSaveModule,
  supabaseClient,
  toast,
  onImageUpload,
}) => {
  const editorRef = useRef<UnifiedEditorHandle>(null);
  const [testInput, setTestInput] = useState<string>('');
  
  const handleContentChange = (content: string) => {
    onChange({
      ...module,
      config: { ...module.config, content },
    });
  };
  
  const handleInsertInput = (type: string) => {
    if (insertInput) {
      insertInput(type);
    }
  };
  
  const handleInsertInputGroup = (inputs: Array<{ value: string; label: string }>) => {
    if (insertInputGroup) {
      insertInputGroup(inputs);
    }
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Промпт и инпуты</Label>
        <InputSelectorButton
          onSelectInput={handleInsertInput}
          onSelectGroup={handleInsertInputGroup}
          supabaseClient={supabaseClient}
        />
      </div>
      
      <UnifiedEditor
        ref={editorRef}
        content={module.config.content || ''}
        onChange={handleContentChange}
        placeholder="Введите промпт и добавьте инпуты..."
        enableAgentInputs={true}
        onImageUpload={onImageUpload}
        supabaseClient={supabaseClient}
      />
      
      {onTest && (
        <>
          <Separator />
          
          <div className="space-y-3 pt-2">
            <Label className="text-sm">Тестирование промпта</Label>
            <div className="space-y-2">
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Введите тестовые данные для промпта..."
                className="w-full min-h-[80px] p-2 text-sm border rounded-md bg-background"
              />
              <Button 
                onClick={onTest} 
                disabled={isTestingModule}
                className="w-full"
                size="sm"
              >
                {isTestingModule ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Тестирование...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Протестировать промпт
                  </>
                )}
              </Button>
              
              {moduleTestOutput && (
                <Alert>
                  <AlertDescription className="whitespace-pre-wrap text-sm">
                    {moduleTestOutput}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </>
      )}
      
      <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
        <strong>Output:</strong> Промпт с подставленными значениями инпутов
      </div>
    </div>
  );
};
