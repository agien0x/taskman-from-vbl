import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, Trash2, GripVertical, X } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "./ui/hover-card";
import { Task } from "@/types/kanban";
import { TaskDialog } from "./TaskDialog";
import { supabase } from "@/integrations/supabase/client";
import { getCleanTitle } from "@/lib/utils";
import { TaskCardBody } from "./TaskCardBody";

interface Column {
  id: string;
  title: string;
  color?: string;
}

interface TaskBadgeProps {
  taskId: string;
  title: string;
  content?: string;
  columnId?: string;
  showMenu?: boolean;
  showDragHandle?: boolean;
  sortableId?: string;
  onStatusChange?: (taskId: string, newColumnId: string) => void;
  onDelete?: (taskId: string) => void;
  onDrillDown?: (task: Task) => void;
  onRemoveRelation?: () => void;
  disableDialogOpen?: boolean;
  availableColumns?: Column[];
}

const defaultColumns: Column[] = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "done", title: "Done" },
];

const TaskBadge = ({ 
  taskId, 
  title, 
  content,
  columnId = "todo",
  showMenu = false,
  showDragHandle = false,
  sortableId,
  onStatusChange,
  onDelete,
  onDrillDown,
  onRemoveRelation,
  disableDialogOpen = false,
  availableColumns
}: TaskBadgeProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const [hoverData, setHoverData] = useState<{
    subtasks: Task[];
    assignments: Array<{ id: string; task_id: string; user_id: string; role: 'owner' | 'contributor'; created_at: string }>;
    score: number | null;
  } | null>(null);

  // Create task object from props - no DB query needed
  const fullTask: Task = {
    id: taskId,
    title,
    content: content || "",
    columnId,
    subtaskOrder: 0,
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId || taskId,
    data: {
      type: "subtask",
      task: fullTask,
    },
    disabled: !showDragHandle,
  });

  const style = showDragHandle ? {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const columns = (availableColumns && availableColumns.length > 0) ? availableColumns : defaultColumns;

  const getStatusColor = (status: string) => {
    const column = columns.find(col => col.id === status);
    if (!column) return "bg-gray-500/20 border-gray-500 text-gray-700 dark:text-gray-400";
    
    if (column.color) {
      return `border-2`;
    }
    
    const columnIndex = columns.findIndex(col => col.id === status);
    const colors = [
      "bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-400",
      "bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-400", 
      "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400",
    ];
    
    return colors[columnIndex % colors.length];
  };

  const truncateText = (text: string, maxLength: number = 12) => {
    const cleanText = getCleanTitle(text, text);
    return cleanText.length > maxLength ? `${cleanText.slice(0, maxLength)}..` : cleanText;
  };

  const handleUpdate = (id: string, updates: Partial<Task>) => {
    // TaskDialog handles the update
  };

  const currentColumn = columns.find(col => col.id === columnId);
  const customBorderStyle = currentColumn?.color ? {
    borderColor: currentColumn.color,
    backgroundColor: `${currentColumn.color}20`,
  } : {};

  // Load data when hover opens
  useEffect(() => {
    if (isHoverOpen && !hoverData) {
      loadTaskData();
    }
  }, [isHoverOpen]);

  const loadTaskData = async () => {
    try {
      const [subtasksRes, assignmentsRes, scoreRes] = await Promise.all([
        // Load subtasks
        supabase
          .from("task_relations")
          .select("child_id")
          .eq("parent_id", taskId)
          .then(async ({ data }) => {
            if (!data || data.length === 0) return [];
            const childIds = data.map(r => r.child_id);
            const { data: tasksData } = await supabase
              .from("tasks")
              .select("*")
              .in("id", childIds);
            return (tasksData || []).map(t => ({
              id: t.id,
              title: t.title,
              content: t.content,
              columnId: t.column_id,
              subtaskOrder: t.subtask_order ?? 0,
              priority: t.priority,
              end_date: t.end_date,
              created_at: t.created_at,
              updated_at: t.updated_at,
              custom_columns: t.custom_columns as Array<{ id: string; title: string; color?: string }> | undefined,
            })) as Task[];
          }),
        // Load assignments
        supabase
          .from("task_assignments")
          .select("id, task_id, user_id, role, created_at")
          .eq("task_id", taskId),
        // Load score
        supabase
          .from("task_scores")
          .select("score")
          .eq("task_id", taskId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      setHoverData({
        subtasks: subtasksRes,
        assignments: (assignmentsRes.data || []).map(a => ({
          ...a,
          role: a.role as 'owner' | 'contributor'
        })),
        score: scoreRes.data?.score ?? null
      });
    } catch (error) {
      console.error("Error loading task data for hover:", error);
    }
  };

  // If dragging, disable HoverCard
  if (isDragging) {
    return (
      <span
        ref={showDragHandle ? setNodeRef : undefined}
        style={{ ...style, ...customBorderStyle }}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border-2 ${!currentColumn?.color ? getStatusColor(columnId) : ''} text-[10px] font-medium whitespace-nowrap flex-shrink-0 opacity-50`}
      >
        {showDragHandle && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-3 w-3" />
          </div>
        )}
        <span className="whitespace-nowrap">{truncateText(title)}</span>
      </span>
    );
  }

  return (
    <>
      <HoverCard openDelay={200} closeDelay={100} open={isHoverOpen} onOpenChange={setIsHoverOpen}>
        <HoverCardTrigger asChild>
          <span
            ref={showDragHandle ? setNodeRef : undefined}
            style={{ ...style, ...customBorderStyle }}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border-2 ${!currentColumn?.color ? getStatusColor(columnId) : ''} text-[10px] font-medium group whitespace-nowrap flex-shrink-0 cursor-pointer`}
          >
            {showDragHandle && (
              <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-3 w-3" />
              </div>
            )}
            <span 
              className={`whitespace-nowrap ${disableDialogOpen ? "cursor-default" : "hover:underline"}`}
              onClick={disableDialogOpen ? undefined : () => setIsDialogOpen(true)}
            >
              {truncateText(title)}
            </span>

            {onRemoveRelation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveRelation();
                }}
                className="h-4 w-4 p-0 hover:bg-destructive/20 ml-0.5 opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </Button>
            )}

            {showMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="h-2 w-2 rounded-full bg-current" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Открыть
                  </DropdownMenuItem>
                  {onStatusChange && columns.map((column) => (
                    <DropdownMenuItem 
                      key={column.id}
                      onClick={() => onStatusChange(taskId, column.id)}
                    >
                      {column.title}
                    </DropdownMenuItem>
                  ))}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(taskId)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Удалить
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </span>
        </HoverCardTrigger>
        <HoverCardContent 
          className="w-80 p-0" 
          side="bottom" 
          align="start"
          sideOffset={8}
        >
          <TaskCardBody
            task={{
              ...fullTask,
              subtasks: hoverData?.subtasks,
            }}
            variant="preview"
            assignments={hoverData?.assignments}
            score={hoverData?.score}
            subtasks={hoverData?.subtasks}
            availableColumns={columns}
            onStatusChange={onStatusChange}
            onDrillDown={onDrillDown}
            onOpenDialog={() => setIsDialogOpen(true)}
            onRemoveRelation={onRemoveRelation}
          />
        </HoverCardContent>
      </HoverCard>

      <TaskDialog
        task={fullTask}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onUpdate={handleUpdate}
        onDrillDown={onDrillDown}
      />
    </>
  );
};

export default TaskBadge;
