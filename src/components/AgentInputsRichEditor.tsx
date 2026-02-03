import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useState } from 'react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from './ui/button';
import { AgentInputElement } from './editor/AgentElementExtension';
import { Label } from './ui/label';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { supabase } from '@/integrations/supabase/client';
import { INPUT_TYPES } from '@/types/agent';
import { cn } from '@/lib/utils';
import './editor/editor-styles.css';

interface AgentInputsRichEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const AgentInputsRichEditor = ({ content, onChange }: AgentInputsRichEditorProps) => {
  const [selectedInputType, setSelectedInputType] = useState<string>('');
  const [selectedAgentInput, setSelectedAgentInput] = useState<string>('');
  const [availableAgentInputs, setAvailableAgentInputs] = useState<Array<{ 
    id: string; 
    label: string; 
    type: string;
    agentId: string;
    agentName: string;
  }>>([]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      AgentInputElement,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-3',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    const fetchAgentInputs = async () => {
      const { data: agents } = await supabase
        .from('agents')
        .select('id, name, inputs')
        .not('inputs', 'is', null);

      const inputs: Array<{ id: string; label: string; type: string; agentId: string; agentName: string }> = [];
      
      agents?.forEach(agent => {
        if (Array.isArray(agent.inputs)) {
          agent.inputs.forEach((input: any) => {
            if (input.type !== 'text') {
              inputs.push({
                id: input.id,
                label: input.label || input.type,
                type: input.type,
                agentId: agent.id,
                agentName: agent.name,
              });
            }
          });
        }
      });

      setAvailableAgentInputs(inputs);
    };

    fetchAgentInputs();
  }, []);

  const insertInput = (type: string) => {
    if (!editor) return;

    const inputType = INPUT_TYPES.find(t => t.value === type);
    if (!inputType) return;

    const elementId = `input_${Date.now()}`;
    editor.chain().focus().insertContent({
      type: 'agentInput',
      attrs: {
        elementId,
        label: inputType.label,
        type: type,
      },
    }).run();

    setSelectedInputType('');
  };

  const insertAgentInput = (inputKey: string) => {
    if (!editor) return;

    const input = availableAgentInputs.find(i => `${i.agentId}:${i.id}` === inputKey);
    if (!input) return;

    editor.chain().focus().insertContent({
      type: 'agentInput',
      attrs: {
        elementId: input.id,
        label: input.label,
        type: input.type,
        agentId: input.agentId,
        agentName: input.agentName,
      },
    }).run();

    setSelectedAgentInput('');
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Инпуты</Label>
        <div className="flex gap-2">
          <Select value={selectedInputType} onValueChange={insertInput}>
            <SelectTrigger className="w-[200px] h-8">
              <SelectValue placeholder="Добавить инпут" />
            </SelectTrigger>
            <SelectContent>
              {INPUT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {availableAgentInputs.length > 0 && (
            <Select value={selectedAgentInput} onValueChange={insertAgentInput}>
              <SelectTrigger className="w-[200px] h-8">
                <SelectValue placeholder="Из другого агента" />
              </SelectTrigger>
              <SelectContent>
                {availableAgentInputs.map((input) => (
                  <SelectItem key={`${input.agentId}:${input.id}`} value={`${input.agentId}:${input.id}`}>
                    {input.label} ({input.agentName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className={cn('w-full border border-input rounded-md bg-background')}>
        <EditorContent editor={editor} />
      </div>

      <p className="text-xs text-muted-foreground">
        Добавляйте инпуты из селектора и пишите текст между ними для форматирования промпта
      </p>
    </div>
  );
};
