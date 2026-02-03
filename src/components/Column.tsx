import { useState, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DraggableTaskCard from "./DraggableTaskCard";
import { Button } from "./ui/button";
import { Plus, X, ChevronRight, ChevronLeft, GripVertical } from "lucide-react";
import { Column as ColumnType, Task } from "@/types/kanban";
import { TaskCreationSearch } from "./TaskCreationSearch";
import { TaskTooltip } from "./TaskTooltip";
import { SortOption, SortDirection } from "./BoardFilters";
import { motion, AnimatePresence } from "framer-motion";

import { TaskAssignmentData, TaskMultiParentData } from "@/hooks/useBoardTasksData";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface ColumnProps {
  column: ColumnType;
  onAddTask: (columnId: string, content: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (taskId: string, newTitle: string) => void;
  /** Локальное обновление задачи после сохранения в диалоге */
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onSubtaskStatusChange: (taskId: string, newColumnId: string) => void;
  onSubtaskDelete: (taskId: string) => void;
  onSubtaskOpen: (taskId: string) => void;
  onDrillDown?: (task: Task) => void;
  onToggleCollapse?: (columnId: string) => void;
  availableColumns: Array<{ id: string; title: string; color?: string }>;
  sortBy: SortOption;
  sortDirection: SortDirection;
  filterByOwner: string | null;
  searchQuery: string;
  hideCompleted: boolean;
  openDialogTaskId?: string | null;
  onOpenDialog?: (taskId: string | null) => void;
  currentBoardRootId?: string;
  // Пакетные данные
  assignmentsByTask?: Map<string, TaskAssignmentData[]>;
  multiParentData?: Map<string, TaskMultiParentData>;
  scoresByTask?: Map<string, number>;
  // Активная перетаскиваемая задача
  activeTaskId?: string | null;
}

const Column = ({ column, onAddTask, onDeleteTask, onEditTask, onUpdateTask, onSubtaskStatusChange, onSubtaskDelete, onSubtaskOpen, onDrillDown, onToggleCollapse, availableColumns, sortBy, sortDirection, filterByOwner, searchQuery, hideCompleted, openDialogTaskId, onOpenDialog, currentBoardRootId, assignmentsByTask, multiParentData, scoresByTask, activeTaskId }: ColumnProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const { userId: currentUserId } = useCurrentUser();
  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: "column",
    },
  });

  const { setNodeRef: setDroppableNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: "column",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTaskCreated = (taskId: string, content: string) => {
    onAddTask(column.id, content);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
  };

  const getFilteredAndSortedTasks = () => {
    let tasks = column.tasks;

    // Apply completed/archived filter
    if (hideCompleted) {
      const columnTitle = column.title.toLowerCase();
      const isCompletedColumn = columnTitle === 'done' || columnTitle.includes('архив') || columnTitle.includes('archive');
      if (isCompletedColumn) {
        return []; // Hide entire column content
      }
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(query) ||
        task.content.toLowerCase().includes(query)
      );
    }

    // Apply owner filter
    if (filterByOwner) {
      tasks = tasks.filter(task => task.owner_id === filterByOwner);
    }

    // Apply sorting
    if (!sortBy) return tasks;

    return [...tasks].sort((a, b) => {
      let result = 0;
      
      switch (sortBy) {
        case "owner_first": {
          // First, sort by ownership (current user's tasks first)
          const aIsMine = a.owner_id === currentUserId ? 0 : 1;
          const bIsMine = b.owner_id === currentUserId ? 0 : 1;
          if (aIsMine !== bIsMine) {
            result = aIsMine - bIsMine;
            break;
          }
          // Then by priority
          const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
          const aPri = priorityOrder[a.priority || "none"];
          const bPri = priorityOrder[b.priority || "none"];
          result = aPri - bPri;
          break;
        }
        case "updated_at": {
          const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          result = bTime - aTime;
          break;
        }
        case "priority": {
          const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
          const aPriority = priorityOrder[a.priority || "none"];
          const bPriority = priorityOrder[b.priority || "none"];
          result = aPriority - bPriority;
          break;
        }
        case "end_date": {
          if (!a.end_date && !b.end_date) result = 0;
          else if (!a.end_date) result = 1;
          else if (!b.end_date) result = -1;
          else result = new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
          break;
        }
        case "owner": {
          if (!a.owner_id && !b.owner_id) result = 0;
          else if (!a.owner_id) result = 1;
          else if (!b.owner_id) result = -1;
          else result = a.owner_id.localeCompare(b.owner_id);
          break;
        }
        default:
          result = 0;
      }
      
      // Apply sort direction
      return sortDirection === "asc" ? result : -result;
    });
  };

  const sortedTasks = getFilteredAndSortedTasks();
  const isCollapsed = column.collapsed || false;

  // Function to strip HTML tags and decode HTML entities
  const cleanText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  // Drop indicator at end of column
  const DropEndIndicator = ({ columnId, activeTaskId }: { columnId: string; activeTaskId: string }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `drop-end-${columnId}`,
      data: {
        type: "drop-indicator",
        position: "end",
        columnId,
      },
    });

    return (
      <div ref={setNodeRef} className="min-h-[40px] relative">
        <AnimatePresence>
          {isOver && (
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ scaleX: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="h-1 bg-primary rounded-full my-2 origin-left shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
            />
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div 
      ref={setSortableNodeRef}
      style={style}
      className={`flex flex-col shrink-0 transition-all duration-300 h-fit ${isCollapsed ? 'w-20' : 'w-72'}`}
    >
      <div className="mb-2 px-3 py-2 rounded-lg bg-card border border-border relative group">
        <div 
          {...attributes} 
          {...listeners}
          className="absolute -left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity z-10 bg-muted rounded p-1"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleCollapse?.(column.id)}
          className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-4 p-0 opacity-30 hover:opacity-100 transition-opacity z-10"
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
        
        {isCollapsed ? (
          <div className="flex flex-col items-center">
            <h2 className="font-semibold text-foreground text-xs writing-mode-vertical transform -rotate-180 whitespace-nowrap">
              {column.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-2">{column.tasks.length}</p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">{column.title}</h2>
              <p className="text-sm text-muted-foreground">
                {sortedTasks.length}{sortedTasks.length !== column.tasks.length ? ` из ${column.tasks.length}` : ''}
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div
        ref={setDroppableNodeRef}
        className={`min-h-[200px] p-1.5 rounded-lg bg-secondary/30 transition-all ${isCollapsed ? 'space-y-1' : 'space-y-2'}`}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 w-full px-1">
            {sortedTasks.slice(0, 5).map((task) => {
              const priorityColors = {
                high: 'border-l-destructive',
                medium: 'border-l-warning',
                low: 'border-l-muted-foreground'
              };
              const priorityColor = priorityColors[task.priority || 'medium'];
              
              return (
                <TaskTooltip key={task.id} title={task.title} content={task.content} taskId={task.id}>
                  <div
                    className={`w-full bg-card border-l-4 ${priorityColor} rounded-sm p-1.5 cursor-pointer hover:bg-accent transition-colors group`}
                    onClick={() => onSubtaskOpen?.(task.id)}
                  >
                    <div className="text-[10px] leading-tight text-foreground line-clamp-2 break-words">
                      {cleanText(task.title)}
                    </div>
                    {task.owner_id && (
                      <div className="w-3 h-3 rounded-full bg-primary/20 mt-1" />
                    )}
                  </div>
                </TaskTooltip>
              );
            })}
            {sortedTasks.length > 5 && (
              <div className="text-xs text-muted-foreground mt-1">+{sortedTasks.length - 5}</div>
            )}
          </div>
        ) : (
        <>
            {sortedTasks.map((task, index) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                index={index}
                onDelete={onDeleteTask}
                onEdit={onEditTask}
                onUpdateTask={onUpdateTask}
                onSubtaskStatusChange={onSubtaskStatusChange}
                onSubtaskDelete={onSubtaskDelete}
                onSubtaskOpen={onSubtaskOpen}
                onDrillDown={onDrillDown}
                availableColumns={availableColumns}
                isDialogOpen={openDialogTaskId === task.id}
                onOpenDialog={(isOpen) => onOpenDialog?.(isOpen ? task.id : null)}
                currentBoardRootId={currentBoardRootId}
                batchAssignments={assignmentsByTask?.get(task.id)}
                batchMultiParentData={multiParentData?.get(task.id)}
                batchScore={scoresByTask?.get(task.id)}
                activeTaskId={activeTaskId}
              />
            ))}
            
            {/* Drop indicator at end of column */}
            <AnimatePresence>
              {activeTaskId && !sortedTasks.some(t => t.id === activeTaskId) && (
                <DropEndIndicator columnId={column.id} activeTaskId={activeTaskId} />
              )}
            </AnimatePresence>

            {isAdding ? (
              <TaskCreationSearch
                columnId={column.id}
                parentTaskId={currentBoardRootId}
                onTaskCreated={handleTaskCreated}
                onCancel={handleCancel}
              />
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить задачу
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Column;
