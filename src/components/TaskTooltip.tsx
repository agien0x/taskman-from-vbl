import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./ui/tooltip";
import { getCleanTitle } from "@/lib/utils";
import { RichContent } from "./RichContent";

interface TaskTooltipProps {
  title: string;
  content?: string;
  children: ReactNode;
  taskId?: string;
}

/**
 * Simple tooltip wrapper for task previews in lists/tables
 * For full card preview with MiniBoard, use TaskBadge with HoverCard
 */
export const TaskTooltip = ({ title, content, children }: TaskTooltipProps) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-md" 
          side="bottom" 
          align="start"
          sideOffset={8}
        >
          <div className="font-medium mb-1">
            {getCleanTitle(title)}
          </div>
          {content && (
            <RichContent 
              content={content}
              className="text-xs text-muted-foreground line-clamp-3"
            />
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
