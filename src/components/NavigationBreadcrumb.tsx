import { ChevronRight, Home, ChevronLeft, ChevronRightIcon, FolderOpen } from "lucide-react";
import { Task } from "@/types/kanban";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { TaskSearchDialog } from "./TaskSearchDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface NavigationBreadcrumbProps {
  navigationStack: Task[];
  onNavigate: (index: number) => void;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  canNavigateBack?: boolean;
  canNavigateForward?: boolean;
  onTaskSearch?: (task: Task) => void;
  onNavigateHome?: () => void;
  className?: string;
}

export const NavigationBreadcrumb = ({
  navigationStack,
  onNavigate,
  onNavigateBack,
  onNavigateForward,
  canNavigateBack = false,
  canNavigateForward = false,
  onTaskSearch,
  onNavigateHome,
  className,
}: NavigationBreadcrumbProps) => {
  // Extract emoji from content if exists
  const getEmoji = (task: Task) => {
    const match = task.content?.match(/^[\p{Emoji}]/u);
    return match ? match[0] : null;
  };

  // Get display name (truncated)
  const getDisplayName = (task: Task, maxLength: number = 20) => {
    const title = task.title || "Без названия";
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + "...";
  };

  // Determine which items to show (skip first item which is root org, show "Главная" instead)
  const visibleItems = () => {
    if (navigationStack.length <= 1) {
      return [];
    }

    const itemsWithoutRoot = navigationStack.slice(1);
    
    if (itemsWithoutRoot.length <= 3) {
      return itemsWithoutRoot.map((t, i) => ({ task: t, index: i + 1, collapsed: false }));
    }

    // Show: first, ..., last 2
    const items: Array<{ task: Task; index: number; collapsed: boolean } | { collapsed: true; count: number }> = [];
    items.push({ task: itemsWithoutRoot[0], index: 1, collapsed: false });
    items.push({ collapsed: true, count: itemsWithoutRoot.length - 3 });
    items.push({ task: itemsWithoutRoot[itemsWithoutRoot.length - 2], index: navigationStack.length - 2, collapsed: false });
    items.push({ task: itemsWithoutRoot[itemsWithoutRoot.length - 1], index: navigationStack.length - 1, collapsed: false });
    
    return items;
  };

  const isCurrentItem = (index: number) => index === navigationStack.length - 1;

  return (
    <div className={cn("flex items-center gap-1 px-3 py-2 bg-card/80 backdrop-blur-sm border-b border-border", className)}>
      {/* Navigation buttons */}
      <div className="flex items-center gap-0.5 mr-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateBack}
                disabled={!canNavigateBack}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Назад</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateForward}
                disabled={!canNavigateForward}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Вперёд</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Breadcrumb path */}
      <div className="flex items-center gap-0.5 overflow-hidden flex-1">
        {/* Home button */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors hover:bg-secondary text-foreground"
        >
          <Home className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Главная</span>
        </button>

        {visibleItems().map((item, i) => {
          if ('count' in item && item.collapsed) {
            return (
              <div key="collapsed" className="flex items-center">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0 mx-0.5" />
                <span className="text-muted-foreground text-sm px-2">...</span>
              </div>
            );
          }

          const { task, index } = item as { task: Task; index: number; collapsed: boolean };
          const emoji = getEmoji(task);
          const isCurrent = isCurrentItem(index);

          return (
            <div key={task.id} className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0 mx-0.5" />
              <button
                onClick={() => onNavigate(index)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors max-w-[180px]",
                  isCurrent
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-secondary text-foreground"
                )}
              >
                {emoji ? (
                  <span className="text-base flex-shrink-0">{emoji}</span>
                ) : (
                  <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{getDisplayName(task)}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Search */}
      {onTaskSearch && (
        <TaskSearchDialog
          onTaskSelect={onTaskSearch}
          buttonClassName="h-7 w-7 p-0 text-muted-foreground hover:text-foreground ml-2"
        />
      )}
    </div>
  );
};
