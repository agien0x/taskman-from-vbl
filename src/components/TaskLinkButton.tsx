import { Link } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface TaskLinkButtonProps {
  taskId: string;
  size?: "sm" | "default";
  variant?: "ghost" | "outline" | "default";
  showTooltip?: boolean;
}

export const TaskLinkButton = ({ 
  taskId, 
  size = "sm", 
  variant = "ghost",
  showTooltip = true 
}: TaskLinkButtonProps) => {
  const { toast } = useToast();

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?task=${taskId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Ссылка скопирована",
      description: "Ссылка на задачу скопирована в буфер обмена",
    });
  };

  const button = (
    <Button
      size={size}
      variant={variant}
      onClick={handleCopyLink}
      className={size === "sm" ? "h-6 w-6 p-0" : ""}
    >
      <Link className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
    </Button>
  );

  if (!showTooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {button}
      </TooltipTrigger>
      <TooltipContent>Скопировать ссылку</TooltipContent>
    </Tooltip>
  );
};
