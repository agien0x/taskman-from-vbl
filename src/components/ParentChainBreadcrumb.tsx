import { ChevronRight } from "lucide-react";
import { Task } from "@/types/kanban";
import { Badge } from "./ui/badge";
import { TaskTooltip } from "./TaskTooltip";
import { getCleanTitle } from "@/lib/utils";
import { CloneTaskButton } from "./CloneTaskButton";

interface ParentChainBreadcrumbProps {
  parentChain: Task[];
  onNavigate?: (task: Task, index: number) => void;
  onDrillDown?: (task: Task) => void;
  variant?: 'full' | 'compact';
  truncateMiddle?: boolean;
  showAddParent?: boolean;
  currentTaskId?: string;
  onRelationChange?: () => void;
}

export const ParentChainBreadcrumb = ({ 
  parentChain, 
  onNavigate, 
  onDrillDown,
  variant = 'compact',
  truncateMiddle = false,
  showAddParent = false,
  currentTaskId,
  onRelationChange,
}: ParentChainBreadcrumbProps) => {
  const truncateTitle = (title: string, maxLength: number = 12) => {
    const cleanText = getCleanTitle(title, title);
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.slice(0, maxLength - 1) + 'â¦';
  };

  // More aggressive truncation for long chains
  const shouldShowEllipsis = truncateMiddle && parentChain.length > 2;
  
  const getVisibleParents = () => {
    if (!shouldShowEllipsis) return parentChain;
    
    // Show: first 1 parent, ..., last 1 parent
    if (parentChain.length <= 2) return parentChain;
    
    const first = parentChain.slice(0, 1);
    const last = parentChain.slice(-1);
    
    return [...first, ...last];
  };

  const visibleParents = getVisibleParents();

  if (visibleParents.length === 0) return null;

  const gapClass = variant === 'compact' ? 'gap-0.5' : 'gap-0.5';

  return (
    <div className={`flex items-center ${gapClass} overflow-hidden whitespace-nowrap min-w-0`}>
      {visibleParents.map((parent, visibleIndex) => {
        // Check if we should show ellipsis before this item (only for the last item when truncating)
        const showEllipsisBefore = shouldShowEllipsis && visibleIndex === 1;
        
        return (
          <div key={parent.id} className={`flex items-center ${gapClass} min-w-0 ${visibleIndex === visibleParents.length - 1 ? 'flex-shrink' : 'flex-shrink-0'}`}>
            {visibleIndex > 0 && (
              <ChevronRight className={`${variant === 'compact' ? 'h-2.5 w-2.5' : 'h-2.5 w-2.5'} text-muted-foreground/50 flex-shrink-0`} />
            )}
            {showEllipsisBefore && (
              <>
                <span className="text-[10px] text-muted-foreground/50 flex-shrink-0 px-0.5">â¦</span>
                <ChevronRight className={`${variant === 'compact' ? 'h-2.5 w-2.5' : 'h-2.5 w-2.5'} text-muted-foreground/50 flex-shrink-0`} />
              </>
            )}
            
            <TaskTooltip title={parent.title} content={parent.content}>
              {variant === 'compact' ? (
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 cursor-pointer hover:bg-accent whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDrillDown) onDrillDown(parent);
                    if (onNavigate) onNavigate(parent, visibleIndex);
                  }}
                >
                  {truncateTitle(parent.title, 10)}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 cursor-pointer hover:bg-accent whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px] font-normal"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDrillDown) onDrillDown(parent);
                    if (onNavigate) onNavigate(parent, visibleIndex);
                  }}
                >
                  {truncateTitle(parent.title, 12)}
                </Badge>
              )}
            </TaskTooltip>
          </div>
        );
      })}
      {showAddParent && currentTaskId && (
        <CloneTaskButton
          taskId={currentTaskId}
          onCloneComplete={onRelationChange}
          className="ml-0.5"
        />
      )}
    </div>
  );
};
