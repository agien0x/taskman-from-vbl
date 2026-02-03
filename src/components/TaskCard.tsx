import { useState, useEffect, useMemo } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Button } from "./ui/button";
import { Check, X } from "lucide-react";
import { Task } from "@/types/kanban";

import { TaskDialog } from "./TaskDialog";
import { UnifiedEditor } from "./editor/UnifiedEditor";
import { supabase } from "@/integrations/supabase/client";
import { getCleanTitle } from "@/lib/utils";
import { TaskAssignmentData, TaskMultiParentData } from "@/hooks/useBoardTasksData";

import { TaskScoreDialog } from "./TaskScoreDialog";
import { TaskCardBody } from "./TaskCardBody";

interface TaskCardProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onEdit: (taskId: string, newTitle: string) => void;
  /**
   * Локальное обновление задачи в состоянии доски после сохранений внутри TaskDialog.
   * Важно: не должно повторно писать в БД — TaskContent уже делает это.
   */
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onSubtaskStatusChange: (taskId: string, newColumnId: string) => void;
  onSubtaskDelete: (taskId: string) => void;
  onSubtaskOpen: (taskId: string) => void;
  onDrillDown?: (task: Task) => void;
  availableColumns?: Array<{ id: string; title: string; color?: string }>;
  isDialogOpen?: boolean;
  onOpenDialog?: (isOpen: boolean) => void;
  currentBoardRootId?: string; // ID корневой доски для подсветки "чужих" задач
  // Пакетные данные (передаются из Board -> Column -> TaskCard)
  batchAssignments?: TaskAssignmentData[];
  batchMultiParentData?: TaskMultiParentData;
  batchScore?: number;
}


const TaskCard = ({ task, onDelete, onEdit, onUpdateTask, onSubtaskStatusChange, onSubtaskDelete, onSubtaskOpen, onDrillDown, availableColumns, isDialogOpen: externalIsDialogOpen, onOpenDialog, currentBoardRootId, batchAssignments, batchMultiParentData, batchScore }: TaskCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(getCleanTitle(task.title, task.title));
  const [internalIsDialogOpen, setInternalIsDialogOpen] = useState(false);
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false);
  const [latestScore, setLatestScore] = useState<number | null>(batchScore ?? null);

  // Используем пакетные данные вместо индивидуальных запросов
  const parentCount = batchMultiParentData?.parentCount ?? 0;
  const originalRootId = batchMultiParentData?.originalRootId ?? null;
  const originalRootTitle = batchMultiParentData?.originalRootTitle ?? "";
  
  // Преобразуем пакетные assignments в формат для TaskAssignees
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

  // Use external state if provided, otherwise use internal state
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
    },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `droppable-${task.id}`,
    data: {
      type: "task-dropzone",
      task,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const handleSave = () => {
    if (editContent.trim()) {
      onEdit(task.id, editContent);
      setIsEditing(false);
    }
  };

  const handleUpdate = (taskId: string, updates: Partial<Task>) => {
    // TaskContent уже сохраняет в БД — здесь нужно только обновить локальное состояние,
    // чтобы карточка сразу отразила изменения (title/content и пр.).
    if (onUpdateTask) {
      onUpdateTask(taskId, updates);
      return;
    }

    // Fallback (на случай если компонент используется без доски)
    if (updates.title) {
      onEdit(taskId, updates.title);
    }
  };

  const subtasks = task.subtasks || [];

  const combineRefs = (node: HTMLDivElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  // Используем пакетный score, если есть
  useEffect(() => {
    if (batchScore !== undefined) {
      setLatestScore(batchScore);
    }
  }, [batchScore]);

  // Функция для перезагрузки score после обновления в диалоге
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

  // Найти цвет колонки из availableColumns
  const columnColor = availableColumns?.find(col => col.id === task.columnId)?.color;

  const openDialog = () => {
    if (onOpenDialog) {
      onOpenDialog(true);
    } else {
      setInternalIsDialogOpen(true);
    }
  };

  return (
    <div
      ref={combineRefs}
      style={{
        ...style,
        ...(columnColor && { borderLeftColor: columnColor, borderLeftWidth: '4px' })
      }}
      className={`group bg-card rounded-lg border transition-all ${
        isOver ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary" : "border-border"
      } hover:shadow-md`}
    >
      {isEditing ? (
        <div className="p-2 space-y-1.5">
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
        <TaskCardBody
          task={task}
          variant="full"
          assignments={assignments}
          score={latestScore}
          subtasks={subtasks}
          availableColumns={availableColumns}
          parentCount={parentCount}
          originalRootId={originalRootId}
          originalRootTitle={originalRootTitle}
          currentBoardRootId={currentBoardRootId}
          onDrillDown={onDrillDown}
          onOpenDialog={openDialog}
          onScoreClick={() => setIsScoreDialogOpen(true)}
          onEdit={onEdit}
          onDelete={onDelete}
          onSubtaskStatusChange={onSubtaskStatusChange}
          onSubtaskDelete={onSubtaskDelete}
          dragHandleProps={{ attributes, listeners }}
          isEditing={isEditing}
          onStartEdit={() => setIsEditing(true)}
        />
      )}
      
      {isOver && (
        <div className="mt-2 pt-2 border-t border-dashed border-primary bg-primary/5 min-h-[36px] flex items-center justify-center text-xs text-primary font-medium">
          Отпустите чтобы добавить как подзадачу
        </div>
      )}

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

export default TaskCard;
