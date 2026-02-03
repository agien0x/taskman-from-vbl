import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export const ThemeSelector = () => {
  const { isDark, toggleDarkMode } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleDarkMode}
          className="h-8 w-8 p-0 rounded-full hover:bg-white/20 dark:hover:bg-muted text-white dark:text-foreground"
        >
          {isDark ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isDark ? "Светлая тема" : "Тёмная тема"}
      </TooltipContent>
    </Tooltip>
  );
};
