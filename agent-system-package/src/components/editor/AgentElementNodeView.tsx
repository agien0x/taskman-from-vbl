import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Badge } from '../ui/badge';
import { ArrowRight, GripVertical } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { InputBadgeWithPopover } from '../InputBadgeWithPopover';
import { InputElement } from '../../types/agent';
import { useAgentInputs } from '../../contexts/AgentInputsContext';

export const AgentElementNodeView = ({ node, updateAttributes }: NodeViewProps) => {
  const { label, type, agentName, elementId, value } = node.attrs;
  const isDestination = node.type.name === 'agentDestination';
  const { availableInputs, getInputGroups } = useAgentInputs();
  
  // Создаем availableInputs из INPUT_GROUPS с динамическими инпутами
  const allAvailableInputs: InputElement[] = getInputGroups().flatMap(group =>
    group.inputs.map(input => ({
      id: `type_${input.value}`,
      type: input.value,
      label: input.label,
    }))
  );

  // Добавляем JSON инпуты из контекста
  const jsonInputs = availableInputs.filter(inp => inp.id.startsWith('json_'));
  const finalAvailableInputs = [...allAvailableInputs, ...jsonInputs];

  // Для destination - оставляем старый статичный Badge
  if (isDestination) {
    const displayValue = value || label;
    const truncatedValue = displayValue.length > 30 
      ? displayValue.substring(0, 30) + '...' 
      : displayValue;

    const handleDragStart = (e: React.DragEvent) => {
      const htmlContent = `<agent-destination elementid="${elementId}" label="${label}" type="${type}"${agentName ? ` agentname="${agentName}"` : ''} value="${displayValue}"></agent-destination>`;
      e.dataTransfer.setData('text/html', htmlContent);
      e.dataTransfer.setData('text/plain', label);
      e.dataTransfer.effectAllowed = 'copy';
    };

    return (
      <NodeViewWrapper 
        as="span" 
        className="inline-block"
        draggable="true"
        onDragStart={handleDragStart}
        contentEditable={false}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Badge 
                  variant="outline" 
                  className="gap-1 mx-0.5 cursor-move select-none bg-primary/10 hover:bg-primary/20 border-primary/30"
                >
                  <GripVertical className="h-3 w-3 text-muted-foreground/80 pulse" />
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-medium text-sm">{truncatedValue}</span>
                  {agentName && (
                    <span className="text-xs text-muted-foreground">({agentName})</span>
                  )}
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-md">
              <div>
                <div className="font-semibold mb-1">{label}</div>
                <div className="text-sm">Переменная: <code className="bg-muted px-1 py-0.5 rounded">{displayValue}</code></div>
                <div className="text-xs text-muted-foreground mt-1">
                  Тип: {type}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </NodeViewWrapper>
    );
  }

  // Для input - используем InputBadgeWithPopover
  const handleChange = (newInputId: string) => {
    // Находим инпут по его ID
    const newInput = finalAvailableInputs.find(inp => inp.id === newInputId);
    if (newInput) {
      updateAttributes({
        elementId: newInputId,
        label: newInput.label,
        type: newInput.type,
        value: newInput.type,
      });
    }
  };

  return (
    <NodeViewWrapper 
      as="span" 
      className="inline-block"
      contentEditable={false}
      data-drag-handle
      suppressContentEditableWarning
    >
      <InputBadgeWithPopover
        value={elementId || `type_${type}`}
        onChange={handleChange}
        availableInputs={finalAvailableInputs}
        placeholder="Выбрать инпут"
      />
    </NodeViewWrapper>
  );
};
