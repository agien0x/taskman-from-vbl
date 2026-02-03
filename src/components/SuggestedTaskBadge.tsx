import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import TaskBadge from "./TaskBadge";
import { cn } from "@/lib/utils";

interface SuggestedTaskBadgeProps {
  taskId: string;
  title: string;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}

export const SuggestedTaskBadge = ({
  taskId,
  title,
  onApprove,
  onReject,
  isLoading
}: SuggestedTaskBadgeProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative inline-flex items-center gap-1 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <TaskBadge
        taskId={taskId}
        title={title}
        showMenu={false}
        disableDialogOpen={false}
      />
      
      <div className={cn(
        "flex items-center gap-0.5 transition-opacity",
        isHovered ? "opacity-100" : "opacity-50"
      )}>
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5 hover:bg-green-500/20 hover:text-green-600"
          onClick={(e) => {
            e.stopPropagation();
            onApprove();
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
        </Button>
        <Button
           size="icon"
           variant="ghost"
           className="h-5 w-5 hover:bg-pink-500/20 hover:text-pink-600"
           onClick={(e) => {
             e.stopPropagation();
             onReject();
           }}
           disabled={isLoading}
         >
           <X className="h-3 w-3" />
         </Button>
      </div>
    </div>
  );
};
