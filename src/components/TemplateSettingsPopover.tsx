import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RecurrenceSettings } from "@/components/RecurrenceSettings";
import { RecurrenceType, Task } from "@/types/kanban";
import { useTaskTypeTemplates, TaskType } from "@/hooks/useTaskTypeTemplates";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskTypeTemplateManager } from "@/components/TaskTypeTemplateManager";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TemplateSettingsPopoverProps {
  task: Task;
  recurrenceType: RecurrenceType;
  recurrenceDays: number[];
  onRecurrenceTypeChange: (type: RecurrenceType) => void;
  onRecurrenceDaysChange: (days: number[]) => void;
  onSaveAsDefault: () => void;
  onInsertTemplate: (templateContent: string) => void;
  onUpdateTask: (updates: Partial<Task>) => void;
}

export const TemplateSettingsPopover = ({
  task,
  recurrenceType,
  recurrenceDays,
  onRecurrenceTypeChange,
  onRecurrenceDaysChange,
  onInsertTemplate,
}: TemplateSettingsPopoverProps) => {
  const { templates } = useTaskTypeTemplates();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      
      if (user?.id) {
        // Load all assignments for this user
        const { data: assignmentData } = await supabase
          .from("task_type_template_assignments")
          .select("template_id")
          .eq("user_id", user.id);
        
        setAssignments(assignmentData || []);
      }
    };
    loadUserData();
  }, []);

  // Определяем активные шаблоны для этой задачи
  const taskType = task.task_type || 'task';
  const activeTemplates = templates.filter((t) => 
    t.task_type === taskType && 
    t.is_active &&
    (t.is_global || 
     t.owner_id === currentUserId || 
     assignments.some(a => a.template_id === t.id))
  );
  
  const activeTemplateIds = activeTemplates.map(t => t.id);

  const handleInsertWithTimestamp = (templateContent: string) => {
    const now = new Date();
    const timestamp = now.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');
    const contentWithTimestamp = `<p><em>(${timestamp})</em> ${templateContent}</p>`;
    onInsertTemplate(contentWithTimestamp);
  };

  const getTooltipText = () => {
    const parts: string[] = [];
    
    if (activeTemplates.length > 0) {
      parts.push(`${activeTemplates.length} шабл`);
    }
    
    const recurrenceLabels: Record<RecurrenceType, string> = {
      none: "Без повторений",
      daily: "Ежедневно",
      weekdays: "По будням",
      weekly: "Еженедельно",
    };
    
    if (recurrenceType !== "none") {
      parts.push(recurrenceLabels[recurrenceType]);
    }
    
    return parts.length > 0 ? parts.join(" • ") : "Настройки шаблона";
  };

  return (
    <TooltipProvider>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 bg-background/80 backdrop-blur-sm"
              >
                <FileText className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{getTooltipText()}</p>
          </TooltipContent>
        </Tooltip>
      <PopoverContent className="w-[95vw] max-w-[600px]" align="center" sideOffset={12}>
        <ScrollArea className="max-h-[80vh]">
          <div className="space-y-4 pr-3">
            {/* Управление шаблонами */}
            <div>
              <h4 className="font-medium text-sm mb-3">Шаблоны для {task.task_type || 'задачи'}</h4>
              <TaskTypeTemplateManager 
                taskType={(task.task_type || 'task') as TaskType}
                label=""
                onInsertTemplate={handleInsertWithTimestamp}
                activeTemplateIds={activeTemplateIds}
              />
            </div>

            <Separator />

            {/* Периодичность */}
            <div>
              <h4 className="font-medium text-sm mb-3">Периодичность</h4>
              <RecurrenceSettings
                recurrenceType={recurrenceType}
                recurrenceDays={recurrenceDays}
                onRecurrenceTypeChange={onRecurrenceTypeChange}
                onRecurrenceDaysChange={onRecurrenceDaysChange}
              />
            </div>

          </div>
        </ScrollArea>
      </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
};
