import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { Task } from "@/types/kanban";
import { TaskContent } from "@/components/TaskContent";
import { useRef, useImperativeHandle, forwardRef } from "react";

interface TaskDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDrillDown?: (task: Task) => void;
}

export interface TaskContentHandle {
  saveBeforeClose: () => Promise<void>;
}

export const TaskDialog = ({ 
  task, 
  isOpen, 
  onClose, 
  onUpdate, 
  onDrillDown
}: TaskDialogProps) => {
  const taskContentRef = useRef<TaskContentHandle>(null);
  
  const handleClose = async () => {
    // Сохраняем контент перед закрытием
    if (taskContentRef.current) {
      await taskContentRef.current.saveBeforeClose();
    }
    onClose();
  };
  
  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col overflow-hidden pt-2" hideClose>
        <DialogDescription className="sr-only">
          Диалог редактирования задачи
        </DialogDescription>
        <div className="flex-1 overflow-y-auto">
          <TaskContent
            key={task.id}
            ref={taskContentRef}
            task={task}
            onUpdate={onUpdate}
            onDrillDown={onDrillDown}
            onClose={handleClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
