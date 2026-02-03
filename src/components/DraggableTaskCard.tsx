import { useState, useEffect, useMemo } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Button } from "./ui/button";
import { Trash2, Edit2, Check, X, GripVertical } from "lucide-react";
import { Task } from "@/types/kanban";
import { motion, AnimatePresence } from "framer-motion";

import { TaskDialog } from "./TaskDialog";
import { UnifiedEditor } from "./editor/UnifiedEditor";
import { RichContent } from "./RichContent";
import { supabase } from "@/integrations/supabase/client";
import { MultiParentIndicator } from "./MultiParentIndicator";
import { RootTaskIcon } from "./RootTaskIcon";
import { TaskTooltip } from "./TaskTooltip";
import { getCleanTitle } from "@/lib/utils";
import { TaskLinkButton } from "./TaskLinkButton";
import { TaskPrioritySelector } from "./TaskPrioritySelector";
import { TaskAssignmentData, TaskMultiParentData } from "@/hooks/useBoardTasksData";
import { TaskAssignees } from "./TaskAssignees";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { TaskScoreBadge } from "./TaskScoreBadge";
import { TaskScoreDialog } from "./TaskScoreDialog";
import { MiniBoard } from "./MiniBoard";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "./ui/tooltip";

interface DraggableTaskCardProps {
  task: Task;
  index: number;
  onDelete: (taskId: string) => void;
  onEdit: (taskId: string, newTitle: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onSubtaskStatusChange: (taskId: string, newColumnId: string) => void;
  onSubtaskDelete: (taskId: string) => void;
  onSubtaskOpen: (taskId: string) => void;
  onDrillDown?: (task: Task) => void;
  availableColumns?: Array<{ id: string; title: string; color?: string }>;
  isDialogOpen?: boolean;
  onOpenDialog?: (isOpen: boolean) => void;
  currentBoardRootId?: string;
  batchAssignments?: TaskAssignmentData[];
  batchMultiParentData?: TaskMultiParentData;
  batchScore?: number;
  activeTaskId?: string | null;
}

const DraggableTaskCard = ({ 
  task, 
  index,
  onDelete, 
  onEdit, 
  onUpdateTask, 
  onSubtaskStatusChange, 
  onSubtaskDelete, 
  onSubtaskOpen, 
  onDrillDown, 
  availableColumns, 
  isDialogOpen: externalIsDialogOpen, 
  onOpenDialog, 
  currentBoardRootId, 
  batchAssignments, 
  batchMultiParentData, 
  batchScore,
  activeTaskId
}: DraggableTaskCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(getCleanTitle(task.title, task.title));
  const [internalIsDialogOpen, setInternalIsDialogOpen] = useState(false);
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false);
  const [latestScore, setLatestScore] = useState<number | null>(batchScore ?? null);

  const parentCount = batchMultiParentData?.parentCount ?? 0;
  const originalRootId = batchMultiParentData?.originalRootId ?? null;
  const originalRootTitle = batchMultiParentData?.originalRootTitle ?? "";
  
  const assignments = useMemo(() => {
    if (!batchAssignments) return [];
    return batchAssignments.map(a => ({
      id: a.id,
      task_id: a.task_id,
      user_id: a.user_id,
      role: a.role as 'owner' | 'contributor',
      created_at: '',
    }));
  }, [batchAssignments]);

  const isDialogOpen = externalIsDialogOpen !== undefined ? externalIsDialogOpen : internalIsDialogOpen;

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({ 
    id: task.id,
    data: {
      type: "task",
      task,
      index,
    },
  });

  // Drop zone for inserting BEFORE this card (bigger hit area => easier reorder)
  const { setNodeRef: setDropBeforeZoneRef, isOver: isOverBefore } = useDroppable({
    id: `drop-before-${task.id}`,
    data: {
      type: "drop-indicator",
      position: "before",
      task,
      index,
    },
  });

  // Drop zone for NESTING into this card (only bottom part, so "between" is unambiguous)
  const { setNodeRef: setDropNestZoneRef, isOver: isOverNest } = useDroppable({
    id: `drop-nest-${task.id}`,
    data: {
      type: "task-dropzone",
      task,
      index,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
  } : undefined;

  const handleSave = () => {
    if (editContent.trim()) {
      onEdit(task.id, editContent);
      setIsEditing(false);
    }
  };

  const handleUpdate = (taskId: string, updates: Partial<Task>) => {
    if (onUpdateTask) {
      onUpdateTask(taskId, updates);
      return;
    }
    if (updates.title) {
      onEdit(taskId, updates.title);
    }
  };

  const truncateTitle = (text: string) => {
    const cleanText = getCleanTitle(text, text);
    if (cleanText.length <= 30) return cleanText;
    
    const words = cleanText.split(' ');
    let result = '';
    for (const word of words) {
      if ((result + word).length > 30 && result.length >= 30) break;
      result += (result ? ' ' : '') + word;
    }
    return result + '...';
  };

  const subtasks = task.subtasks || [];
  const sortedSubtasks = [...subtasks].sort((a, b) => (a.subtaskOrder || 0) - (b.subtaskOrder || 0));

  useEffect(() => {
    if (batchScore !== undefined) {
      setLatestScore(batchScore);
    }
  }, [batchScore]);

  const reloadScore = async () => {
    try {
      const { data, error } = await supabase
        .from("task_scores")
        .select("score")
        .eq("task_id", task.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setLatestScore(data.score);
      }
    } catch (error) {
      console.error("Error loading latest score:", error);
    }
  };

  const columnColor = availableColumns?.find(col => col.id === task.columnId)?.color;

  const isBeingDragged = isDragging || activeTaskId === task.id;
  const showBeforeIndicator = isOverBefore && activeTaskId !== task.id;
  const showNestIndicator = isOverNest && activeTaskId !== task.id;

  const dndPointerEvents = activeTaskId && activeTaskId !== task.id ? "auto" : "none";

  return (
    <div className="relative">
      {/* Invisible (but big) drop zone for "insert BEFORE" */}
      <div
        ref={setDropBeforeZoneRef}
        className="absolute -top-2 left-0 right-0 h-6 z-30"
        style={{ pointerEvents: dndPointerEvents }}
      />

      {/* Visual "insert here" line */}
      <AnimatePresence>
        {showBeforeIndicator && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="h-1.5 bg-primary rounded-full my-1 origin-left shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
          />
        )}
      </AnimatePresence>

      <div
        ref={setDragRef}
        style={{
          ...style,
          ...(columnColor && { borderLeftColor: columnColor, borderLeftWidth: '4px' })
        }}
        className={`group p-2 bg-card rounded-lg border transition-all relative ${
          showNestIndicator 
            ? "border-primary border-2 border-dashed bg-primary/5 shadow-lg ring-2 ring-primary/30" 
            : "border-border"
        } ${isBeingDragged ? "opacity-50 shadow-2xl scale-[1.02]" : ""} hover:shadow-md`}
      >
        {/* Nest drop zone only at the bottom (prevents accidental nesting when reordering above) */}
        <div
          ref={setDropNestZoneRef}
          className="absolute inset-x-0 bottom-0 h-[38%] rounded-lg z-20"
          style={{ pointerEvents: dndPointerEvents }}
        />

        {/* Nesting overlay */}
        <AnimatePresence>
          {showNestIndicator && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute inset-0 rounded-lg bg-primary/10 pointer-events-none flex items-end justify-center pb-2 z-20"
            >
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium shadow-lg flex items-center gap-1.5"
              >
                <span className="text-sm">📥</span>
                Вложить как подзадачу
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-1.5">
          <div className="flex-1 min-w-0">
            {!isEditing && parentCount > 1 && originalRootId && (
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
            
            {isEditing ? (
              <div className="space-y-1.5">
                <UnifiedEditor
                  content={editContent}
                  onChange={setEditContent}
                  placeholder="Название задачи"
                  singleLine={true}
                  autoFocus
                  className="text-sm"
                />
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={handleSave} className="h-6 w-6 p-0">
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(getCleanTitle(task.title, task.title));
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <TaskTooltip title={task.title} content={task.content} taskId={task.id}>
                <div 
                  className="cursor-pointer hover:text-primary transition-colors"
                  onClick={() => {
                    if (onOpenDialog) {
                      onOpenDialog(true);
                    } else {
                      setInternalIsDialogOpen(true);
                    }
                  }}
                >
                  <div className="text-sm font-medium text-foreground mb-0.5">
                    {truncateTitle(task.title)}
                  </div>
                  {task.content && (
                    <RichContent 
                      content={task.content}
                      className="text-xs text-muted-foreground line-clamp-2"
                    />
                  )}
                  
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <TaskScoreBadge
                      score={latestScore}
                      size="sm"
                      onClick={() => setIsScoreDialogOpen(true)}
                    />
                    <TaskPrioritySelector
                      priority={task.priority}
                      onChange={(priority) => onEdit(task.id, task.title)}
                      compact={true}
                    />
                    <TaskAssignees assignments={assignments} maxVisible={3} />
                    {task.end_date && (
                      <span className="text-xs text-muted-foreground">
                        до {format(new Date(task.end_date), "dd MMM", { locale: ru })}
                      </span>
                    )}
                  </div>
                </div>
              </TaskTooltip>
            )}
          </div>

          {!isEditing && (
            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                {...attributes}
                {...listeners}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 cursor-grab active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </Button>
              <TaskLinkButton taskId={task.id} />
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
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
                        onDelete(task.id);
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

        {subtasks.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-border">
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
                {subtasks.length} задач
              </span>
            </div>
            <MiniBoard
              parentTaskId={task.id}
              subtasks={sortedSubtasks}
              columns={task.custom_columns || []}
              onStatusChange={onSubtaskStatusChange}
              onDelete={onSubtaskDelete}
              onDrillDown={onDrillDown}
              enableCrossCardDrag={true}
            />
          </div>
        )}
      </div>

      <TaskDialog
        task={task}
        isOpen={isDialogOpen}
        onClose={() => {
          if (onOpenDialog) {
            onOpenDialog(false);
          } else {
            setInternalIsDialogOpen(false);
          }
        }}
        onUpdate={handleUpdate}
        onDrillDown={onDrillDown}
      />
      
      <TaskScoreDialog
        taskId={task.id}
        isOpen={isScoreDialogOpen}
        onClose={() => setIsScoreDialogOpen(false)}
        onScoreUpdated={reloadScore}
      />
    </div>
  );
};

export default DraggableTaskCard;
