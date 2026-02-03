import { useState, useEffect } from "react";
import { Task } from "@/types/kanban";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { RootTaskIcon } from "./RootTaskIcon";
import { getCleanTitle } from "@/lib/utils";
import { ChevronDown, Building2 } from "lucide-react";
import { toast } from "sonner";

interface OrganizationSelectorProps {
  currentRootTask?: Task | null;
  onOrganizationSelect: (task: Task) => void;
  className?: string;
}

export const OrganizationSelector = ({ 
  currentRootTask, 
  onOrganizationSelect,
  className = ""
}: OrganizationSelectorProps) => {
  const [organizations, setOrganizations] = useState<Task[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadOrganizations();
    }
  }, [isOpen]);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("is_root", true)
        .order("title", { ascending: true });

      if (error) throw error;

      const tasks: Task[] = (data || []).map((task) => ({
        id: task.id,
        title: task.title,
        content: task.content,
        columnId: task.column_id,
        subtaskOrder: task.subtask_order || 0,
        subtasks: [],
        is_root: task.is_root,
      }));

      setOrganizations(tasks);
    } catch (error) {
      console.error("Error loading organizations:", error);
      toast.error("Не удалось загрузить организации");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (task: Task) => {
    onOrganizationSelect(task);
    setIsOpen(false);
  };

  const displayTitle = currentRootTask ? getCleanTitle(currentRootTask.title) : "Выберите организацию";

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 px-3 gap-2 bg-white/10 hover:bg-white/20 text-white ${className}`}
        >
          {currentRootTask ? (
            <RootTaskIcon 
              title={currentRootTask.title} 
              className="h-4 w-4" 
            />
          ) : (
            <Building2 className="h-4 w-4" />
          )}
          <span className="text-sm font-medium max-w-[120px] truncate">
            {displayTitle}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {loading ? (
          <div className="text-xs text-muted-foreground px-2 py-3 text-center">
            Загрузка...
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-xs text-muted-foreground px-2 py-3 text-center">
            Нет организаций
          </div>
        ) : (
          organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleSelect(org)}
              className={`gap-2 cursor-pointer ${org.id === currentRootTask?.id ? "bg-accent" : ""}`}
            >
              <RootTaskIcon title={org.title} className="h-4 w-4 flex-shrink-0" />
              <span className="truncate flex-1">
                {getCleanTitle(org.title)}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
