import { CheckSquare, ChevronRight, ChevronDown, Clock, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useAllBoards } from "@/hooks/useAllBoards";
import { getCleanTitle } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Task } from "@/types/kanban";

interface FractalMenuProps {
  onNavigateToTask: (taskId: string) => void;
  currentRootTask?: Task | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "админ",
  executor: "исполнитель",
  viewer: "зритель",
};


export const FractalMenu = ({ onNavigateToTask, currentRootTask }: FractalMenuProps) => {
  const { personalBoard, rootBoards, recentBoards, loading } = useAllBoards();

  // Get display name for the header
  const displayName = currentRootTask ? getCleanTitle(currentRootTask.title) : "Fractal";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0 max-w-[200px]">
          <div className="p-1.5 bg-white/20 dark:bg-primary/20 rounded-lg shadow-sm flex-shrink-0">
            <CheckSquare className="h-5 w-5 text-white dark:text-primary" />
          </div>
          <h1 className="text-xl font-bold text-white dark:text-foreground hidden sm:block truncate">
            {displayName}
          </h1>
          <ChevronDown className="h-4 w-4 text-white/70 dark:text-foreground/70 hidden sm:block flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 bg-popover">
        {loading ? (
          <div className="px-2 py-3 text-xs text-muted-foreground text-center">Загрузка...</div>
        ) : (
          <>
            {/* Personal Board - show user's own email */}
            {personalBoard && (
              <DropdownMenuItem
                onSelect={() => onNavigateToTask(personalBoard.id)}
                className="cursor-pointer"
              >
                <User className="h-3.5 w-3.5 mr-2 text-primary flex-shrink-0" />
                <span className="truncate flex-1">{getCleanTitle(personalBoard.title)}</span>
              </DropdownMenuItem>
            )}

            {personalBoard && rootBoards.length > 0 && <DropdownMenuSeparator />}
            
            {/* Organization/Root Boards */}
            {rootBoards.length > 0 && (
              <ScrollArea className={rootBoards.length > 8 ? "max-h-48" : ""}>
                {rootBoards.map((board) => (
                  <DropdownMenuItem
                    key={board.id}
                    onSelect={() => onNavigateToTask(board.id)}
                    className="cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5 mr-2 text-muted-foreground flex-shrink-0" />
                    <span className="truncate flex-1">{getCleanTitle(board.title)}</span>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {ROLE_LABELS[board.role] || board.role}
                    </span>
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
            )}
            
            {!personalBoard && rootBoards.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground text-center">Нет досок</div>
            )}
          </>
        )}
        
        {/* Recent Boards */}
        {recentBoards.length > 0 && (
          <>
            <DropdownMenuSeparator />
            
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Недавние
            </DropdownMenuLabel>
            
            {recentBoards.map((board) => (
              <DropdownMenuItem
                key={board.id}
                onSelect={() => onNavigateToTask(board.id)}
                className="cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5 mr-2 text-muted-foreground flex-shrink-0" />
                <span className="truncate flex-1">{getCleanTitle(board.title)}</span>
                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                  {ROLE_LABELS[board.role] || board.role}
                </span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};