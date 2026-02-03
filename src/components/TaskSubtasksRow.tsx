import { useState } from "react";
import { Button } from "@/components/ui/button";
import TaskBadge from "@/components/TaskBadge";
import { Task } from "@/types/kanban";
import { TaskRelationSearch } from "@/components/TaskRelationSearch";

interface TaskSubtasksRowProps {
  taskId: string;
  subtasks: Task[];
  onDrillDown?: (task: Task) => void;
  onRemoveSubtask: (subtaskId: string) => void;
  onRelationChange: () => void;
  variant?: "default" | "card";
  showDragHandle?: boolean;
  onStatusChange?: (taskId: string, newColumnId: string) => void;
  onDelete?: (taskId: string) => void;
  availableColumns?: Array<{ id: string; title: string; color?: string }>;
}

export const TaskSubtasksRow = ({
  taskId,
  subtasks,
  onDrillDown,
  onRemoveSubtask,
  onRelationChange,
  variant = "default",
  showDragHandle = false,
  onStatusChange,
  onDelete,
  availableColumns,
}: TaskSubtasksRowProps) => {
  const [showAll, setShowAll] = useState(false);
  
  // Sort subtasks by most recently updated first
  const sortedSubtasks = [...subtasks].sort((a, b) => {
    const dateA = new Date(a.updated_at || a.end_date || a.start_date || 0).getTime();
    const dateB = new Date(b.updated_at || b.end_date || b.start_date || 0).getTime();
    return dateB - dateA;
  });
  
  const visibleCount = variant === "card" ? 5 : 10;
  const hasMore = sortedSubtasks.length > visibleCount;
  const displayedSubtasks = showAll ? sortedSubtasks : sortedSubtasks.slice(0, visibleCount);

  if (variant === "card") {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex flex-wrap gap-0.5 items-center overflow-hidden" style={{ maxHeight: showAll ? 'none' : '5rem' }}>
          {displayedSubtasks.map((subtask) => (
            <TaskBadge
              key={subtask.id}
              taskId={subtask.id}
              title={subtask.title}
              content={subtask.content}
              columnId={subtask.columnId}
              showMenu={showDragHandle}
              showDragHandle={showDragHandle}
              sortableId={showDragHandle ? `subtask-${subtask.id}` : undefined}
              onDrillDown={onDrillDown}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              availableColumns={availableColumns}
            />
          ))}
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="h-5 px-1.5 text-[10px] py-0 flex-shrink-0"
            >
              {showAll ? "Скрыть" : `Все +${sortedSubtasks.length - visibleCount}`}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground font-medium whitespace-nowrap flex-shrink-0">Подзадачи:</span>
      <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {displayedSubtasks.map((subtask) => (
          <TaskBadge
            key={subtask.id}
            taskId={subtask.id}
            title={subtask.title}
            content={subtask.content}
            columnId={subtask.columnId}
            showMenu={true}
            onDrillDown={onDrillDown}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onRemoveRelation={() => onRemoveSubtask(subtask.id)}
            availableColumns={availableColumns}
          />
        ))}
      </div>
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="h-6 px-2 text-xs flex-shrink-0"
        >
          {showAll ? "Скрыть" : `Все (${sortedSubtasks.length})`}
        </Button>
      )}
      <TaskRelationSearch
        currentTaskId={taskId}
        relationType="child"
        onRelationChange={onRelationChange}
        onDrillDown={onDrillDown}
      />
    </div>
  );
};
