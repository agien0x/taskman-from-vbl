import { Flag } from "lucide-react";
import { TaskPriority } from "@/types/kanban";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface TaskPrioritySelectorProps {
  priority?: TaskPriority;
  onChange: (priority: TaskPriority) => void;
  compact?: boolean;
}

const priorityConfig = {
  none: { label: "Нет", color: "text-muted-foreground", bgColor: "bg-muted-foreground" },
  low: { label: "Низкий", color: "text-blue-500", bgColor: "bg-blue-500" },
  medium: { label: "Средний", color: "text-pink-500", bgColor: "bg-pink-500" },
  high: { label: "Высокий", color: "text-pink-500", bgColor: "bg-pink-500" },
};

export const TaskPrioritySelector = ({
  priority = "none",
  onChange,
  compact = false,
}: TaskPrioritySelectorProps) => {
  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.none;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size={compact ? "sm" : "default"}
              className={`${compact ? "h-6 w-6 p-0" : "h-8 w-8 p-0"} ${config.color}`}
            >
              <Flag className={`${compact ? "h-3 w-3" : "h-4 w-4"} fill-current`} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Приоритет: {config.label}</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start">
        {Object.entries(priorityConfig).map(([key, value]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => onChange(key as TaskPriority)}
            className="flex items-center gap-2"
          >
            <Flag className={`h-4 w-4 ${value.color} fill-current`} />
            <span>{value.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
