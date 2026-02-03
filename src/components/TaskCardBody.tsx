import { useMemo } from "react";
import { Task } from "@/types/kanban";
import { Button } from "./ui/button";
import { Edit2, Trash2, GripVertical, ExternalLink } from "lucide-react";
import { RichContent } from "./RichContent";
import { MultiParentIndicator } from "./MultiParentIndicator";
import { RootTaskIcon } from "./RootTaskIcon";
import { getCleanTitle } from "@/lib/utils";
import { TaskLinkButton } from "./TaskLinkButton";
import { TaskPrioritySelector } from "./TaskPrioritySelector";
import { TaskAssignees } from "./TaskAssignees";
import { TaskScoreBadge } from "./TaskScoreBadge";
import { MiniBoard } from "./MiniBoard";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Separator } from "./ui/separator";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "./ui/tooltip";

interface Column {
  id: string;
  title: string;
  color?: string;
}

interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  role: 'owner' | 'contributor';
  created_at: string;
}

interface TaskCardBodyProps {
  task: Task;
  variant: 'full' | 'preview';
  
  // Данные
  assignments?: TaskAssignment[];
  score?: number | null;
  subtasks?: Task[];
  availableColumns?: Column[];
  
  // Multi-parent data (для full variant)
  parentCount?: number;
  originalRootId?: string | null;
  originalRootTitle?: string;
  currentBoardRootId?: string;
  
  // Callbacks
  onStatusChange?: (taskId: string, newColumnId: string) => void;
  onDrillDown?: (task: Task) => void;
  onOpenDialog?: () => void;
  onScoreClick?: () => void;
  
  // Только для variant="full"
  onEdit?: (taskId: string, newTitle: string) => void;
  onDelete?: (taskId: string) => void;
  onSubtaskStatusChange?: (taskId: string, newColumnId: string) => void;
  onSubtaskDelete?: (taskId: string) => void;
  
  // Drag-related (только для full)
  dragHandleProps?: {
    attributes: object;
    listeners: object;
  };
  
  // Состояние редактирования (только для full)
  isEditing?: boolean;
  onStartEdit?: () => void;
  
  // Удаление связи (для preview)
  onRemoveRelation?: () => void;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: "todo", title: "To Do", color: "#6b7280" },
  { id: "inprogress", title: "In Progress", color: "#f59e0b" },
  { id: "done", title: "Done", color: "#22c55e" },
];

export const TaskCardBody = ({
  task,
  variant,
  assignments = [],
  score,
  subtasks,
  availableColumns,
  parentCount = 0,
  originalRootId,
  originalRootTitle = "",
  currentBoardRootId,
  onStatusChange,
  onDrillDown,
  onOpenDialog,
  onScoreClick,
  onEdit,
  onDelete,
  onSubtaskStatusChange,
  onSubtaskDelete,
  dragHandleProps,
  isEditing,
  onStartEdit,
  onRemoveRelation,
}: TaskCardBodyProps) => {
  const columns = availableColumns && availableColumns.length > 0 
    ? availableColumns 
    : DEFAULT_COLUMNS;
  
  const sortedSubtasks = useMemo(() => {
    if (!subtasks) return [];
    return [...subtasks].sort((a, b) => (a.subtaskOrder || 0) - (b.subtaskOrder || 0));
  }, [subtasks]);
  
  const truncateTitle = (text: string, maxLength: number = variant === 'preview' ? 50 : 30) => {
    const cleanText = getCleanTitle(text, text);
    if (cleanText.length <= maxLength) return cleanText;
    
    const words = cleanText.split(' ');
    let result = '';
    for (const word of words) {
      if ((result + word).length > maxLength && result.length >= maxLength) break;
      result += (result ? ' ' : '') + word;
    }
    return result + '...';
  };

  const isPreview = variant === 'preview';
  const isFull = variant === 'full';

  return (
    <div className={`${isPreview ? 'p-3' : ''}`}>
      {/* Multi-parent indicator (только для full) */}
      {isFull && !isEditing && parentCount > 1 && originalRootId && (
        <div className="mb-1 flex items-center gap-1">
          <RootTaskIcon
            title={originalRootTitle}
            className="h-5 w-5"
            showLetters={3}
            variant={currentBoardRootId === originalRootId ? "original-root" : "foreign-root"}
          />
          <MultiParentIndicator
            taskId={task.id}
            onNavigateToParent={onDrillDown}
            className="text-muted-foreground"
          />
        </div>
      )}

      {/* Header with title and actions */}
      <div className="flex items-start justify-between gap-2">
        <div 
          className={`flex-1 min-w-0 ${onOpenDialog ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
          onClick={onOpenDialog}
        >
          <div className={`font-medium text-foreground ${isPreview ? 'text-sm leading-tight' : 'text-sm mb-0.5'}`}>
            {truncateTitle(task.title)}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isPreview && (
            <>
              <TaskLinkButton taskId={task.id} size="sm" variant="ghost" showTooltip={false} />
              {onDrillDown && sortedSubtasks.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDrillDown(task);
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </>
          )}
          
          {isFull && !isEditing && (
            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {dragHandleProps && (
                <Button
                  {...(dragHandleProps.attributes as React.ButtonHTMLAttributes<HTMLButtonElement>)}
                  {...(dragHandleProps.listeners as React.ButtonHTMLAttributes<HTMLButtonElement>)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 cursor-grab active:cursor-grabbing"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </Button>
              )}
              <TaskLinkButton taskId={task.id} />
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit?.();
                }}
                className="h-6 w-6 p-0"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(task.id);
                      }}
                      className="h-6 w-6 p-0 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Удалить задачу</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>

      {/* Content preview */}
      {task.content && (
        <div 
          className={`${isPreview ? 'mt-2' : 'mt-0.5'}`}
          onClick={onOpenDialog}
        >
          <RichContent 
            content={task.content}
            className={`text-xs text-muted-foreground ${isPreview ? 'line-clamp-3' : 'line-clamp-2'}`}
          />
        </div>
      )}

      {/* Metadata row */}
      <div 
        className={`flex items-center gap-1.5 ${isPreview ? 'mt-2' : 'mt-1.5'} flex-wrap`}
        onClick={onOpenDialog}
      >
        <TaskScoreBadge
          score={score ?? null}
          size="sm"
          onClick={onScoreClick}
        />
        <TaskPrioritySelector
          priority={task.priority}
          onChange={() => {}}
          compact={true}
        />
        <TaskAssignees assignments={assignments} maxVisible={3} />
        {task.end_date && (
          <span className="text-xs text-muted-foreground">
            до {format(new Date(task.end_date), "dd MMM", { locale: ru })}
          </span>
        )}
      </div>

      {/* MiniBoard for subtasks */}
      {sortedSubtasks.length > 0 && (
        <div className={`${isPreview ? 'mt-3' : 'mt-1.5'} pt-1.5 border-t border-border`}>
          {isFull && (
            <div className="flex items-center justify-between mb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDrillDown) onDrillDown(task);
                }}
                className="h-5 px-2 text-[10px] text-primary hover:text-primary/80 font-medium"
              >
                Открыть доску
              </Button>
              <span className="text-[10px] text-muted-foreground">
                {sortedSubtasks.length} задач
              </span>
            </div>
          )}
          {isPreview && (
            <span className="text-[10px] text-muted-foreground font-medium mb-1 block">
              Подзадачи ({sortedSubtasks.length})
            </span>
          )}
          <MiniBoard
            parentTaskId={task.id}
            subtasks={sortedSubtasks}
            columns={task.custom_columns || columns}
            onStatusChange={isFull ? onSubtaskStatusChange : onStatusChange}
            onDelete={isFull ? onSubtaskDelete : undefined}
            onDrillDown={onDrillDown}
            enableCrossCardDrag={isFull}
            maxVisiblePerTab={isPreview ? 3 : 5}
          />
        </div>
      )}

      {/* Status change buttons (только для preview) */}
      {isPreview && onStatusChange && (
        <>
          <Separator className="my-2" />
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">Сменить этап:</span>
            <div className="flex flex-wrap gap-1">
              {columns.map((col) => {
                const isActive = col.id === task.columnId;
                return (
                  <Button
                    key={col.id}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    style={{
                      borderColor: col.color,
                      ...(isActive && col.color
                        ? { backgroundColor: col.color, color: "white" }
                        : {}),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isActive) {
                        onStatusChange(task.id, col.id);
                      }
                    }}
                    disabled={isActive}
                  >
                    {col.title}
                  </Button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Remove relation / Delete (только для preview) */}
      {isPreview && onRemoveRelation && (
        <div className="flex items-center gap-1 mt-3 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveRelation();
            }}
          >
            Убрать связь
          </Button>
        </div>
      )}
    </div>
  );
};
