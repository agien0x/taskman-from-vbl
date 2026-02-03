import { RootTaskSelector } from "./RootTaskSelector";
import { ParentChainBreadcrumb } from "./ParentChainBreadcrumb";
import { MultiParentIndicator } from "./MultiParentIndicator";
import { Task } from "@/types/kanban";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TaskSearchDialog } from "./TaskSearchDialog";

interface ParentChainBarProps {
  parentChain: Task[]; // full chain including root if available
  rootTaskId?: string | null;
  onRootSelect?: (task: Task) => void;
  onDrillDown?: (task: Task) => void;
  onNavigate?: (task: Task, index: number) => void;
  showAddParent?: boolean;
  currentTaskId?: string;
  onRelationChange?: () => void;
  variant?: "full" | "dialog" | "card";
  className?: string;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  canNavigateBack?: boolean;
  canNavigateForward?: boolean;
  onTaskSearch?: (task: Task) => void;
  currentParentId?: string; // Current parent context for multi-parent indicator
  currentBoardRootId?: string; // ID текущей корневой доски для определения "чужих" корней
  hasMultipleParents?: boolean; // Задача находится на нескольких досках
}

export const ParentChainBar = ({
  parentChain,
  rootTaskId,
  onRootSelect,
  onDrillDown,
  onNavigate,
  showAddParent = false,
  currentTaskId,
  onRelationChange,
  variant = "full",
  className = "",
  onNavigateBack,
  onNavigateForward,
  canNavigateBack = false,
  canNavigateForward = false,
  onTaskSearch,
  currentParentId,
  currentBoardRootId,
  hasMultipleParents = false,
}: ParentChainBarProps) => {
  // Filter out root tasks - we only show non-root tasks in breadcrumb
  const nonRootParents = parentChain.filter((p) => !p.is_root);
  
  // Find the actual root task for the icon
  const rootTask = parentChain.find((p) => p.is_root);

  // Определяем, является ли корень задачи чужим (отличается от текущей доски)
  const taskRootId = rootTask?.id || rootTaskId;
  const isForeignRoot = Boolean(currentBoardRootId && taskRootId && taskRootId !== currentBoardRootId);

  const sizeClass = variant === "card" ? "h-5 w-5" : "h-7 w-7";
  const containerMax = variant === "card" ? "max-w-[70%]" : "";
  const gapClass = variant === "card" ? "gap-0.5" : "gap-1";
  const showNavigation = (variant === "full" || variant === "dialog") && (onNavigateBack || onNavigateForward || onTaskSearch);

  // Handle root click - navigate to root board
  const handleRootClick = () => {
    if (rootTask && onDrillDown) {
      onDrillDown(rootTask);
    }
  };

  return (
    <div className={`flex items-center ${gapClass} whitespace-nowrap w-full ${className}`}>
      <div className={`flex items-center ${gapClass} whitespace-nowrap min-w-0 ${containerMax}`}>
        <RootTaskSelector
          currentRootId={rootTaskId || rootTask?.id}
          currentRootTitle={rootTask?.title}
          onRootSelect={onRootSelect || (() => {})}
          onRootClick={handleRootClick}
          className={`h-8 px-1 flex-shrink-0`}
          isForeignRoot={isForeignRoot}
          hasDuplicates={hasMultipleParents}
        />
        {/* Breadcrumbs after root */}
        {nonRootParents.length > 0 && (
          <div className="min-w-0 overflow-hidden">
            <ParentChainBreadcrumb
              parentChain={nonRootParents}
              onDrillDown={onDrillDown}
              onNavigate={onNavigate}
              variant={variant === "card" ? "compact" : "full"}
              truncateMiddle={true}
              showAddParent={showAddParent}
              currentTaskId={currentTaskId}
              onRelationChange={onRelationChange}
            />
          </div>
        )}
        {/* Multi-parent indicator */}
        {currentTaskId && variant !== "card" && (
          <MultiParentIndicator
            taskId={currentTaskId}
            currentParentId={currentParentId || nonRootParents[nonRootParents.length - 1]?.id}
            onNavigateToParent={onDrillDown}
          />
        )}
      </div>

      {/* Navigation buttons */}
      {showNavigation && (
        <div className="ml-auto flex items-center gap-1 flex-shrink-0">
          {onNavigateBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateBack}
              disabled={!canNavigateBack}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
              title="Назад"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          )}
          {onNavigateForward && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateForward}
              disabled={!canNavigateForward}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
              title="Вперед"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
          {onTaskSearch && (
            <TaskSearchDialog 
              onTaskSelect={onTaskSearch}
              buttonClassName="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            />
          )}
        </div>
      )}
    </div>
  );
};
