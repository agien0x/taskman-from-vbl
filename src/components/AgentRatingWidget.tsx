import { Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface AgentRatingWidgetProps {
  averageRating: number;
  totalRatings: number;
  size?: "sm" | "md";
}

export const AgentRatingWidget = ({ 
  averageRating, 
  totalRatings,
  size = "md" 
}: AgentRatingWidgetProps) => {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm"
  };
  
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 ${sizeClasses[size]}`}>
            <Star className={`${iconSize} fill-pink-400 text-pink-400`} />
            <span className="font-medium">{averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground">({totalRatings})</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Средняя оценка: {averageRating.toFixed(1)} из 5</p>
          <p>Всего оценок: {totalRatings}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
