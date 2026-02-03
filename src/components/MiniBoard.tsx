import { useMemo, useState } from "react";
import { Task } from "@/types/kanban";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical } from "lucide-react";
import { getCleanTitle } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { TaskCardBody } from "./TaskCardBody";

interface Column {
  id: string;
  title: string;
  color?: string;
}

interface MiniBoardProps {
  parentTaskId: string;
  subtasks: Task[];
  columns: Column[];
  onStatusChange?: (taskId: string, newColumnId: string) => void;
  onDelete?: (taskId: string) => void;
  onRemoveRelation?: (taskId: string) => void;
  onDrillDown?: (task: Task) => void;
  maxVisiblePerTab?: number;
  // When true, mini-badges are draggable (for cross-card drag-drop)
  enableCrossCardDrag?: boolean;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: "todo", title: "To Do", color: "#6b7280" },
  { id: "inprogress", title: "In Progress", color: "#f59e0b" },
  { id: "done", title: "Done", color: "#22c55e" },
];

// Draggable badge component with hover card
const DraggableBadge = ({
  task,
  parentTaskId,
  columns,
  onDrillDown,
  onStatusChange,
  onDelete,
  onRemoveRelation,
  isDragActive,
  enableDrag = false,
}: {
  task: Task;
  parentTaskId: string;
  columns: Column[];
  onDrillDown?: (task: Task) => void;
  onStatusChange?: (taskId: string, newColumnId: string) => void;
  onDelete?: (taskId: string) => void;
  onRemoveRelation?: (taskId: string) => void;
  isDragActive: boolean;
  enableDrag?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `mini-${task.id}`,
    data: { type: "mini-badge", task, parentTaskId },
    disabled: !enableDrag,
  });

  const currentColumn = columns.find((col) => col.id === task.columnId);
  const customBorderStyle = currentColumn?.color
    ? {
        borderColor: currentColumn.color,
        backgroundColor: `${currentColumn.color}20`,
      }
    : {};

  const truncateText = (text: string, maxLength: number = 12) => {
    const cleanText = getCleanTitle(text, text);
    return cleanText.length > maxLength
      ? `${cleanText.slice(0, maxLength)}..`
      : cleanText;
  };

  // If dragging is active, disable hover card
  if (isDragActive) {
    return (
      <span
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={customBorderStyle}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border-2 text-[10px] font-medium cursor-grab active:cursor-grabbing transition-all ${
          isDragging ? "opacity-30 scale-95" : "hover:ring-2 hover:ring-primary/50"
        }`}
      >
        <GripVertical className="h-2.5 w-2.5 text-muted-foreground" />
        <span className="whitespace-nowrap">{truncateText(task.title)}</span>
      </span>
    );
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          style={customBorderStyle}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border-2 text-[10px] font-medium cursor-grab active:cursor-grabbing transition-all ${
            isDragging ? "opacity-30 scale-95" : ""
          }`}
        >
          <GripVertical className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="whitespace-nowrap">{truncateText(task.title)}</span>
        </span>
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 p-0" 
        side="top" 
        align="start"
        sideOffset={8}
      >
        <TaskCardBody
          task={task}
          variant="preview"
          availableColumns={columns}
          onStatusChange={onStatusChange}
          onDrillDown={onDrillDown}
          onRemoveRelation={onRemoveRelation ? () => onRemoveRelation(task.id) : undefined}
        />
      </HoverCardContent>
    </HoverCard>
  );
};

// Droppable tab content zone
const DroppableTabZone = ({
  columnId,
  columnColor,
  parentTaskId,
  isActive,
  children,
}: {
  columnId: string;
  columnColor?: string;
  parentTaskId: string;
  isActive: boolean;
  children: React.ReactNode;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `mini-drop-${parentTaskId}-${columnId}`,
    data: { type: "mini-column", columnId, parentTaskId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[28px] rounded-md p-1 transition-all ${
        isOver
          ? "bg-primary/10 ring-2 ring-primary/50 ring-inset"
          : isActive
          ? "bg-muted/30"
          : ""
      }`}
      style={
        isOver && columnColor
          ? { backgroundColor: `${columnColor}15`, borderColor: columnColor }
          : {}
      }
    >
      <AnimatePresence>
        {isOver && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-[9px] text-primary font-medium mb-1 flex items-center gap-1"
          >
            <span>📥</span> Переместить сюда
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
};

export const MiniBoard = ({
  parentTaskId,
  subtasks,
  columns: propColumns,
  onStatusChange,
  onDelete,
  onRemoveRelation,
  onDrillDown,
  maxVisiblePerTab = 5,
  enableCrossCardDrag = false,
}: MiniBoardProps) => {
  const columns = propColumns.length > 0 ? propColumns : DEFAULT_COLUMNS;
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  // Group subtasks by columnId
  const subtasksByColumn = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    columns.forEach((col) => (grouped[col.id] = []));

    subtasks.forEach((task) => {
      const colId = task.columnId || "todo";
      if (grouped[colId]) {
        grouped[colId].push(task);
      } else {
        const firstColId = columns[0]?.id || "todo";
        if (grouped[firstColId]) {
          grouped[firstColId].push(task);
        }
      }
    });

    // Sort by updated_at descending within each column
    Object.keys(grouped).forEach((colId) => {
      grouped[colId].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });
    });

    return grouped;
  }, [subtasks, columns]);

  // Count by column
  const countByColumn = useMemo(() => {
    const counts: Record<string, number> = {};
    columns.forEach((col) => {
      counts[col.id] = subtasksByColumn[col.id]?.length || 0;
    });
    return counts;
  }, [subtasksByColumn, columns]);

  // Find first non-empty column for default tab
  const defaultTab = useMemo(() => {
    for (const col of columns) {
      if (countByColumn[col.id] > 0) {
        return col.id;
      }
    }
    return columns[0]?.id || "todo";
  }, [columns, countByColumn]);

  // Track expanded state per tab
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>({});

  const toggleExpand = (colId: string) => {
    setExpandedTabs((prev) => ({
      ...prev,
      [colId]: !prev[colId],
    }));
  };

  return (
    <Tabs
      value={activeTab}
      defaultValue={defaultTab}
      onValueChange={setActiveTab}
      className="w-full"
    >
      <TabsList className="h-7 p-0.5 gap-0.5 bg-muted/50 w-full justify-start flex-wrap">
        {columns.map((col) => {
          const count = countByColumn[col.id];
          const isEmpty = count === 0;

          return (
            <TabsTrigger
              key={col.id}
              value={col.id}
              className="h-6 px-2 text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1 transition-all"
              style={{
                borderBottomWidth: "2px",
                borderBottomColor: col.color || "transparent",
                borderBottomStyle: "solid",
              }}
            >
              <span className={isEmpty ? "text-muted-foreground/60" : ""}>
                {col.title}
              </span>
              <Badge
                variant={isEmpty ? "outline" : "secondary"}
                className={`h-4 min-w-4 px-1 text-[9px] ${
                  isEmpty ? "opacity-50" : ""
                }`}
              >
                {count}
              </Badge>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {columns.map((col) => {
        const tasksInColumn = subtasksByColumn[col.id] || [];
        const isExpanded = expandedTabs[col.id] || false;
        const visibleTasks = isExpanded
          ? tasksInColumn
          : tasksInColumn.slice(0, maxVisiblePerTab);
        const overflow = tasksInColumn.length - maxVisiblePerTab;

        return (
          <TabsContent key={col.id} value={col.id} className="mt-1.5">
            <DroppableTabZone
              columnId={col.id}
              columnColor={col.color}
              parentTaskId={parentTaskId}
              isActive={false}
            >
              {tasksInColumn.length === 0 ? (
                <div className="text-[10px] text-muted-foreground/60 italic py-1">
                  Нет задач
                </div>
              ) : (
                <div className="flex flex-wrap gap-1 items-center">
                  {visibleTasks.map((task) => (
                    <DraggableBadge
                      key={task.id}
                      task={task}
                      parentTaskId={parentTaskId}
                      columns={columns}
                      onDrillDown={onDrillDown}
                      onStatusChange={onStatusChange}
                      onDelete={onDelete}
                      onRemoveRelation={onRemoveRelation}
                      isDragActive={false}
                      enableDrag={enableCrossCardDrag}
                    />
                  ))}
                  {overflow > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(col.id)}
                      className="h-5 px-1.5 text-[10px] py-0"
                    >
                      {isExpanded ? "Скрыть" : `+${overflow}`}
                    </Button>
                  )}
                </div>
              )}
            </DroppableTabZone>
          </TabsContent>
        );
      })}
    </Tabs>
  );
};