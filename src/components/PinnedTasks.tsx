import { X, Pin } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { getCleanTitle } from "@/lib/utils";

interface PinnedTask {
  id: string;
  title: string;
  emoji?: string;
}

interface PinnedTasksProps {
  pinnedTasks: PinnedTask[];
  onNavigate: (taskId: string) => void;
  onUnpin: (taskId: string) => void;
}

export const PinnedTasks = ({ pinnedTasks, onNavigate, onUnpin }: PinnedTasksProps) => {
  if (pinnedTasks.length === 0) return null;

  const getTruncatedTitle = (title: string) => {
    const cleanTitle = getCleanTitle(title);
    return cleanTitle.length > 5 ? cleanTitle.slice(0, 5) + ".." : cleanTitle;
  };

  return (
    <ScrollArea className="w-full max-w-md">
      <div className="flex items-center gap-1">
        <Pin className="h-3 w-3 text-white/60 flex-shrink-0" />
        {pinnedTasks.map((task) => (
          <TooltipProvider key={task.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 bg-white/10 rounded px-2 py-1 group">
                  <button
                    onClick={() => onNavigate(task.id)}
                    className="text-xs text-white hover:text-white/80 transition-colors flex items-center gap-1"
                  >
                    {task.emoji && <span>{task.emoji}</span>}
                    <span>{getTruncatedTitle(task.title)}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpin(task.id);
                    }}
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent className="z-[100]">
                <p>{getCleanTitle(task.title)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
