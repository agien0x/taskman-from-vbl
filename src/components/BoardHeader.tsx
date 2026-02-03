import { Task, TaskPriority } from "@/types/kanban";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Flag, Users, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ParentChainBar } from "./ParentChainBar";

interface BoardHeaderProps {
  task: Task;
  onExpand: () => void;
  navigationStack?: Task[];
  onNavigate?: (task: Task, index: number) => void;
  rootTask?: Task | null;
  onRootSelect?: (task: Task) => void;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  high: { label: "Высокий", className: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Средний", className: "bg-warning/10 text-warning border-warning/20" },
  low: { label: "Низкий", className: "bg-muted text-muted-foreground border-border" },
  none: { label: "", className: "" },
};

export const BoardHeader = ({ 
  task, 
  onExpand, 
  navigationStack = [], 
  onNavigate,
  rootTask,
  onRootSelect,
}: BoardHeaderProps) => {
  const [owner, setOwner] = useState<Profile | null>(null);
  const [subtaskCount, setSubtaskCount] = useState(0);

  useEffect(() => {
    const loadOwner = async () => {
      if (!task.owner_id) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", task.owner_id)
        .single();
      
      if (data) setOwner(data);
    };

    const loadSubtaskCount = async () => {
      const { count } = await supabase
        .from("task_relations")
        .select("*", { count: "exact", head: true })
        .eq("parent_id", task.id);
      
      setSubtaskCount(count || 0);
    };

    loadOwner();
    loadSubtaskCount();
  }, [task.id, task.owner_id]);

  const hasDeadline = task.end_date;
  const hasPriority = task.priority && task.priority !== "none";
  const hasOwner = owner;

  // Build parent chain for breadcrumb (exclude current task)
  const parentChain = navigationStack.slice(0, -1);

  // Handle drill down navigation
  const handleDrillDown = (targetTask: Task) => {
    const index = parentChain.findIndex(t => t.id === targetTask.id);
    if (index !== -1 && onNavigate) {
      onNavigate(targetTask, index);
    }
  };

  return (
    <div 
      className="px-3 py-1.5 group cursor-pointer hover:bg-accent/30 transition-colors"
      onClick={onExpand}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Breadcrumb path - gets flexible space */}
        {parentChain.length > 0 && (
          <div className="min-w-0 flex-shrink overflow-hidden" style={{ maxWidth: '45%' }} onClick={(e) => e.stopPropagation()}>
            <ParentChainBar
              parentChain={parentChain}
              rootTaskId={rootTask?.id}
              onRootSelect={onRootSelect}
              onDrillDown={handleDrillDown}
              onNavigate={onNavigate}
              variant="dialog"
              currentTaskId={task.id}
              showAddParent={true}
            />
          </div>
        )}

        {/* Separator */}
        {parentChain.length > 0 && (
          <div className="h-4 w-px bg-border flex-shrink-0" />
        )}

        {/* Icon */}
        <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
          <FolderOpen className="h-4 w-4 text-primary" />
        </div>

        {/* Title and pitch */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <h2 className="text-sm font-medium text-foreground truncate">
            {task.title.replace(/<[^>]*>/g, '')}
          </h2>
          
          {task.pitch && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              — {task.pitch}
            </span>
          )}
        </div>

        {/* Quick stats - inline */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasPriority && (
            <Badge 
              variant="outline" 
              className={cn("text-xs h-5 px-1.5", priorityConfig[task.priority!].className)}
            >
              <Flag className="h-3 w-3 mr-0.5" />
              {priorityConfig[task.priority!].label}
            </Badge>
          )}

          {hasDeadline && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(task.end_date!), "d MMM", { locale: ru })}
            </span>
          )}

          {subtaskCount > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Users className="h-3 w-3" />
              {subtaskCount}
            </span>
          )}

          {hasOwner && (
            <Avatar className="h-5 w-5">
              <AvatarImage src={owner.avatar_url || undefined} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {owner.full_name?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Expand hint */}
          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            ↓
          </span>
        </div>
      </div>
    </div>
  );
};
