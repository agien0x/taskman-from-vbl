import { useState } from "react";
import { Task } from "@/types/kanban";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UnifiedEditor } from "@/components/editor/UnifiedEditor";
import { getTaskTypeConfigs } from "@/components/TaskTypeEditor";

interface TaskSettingsDialogProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

export const TaskSettingsDialog = ({ task, onUpdate }: TaskSettingsDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [useCustomSettings, setUseCustomSettings] = useState(task.use_custom_settings || false);
  const [customTemplate, setCustomTemplate] = useState(task.custom_template || "");
  const [customQualityCriteria, setCustomQualityCriteria] = useState(task.custom_quality_criteria || "");
  const [autoLoadMyTasks, setAutoLoadMyTasks] = useState(task.auto_load_my_tasks || false);

  const globalConfigs = getTaskTypeConfigs();
  const globalConfig = task.task_type ? globalConfigs[task.task_type] : null;
  const isPersonalBoard = task.task_type === 'personal_board';

  const handleSave = () => {
    const updates: Partial<Task> = {
      use_custom_settings: useCustomSettings,
      custom_template: useCustomSettings ? customTemplate : null,
      custom_quality_criteria: useCustomSettings ? customQualityCriteria : null,
    };
    
    // Only include auto_load_my_tasks for personal boards
    if (isPersonalBoard) {
      updates.auto_load_my_tasks = autoLoadMyTasks;
    }
    
    onUpdate(updates);
    setIsOpen(false);
  };

  const handleResetToGlobal = () => {
    setUseCustomSettings(false);
    setCustomTemplate(globalConfig?.template || "");
    setCustomQualityCriteria(globalConfig?.qualityCriteria || "");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="Настройки задачи"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Индивидуальные настройки задачи</DialogTitle>
          <DialogDescription>
            Настройте шаблон и критерии качества для этой конкретной задачи
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          {/* Personal Board Auto-Load Setting */}
          {isPersonalBoard && (
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-load" className="text-sm font-semibold">
                    🔄 Автозагрузка моих задач
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Автоматически показывать все задачи, где вы — владелец или участник
                  </p>
                </div>
                <Switch
                  id="auto-load"
                  checked={autoLoadMyTasks}
                  onCheckedChange={setAutoLoadMyTasks}
                />
              </div>
              {autoLoadMyTasks && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  <strong>Колонки по умолчанию:</strong>
                  <ul className="mt-1 ml-4 list-disc">
                    <li>📁 Мои проекты — задачи с подзадачами</li>
                    <li>📋 To Do — задачи к выполнению</li>
                    <li>🔄 In Progress — задачи в работе</li>
                    <li>✅ Done — выполненные (свёрнута)</li>
                    <li>📦 Архив — архивные (свёрнута)</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="use-custom" className="text-sm font-medium">
              Использовать индивидуальные настройки
            </Label>
            <Switch
              id="use-custom"
              checked={useCustomSettings}
              onCheckedChange={setUseCustomSettings}
            />
          </div>

          {useCustomSettings && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Шаблон задачи</Label>
                <div className="border rounded-md">
                  <UnifiedEditor
                    content={customTemplate}
                    onChange={setCustomTemplate}
                    placeholder="Индивидуальный шаблон для этой задачи"
                    minimal
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Критерии качества</Label>
                <div className="border rounded-md">
                  <UnifiedEditor
                    content={customQualityCriteria}
                    onChange={setCustomQualityCriteria}
                    placeholder="Индивидуальные критерии для оценки этой задачи"
                    minimal
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToGlobal}
                className="w-full"
              >
                Вернуться к глобальному шаблону
              </Button>
            </>
          )}

          {!useCustomSettings && globalConfig && (
            <div className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium mb-2">Текущий глобальный шаблон:</p>
                <div className="p-3 bg-muted rounded-md" dangerouslySetInnerHTML={{ __html: globalConfig.template || "Не задан" }} />
              </div>
              <div>
                <p className="font-medium mb-2">Текущие глобальные критерии:</p>
                <div className="p-3 bg-muted rounded-md" dangerouslySetInnerHTML={{ __html: globalConfig.qualityCriteria || "Не заданы" }} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Отмена
            </Button>
            <Button size="sm" onClick={handleSave}>
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};