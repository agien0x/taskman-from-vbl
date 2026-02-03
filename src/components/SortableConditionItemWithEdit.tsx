import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreVertical } from "lucide-react";
import { TriggerCondition, InputElement } from "@/types/agent";
import { TriggerConditionItem } from "@/components/TriggerConditionItem";
import { UniversalElementMenu } from "@/components/UniversalElementMenu";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SortableConditionItemWithEditProps {
  id: string;
  condition: TriggerCondition;
  conditionIndex: number;
  onUpdate: (updates: Partial<TriggerCondition>) => void;
  onRemove: () => void;
  onRemoveFromLogic: () => void;
  isDraggable: boolean;
  availableInputs?: InputElement[];
}

export const SortableConditionItemWithEdit = ({
  id,
  condition,
  conditionIndex,
  onUpdate,
  onRemove,
  onRemoveFromLogic,
  isDraggable,
  availableInputs = [],
}: SortableConditionItemWithEditProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleChangeType = () => {
    if (condition.type === 'trigger') {
      onUpdate({ ...condition, type: 'filter', operator: 'is_not_empty', triggerType: undefined });
    } else {
      onUpdate({ ...condition, type: 'trigger', triggerType: 'on_update', operator: undefined, value: undefined });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-0.5 bg-card border border-primary/20 rounded p-0.5 shadow-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isDraggable && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-accent rounded"
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
      
      <div className="flex items-center justify-center text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full font-mono font-bold min-w-[18px]">
        {conditionIndex}
      </div>

      <TriggerConditionItem
        condition={condition}
        onChange={onUpdate}
        onRemove={() => {}}
      />

      <UniversalElementMenu
        currentType={condition.type}
        availableInputs={availableInputs}
        onChangeToTrigger={condition.type === 'filter' ? handleChangeType : undefined}
        onChangeToFilter={condition.type === 'trigger' ? handleChangeType : undefined}
        onChangeToAND={() => {}}
        onChangeToOR={() => {}}
        onChangeToOpenBracket={() => {}}
        onChangeToCloseBracket={() => {}}
        onDelete={onRemove}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-3 w-3" />
        </Button>
      </UniversalElementMenu>
    </div>
  );
};