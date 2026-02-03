import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TaskTypeTemplateManager } from "@/components/TaskTypeTemplateManager";
import { useTaskTypeTemplates, TaskType } from "@/hooks/useTaskTypeTemplates";
import { Skeleton } from "@/components/ui/skeleton";

const TYPE_LABELS: Record<TaskType, string> = {
  task: "Задача",
  personal_board: "Личная доска",
  standup: "Стендап",
  function: "Функция",
  organization: "Организация",
};

export const TaskTypeEditor = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isLoading } = useTaskTypeTemplates();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="Настроить типы задач"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Настройка типов задач и шаблонов</DialogTitle>
          <DialogDescription>
            Управляйте шаблонами для каждого типа задач. Создавайте свои шаблоны или используйте глобальные.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-6 pt-4">
            {Object.keys(TYPE_LABELS).map((type) => (
              <div key={type} className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <TaskTypeTemplateManager
                key={type}
                taskType={type as TaskType}
                label={label}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Вспомогательные функции для обратной совместимости
export const getTaskTypeLabels = (): Record<TaskType, string> => {
  return TYPE_LABELS;
};

// Устаревшая функция для обратной совместимости
export const getTaskTypeConfigs = () => {
  return Object.entries(TYPE_LABELS).reduce((acc, [type, label]) => {
    acc[type as TaskType] = {
      label,
      template: "",
      qualityCriteria: "",
    };
    return acc;
  }, {} as Record<TaskType, { label: string; template: string; qualityCriteria: string }>);
};
