import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { TriggerCondition } from "@/types/agent";
import { TriggerConditionItem } from "@/components/TriggerConditionItem";
import { Button } from "@/components/ui/button";

interface SortableConditionItemProps {
  id: string;
  condition: TriggerCondition;
  conditionIndex: number;
  onUpdate: (updates: Partial<TriggerCondition>) => void;
  onRemove: () => void;
  onRemoveFromLogic: () => void;
  isDraggable: boolean;
}

export const SortableConditionItem = ({
  id,
  condition,
  conditionIndex,
  onUpdate,
  onRemove,
  onRemoveFromLogic,
  isDraggable,
}: SortableConditionItemProps) => {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-0.5 bg-card border border-primary/20 rounded p-0.5 shadow-sm"
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
        onRemove={onRemove}
      />
    </div>
  );
};
