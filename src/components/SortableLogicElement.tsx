import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SortableLogicElementProps {
  id: string;
  type: 'operator' | 'bracket';
  value: string;
  onRemove: () => void;
  onToggle?: () => void;
  error?: string;
}

export const SortableLogicElement = ({
  id,
  type,
  value,
  onRemove,
  onToggle,
  error,
}: SortableLogicElementProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const element = (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 rounded ${
        error ? 'ring-2 ring-destructive bg-destructive/10' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>

      {type === 'operator' && (
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className={`h-7 px-3 text-xs font-bold cursor-pointer hover:bg-accent ${
            error ? 'border-destructive text-destructive' : ''
          }`}
        >
          {value}
        </Button>
      )}

      {type === 'bracket' && (
        <div
          className={`flex items-center justify-center h-7 w-7 text-lg font-bold ${
            error ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {value}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-5 w-5 p-0 hover:bg-destructive/20 hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {element}
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-destructive text-destructive-foreground">
            <p className="text-xs">â ï¸ {error}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return element;
};
