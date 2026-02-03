import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useState } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { AgentDestinationElement } from './editor/AgentElementExtension';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { InputSelector, InputGroup } from './InputSelector';
import { supabase } from '@/integrations/supabase/client';
import { DestinationElement, INPUT_GROUPS, RouterRule, InputElement, AgentModule } from '@/types/agent';
import { cn } from '@/lib/utils';
import './editor/editor-styles.css';
import { RouterRulesEditor } from './RouterRulesEditor';

interface AgentRouterRichEditorProps {
  content: string;
  onChange: (content: string) => void;
  destinations: DestinationElement[];
  rules?: RouterRule[];
  onRulesChange?: (rules: RouterRule[]) => void;
  availableInputs?: InputElement[];
  modules?: AgentModule[];
}

export const AgentRouterRichEditor = ({ 
  content, 
  onChange, 
  destinations,
  rules = [],
  onRulesChange,
  availableInputs = [],
  modules = []
}: AgentRouterRichEditorProps) => {
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [selectedAgentDestination, setSelectedAgentDestination] = useState<string>('');
  const [availableAgentDestinations, setAvailableAgentDestinations] = useState<Array<{ 
    id: string; 
    label: string; 
    type: string;
    agentId: string;
    agentName: string;
  }>>([]);
  
  // Извлекаем JSON переменные из модуля json_extractor
  const jsonExtractorModule = modules.find(m => m.type === 'json_extractor');
  const jsonVariables = (jsonExtractorModule?.config?.variables || []) as Array<{
    id?: string;
    name: string;
    path: string;
  }>;
  
  // Создаем инпуты из JSON переменных для использования в условиях
  const jsonVariableInputs: InputElement[] = jsonVariables.map((variable, index) => ({
    id: `json_var_${variable.name}`,
    type: 'json_variable',
    label: `JSON: ${variable.name}`,
    order: 1000 + index,
  }));
  
  // Объединяем обычные инпуты и JSON переменные
  const allAvailableInputs: InputElement[] = [
    ...availableInputs,
    ...jsonVariableInputs
  ];
  
  const destinationsAsInputGroups: InputGroup[] = [
    {
      name: 'Текущие направления',
      inputs: destinations.map(d => ({
        value: d.id,
        label: d.label || d.type
      }))
    },
    {
      name: 'Направления других агентов',
      inputs: availableAgentDestinations.map(d => ({
        value: `${d.agentId}:${d.id}`,
        label: `${d.label} (${d.agentName})`
      }))
    }
  ].filter(g => g.inputs.length > 0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: 'Опишите логику роутинга. Например: "Если в ответе есть список задач - отправить в task_title, если краткий текст - в task_pitch, иначе - в task_content"',
      }),
      AgentDestinationElement,
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
    const fetchAgentDestinations = async () => {
      const { data: agents } = await supabase
        .from('agents')
        .select('id, name, outputs')
        .not('outputs', 'is', null);

      const dests: Array<{ id: string; label: string; type: string; agentId: string; agentName: string }> = [];
      
      agents?.forEach(agent => {
        if (Array.isArray(agent.outputs)) {
          agent.outputs.forEach((output: any) => {
            if (output.type !== 'text') {
              dests.push({
                id: output.id,
                label: output.label || output.type,
                type: output.type,
                agentId: agent.id,
                agentName: agent.name,
              });
            }
          });
        }
      });

      setAvailableAgentDestinations(dests);
    };

    fetchAgentDestinations();
  }, []);

  const insertDestination = (destId: string) => {
    if (!editor) return;

    // Проверяем, это направление из текущего агента или другого
    if (destId.includes(':')) {
      insertAgentDestination(destId);
      return;
    }

    const destination = destinations.find(d => d.id === destId);
    if (!destination) return;

    editor.chain().focus().insertContent({
      type: 'agentDestination',
      attrs: {
        elementId: destination.id,
        label: destination.label || destination.type,
        type: destination.type,
      },
    }).run();
  };

  const insertDestinationGroup = (inputs: Array<{value: string; label: string}>) => {
    inputs.forEach(input => insertDestination(input.value));
  };

  const insertAgentDestination = (destKey: string) => {
    if (!editor) return;

    const dest = availableAgentDestinations.find(d => `${d.agentId}:${d.id}` === destKey);
    if (!dest) return;

    editor.chain().focus().insertContent({
      type: 'agentDestination',
      attrs: {
        elementId: dest.id,
        label: dest.label,
        type: dest.type,
        agentId: dest.agentId,
        agentName: dest.agentName,
      },
    }).run();

    setSelectedAgentDestination('');
  };

  const addRule = () => {
    const newRule: RouterRule = {
      id: `rule_${Date.now()}`,
      destinationId: destinations[0]?.id || '',
      conditions: [],
      conditionLogic: '',
    };
    onRulesChange?.([...rules, newRule]);
  };

  const updateRule = (ruleId: string, updates: Partial<RouterRule>) => {
    onRulesChange?.(rules.map(r => r.id === ruleId ? { ...r, ...updates } : r));
  };

  const removeRule = (ruleId: string) => {
    onRulesChange?.(rules.filter(r => r.id !== ruleId));
  };


  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-6">
      <RouterRulesEditor
        rules={rules}
        onChange={onRulesChange || (() => {})}
        jsonVariables={jsonVariables}
        destinations={destinations}
        availableInputs={allAvailableInputs}
      />

      {jsonVariables.length > 0 && (
        <div className="text-[10px] text-muted-foreground p-2 bg-accent/20 rounded border border-accent/30 mt-4">
          <div className="font-semibold mb-1.5 text-accent-foreground">💡 Доступные JSON переменные:</div>
          <div className="space-y-0.5">
            {jsonVariables.map(v => (
              <div key={v.name} className="ml-2 font-mono">
                • <span className="text-primary">{v.name}</span>
                <span className="text-muted-foreground ml-1">({v.path})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
