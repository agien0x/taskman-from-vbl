import { TaskPriority } from "@/types/kanban";
import { TaskPrioritySelector } from "@/components/TaskPrioritySelector";
import { DateRangePicker } from "@/components/DateRangePicker";
import { TaskAssignmentSelector } from "@/components/TaskAssignmentSelector";
import { TimeSelector } from "@/components/TimeSelector";
import { TaskTypeSelector } from "@/components/TaskTypeSelector";
import { Button } from "@/components/ui/button";
import { Clock, Pin, Link2, History, Layers, X } from "lucide-react";
import { useState, useEffect } from "react";
import { TimeLogDialog } from "@/components/TimeLogDialog";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { TaskScoreBadge } from "@/components/TaskScoreBadge";
import { TaskScoreDialog } from "@/components/TaskScoreDialog";

type TaskType = "task" | "personal_board" | "standup" | "function";

interface TaskMetadataProps {
  taskId: string;
  priority: TaskPriority;
  startDate: Date | null;
  endDate: Date | null;
  ownerId: string | null;
  plannedHours?: number;
  taskType?: TaskType;
  onPriorityChange: (priority: TaskPriority) => void;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onOwnerChange: () => void;
  onPlannedHoursChange?: (hours: number | null) => void;
  onTaskTypeChange?: (type: TaskType) => void;
  onDrillDown?: () => void;
  onVersionHistory?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onClose?: () => void;
  variant?: "default" | "compact";
}

const PLAN_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 12, 16, 24];

export const TaskMetadata = ({
  taskId,
  priority,
  startDate,
  endDate,
  ownerId,
  plannedHours,
  taskType = "task",
  onPriorityChange,
  onStartDateChange,
  onEndDateChange,
  onOwnerChange,
  onPlannedHoursChange,
  onTaskTypeChange,
  onDrillDown,
  onVersionHistory,
  isPinned,
  onTogglePin,
  onClose,
  variant = "default",
}: TaskMetadataProps) => {
  const [actualHours, setActualHours] = useState<number>(0);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const { toast } = useToast();

  const loadActualHours = async () => {
    const { data, error } = await supabase
      .from("time_logs")
      .select("hours")
      .eq("task_id", taskId);

    if (!error && data) {
      const total = data.reduce((sum, log) => sum + log.hours, 0);
      setActualHours(total);
    }
  };

  const loadLatestScore = async () => {
    const { data, error } = await supabase
      .from("task_scores")
      .select("score")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setLatestScore(data.score);
    }
  };

  useEffect(() => {
    loadActualHours();
    loadLatestScore();
  }, [taskId]);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/?task=${taskId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Ссылка скопирована",
      description: "Ссылка на задачу скопирована в буфер обмена",
    });
  };

  const containerClass = variant === "compact" 
    ? "flex items-center gap-2 flex-wrap p-2 bg-muted/10"
    : "flex items-center gap-2 flex-wrap pt-2 pb-2";

  return (
    <>
      <div className={containerClass}>
        <TaskScoreBadge
          score={latestScore}
          size="sm"
          onClick={() => setIsScoreDialogOpen(true)}
        />
        <div className="h-4 w-px bg-border" />
        <TaskTypeSelector value={taskType} onChange={onTaskTypeChange || (() => {})} />
        <div className="h-4 w-px bg-border" />
        <TaskAssignmentSelector taskId={taskId} compact={true} />
        <div className="h-4 w-px bg-border" />
        <TaskPrioritySelector priority={priority} onChange={onPriorityChange} compact={true} />
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
        />
        <TimeSelector
          value={plannedHours || null}
          onChange={onPlannedHoursChange || (() => {})}
          options={PLAN_OPTIONS}
          placeholder="-"
          disabled={!onPlannedHoursChange}
        />
        <div className="text-xs text-muted-foreground">/</div>
        <span className="text-xs font-medium">{actualHours}ч</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setIsLogDialogOpen(true)}
            >
              <Clock className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={5}>Добавить запись трудозатрат: укажите часы и описание</TooltipContent>
        </Tooltip>
        <div className="h-4 w-px bg-border" />
        {onDrillDown && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={onDrillDown}>
                <Layers className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={5}>Просмотреть подзадачи в формате доски</TooltipContent>
          </Tooltip>
        )}
        {onVersionHistory && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={onVersionHistory}>
                <History className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={5}>Показать все изменения и восстановить версию</TooltipContent>
          </Tooltip>
        )}
        {onTogglePin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 w-7 p-0 ${isPinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={onTogglePin}
              >
                <Pin className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={5}>{isPinned ? "Убрать закрепление" : "Закрепить вверху списка задач"}</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={handleCopyLink}>
              <Link2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={5}>Скопировать прямую ссылку в буфер обмена</TooltipContent>
        </Tooltip>
        
        <div className="flex-1" />
        
        {onClose && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={5}>Закрыть диалог</TooltipContent>
          </Tooltip>
        )}
      </div>

      <TimeLogDialog
        taskId={taskId}
        isOpen={isLogDialogOpen}
        onClose={() => setIsLogDialogOpen(false)}
        onSuccess={loadActualHours}
      />

      <TaskScoreDialog
        taskId={taskId}
        isOpen={isScoreDialogOpen}
        onClose={() => setIsScoreDialogOpen(false)}
        onScoreUpdated={loadLatestScore}
      />
    </>
  );
};
