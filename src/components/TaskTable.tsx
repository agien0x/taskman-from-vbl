import { useState, useEffect } from "react";
import { Task } from "@/types/kanban";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ParentChainBreadcrumb } from "./ParentChainBreadcrumb";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { TaskTooltip } from "./TaskTooltip";
import { getCleanTitle } from "@/lib/utils";
import TaskBadge from "./TaskBadge";

interface TaskTableProps {
  tasks: Task[];
  columns: Array<{ id: string; title: string; color?: string }>;
  onTaskClick: (task: Task) => void;
  onDrillDown?: (task: Task) => void;
  selectedTasks: string[];
  onSelectionChange: (taskIds: string[]) => void;
}

export function TaskTable({
  tasks,
  columns,
  onTaskClick,
  onDrillDown,
  selectedTasks,
  onSelectionChange,
}: TaskTableProps) {
  const [taskParents, setTaskParents] = useState<Record<string, Task[]>>({});
  const [taskStatuses, setTaskStatuses] = useState<Record<string, Array<{ id: string; title: string; color?: string }>>>({});
  const [profiles, setProfiles] = useState<Record<string, { full_name: string; avatar_url?: string }>>({});

  useEffect(() => {
    loadTaskRelations();
    loadProfiles();
  }, [tasks]);

  const loadTaskRelations = async () => {
    try {
      const taskIds = tasks.map(t => t.id);
      
      // Load parent relations
      const { data: relations, error } = await supabase
        .from("task_relations")
        .select("parent_id, child_id")
        .in("child_id", taskIds);

      if (error) throw error;

      // Load parent tasks
      const parentIds = [...new Set(relations?.map(r => r.parent_id) || [])];
      if (parentIds.length > 0) {
        const { data: parentTasks, error: parentError } = await supabase
          .from("tasks")
          .select("*")
          .in("id", parentIds);

        if (parentError) throw parentError;

        // Build parent chains
        const parentsMap: Record<string, Task[]> = {};
        relations?.forEach(rel => {
          const parent = parentTasks?.find(t => t.id === rel.parent_id);
          if (parent) {
            if (!parentsMap[rel.child_id]) {
              parentsMap[rel.child_id] = [];
            }
            parentsMap[rel.child_id].push({
              id: parent.id,
              title: parent.title,
              content: parent.content,
              columnId: parent.column_id,
              pitch: parent.pitch,
            });
          }
        });

        setTaskParents(parentsMap);
      }

      // Load all statuses for each task (from custom_columns)
      const statusesMap: Record<string, Array<{ id: string; title: string; color?: string }>> = {};
      tasks.forEach(task => {
        const taskData = tasks.find(t => t.id === task.id);
        if (taskData?.custom_columns && Array.isArray(taskData.custom_columns)) {
          // Find all columns that match the task's current column
          const matchingColumns = (taskData.custom_columns as any[])
            .filter((col: any) => col.id === task.columnId)
            .map((col: any) => ({
              id: col.id,
              title: col.title,
              color: col.color,
            }));
          
          if (matchingColumns.length > 0) {
            statusesMap[task.id] = matchingColumns;
          }
        }
        
        // Fallback: use the column from the columns prop
        if (!statusesMap[task.id]) {
          const column = columns.find(c => c.id === task.columnId);
          if (column) {
            statusesMap[task.id] = [{
              id: column.id,
              title: column.title,
              color: column.color,
            }];
          }
        }
      });

      setTaskStatuses(statusesMap);
    } catch (error) {
      console.error("Error loading task relations:", error);
    }
  };

  const loadProfiles = async () => {
    try {
      const ownerIds = [...new Set(tasks.map(t => t.owner_id).filter(Boolean))];
      if (ownerIds.length === 0) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", ownerIds);

      if (error) throw error;

      const profilesMap: Record<string, { full_name: string; avatar_url?: string }> = {};
      data?.forEach(profile => {
        profilesMap[profile.user_id] = {
          full_name: profile.full_name || "Unknown",
          avatar_url: profile.avatar_url || undefined,
        };
      });

      setProfiles(profilesMap);
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(tasks.map(t => t.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedTasks, taskId]);
    } else {
      onSelectionChange(selectedTasks.filter(id => id !== taskId));
    }
  };

  const isAllSelected = tasks.length > 0 && selectedTasks.length === tasks.length;
  const isSomeSelected = selectedTasks.length > 0 && selectedTasks.length < tasks.length;

  const truncateTitle = (title: string, maxLength: number = 25) => {
    const cleanText = getCleanTitle(title, title);
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.slice(0, maxLength) + '...';
  };

  const SubtasksBadges = ({ taskId }: { taskId: string }) => {
    const [subtasks, setSubtasks] = useState<Array<{ id: string; title: string; content: string }>>([]);

    useEffect(() => {
      const loadSubtasks = async () => {
        try {
          const { data: relations } = await supabase
            .from("task_relations")
            .select("child_id")
            .eq("parent_id", taskId);

          if (relations && relations.length > 0) {
            const childIds = relations.map(r => r.child_id);
            const { data: subtaskData } = await supabase
              .from("tasks")
              .select("id, title, content")
              .in("id", childIds);

            setSubtasks(subtaskData || []);
          }
        } catch (error) {
          console.error("Error loading subtasks:", error);
        }
      };

      loadSubtasks();
    }, [taskId]);

    if (subtasks.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1">
        {subtasks.map((subtask) => (
          <TaskBadge
            key={subtask.id}
            taskId={subtask.id}
            title={truncateTitle(subtask.title, 30)}
            showMenu={false}
          />
        ))}
      </div>
    );
  };

  const DuplicatesBadges = ({ duplicates }: { duplicates?: Array<{ id: string }> }) => {
    const [duplicateTasks, setDuplicateTasks] = useState<Array<{ id: string; title: string; content: string }>>([]);

    useEffect(() => {
      const loadDuplicates = async () => {
        if (!duplicates || !Array.isArray(duplicates) || duplicates.length === 0) {
          return;
        }

        try {
          const dupIds = duplicates.map((d: any) => d.id).filter(Boolean);
          if (dupIds.length === 0) return;

          const { data } = await supabase
            .from("tasks")
            .select("id, title, content")
            .in("id", dupIds);

          setDuplicateTasks(data || []);
        } catch (error) {
          console.error("Error loading duplicates:", error);
        }
      };

      loadDuplicates();
    }, [duplicates]);

    if (duplicateTasks.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1">
        {duplicateTasks.map((dup) => (
          <TaskBadge
            key={dup.id}
            taskId={dup.id}
            title={truncateTitle(dup.title, 30)}
            showMenu={false}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Выбрать все"
                className={isSomeSelected ? "data-[state=checked]:bg-primary/50" : ""}
              />
            </TableHead>
            <TableHead className="w-[250px]">Название</TableHead>
            <TableHead className="w-[120px]">Питч</TableHead>
            <TableHead className="w-[180px]">Статус</TableHead>
            <TableHead className="w-[140px]">Владелец</TableHead>
            <TableHead className="w-[150px]">Подзадачи</TableHead>
            <TableHead className="w-[150px]">Дубли</TableHead>
            <TableHead className="w-[160px]">Обновлено</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const parents = taskParents[task.id] || [];
            const statuses = taskStatuses[task.id] || [];
            const owner = task.owner_id ? profiles[task.owner_id] : null;
            const isSelected = selectedTasks.includes(task.id);

            return (
              <TableRow
                key={task.id}
                className={`cursor-pointer ${isSelected ? 'bg-accent/50' : ''}`}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                    aria-label={`Выбрать ${task.title}`}
                  />
                </TableCell>
                <TableCell onClick={() => onTaskClick(task)} className="max-w-[250px]">
                  <div className="space-y-1 overflow-hidden">
                    {parents.length > 0 && (
                      <div className="mb-1">
                        <ParentChainBreadcrumb
                          parentChain={parents}
                          variant="compact"
                          truncateMiddle={true}
                          onDrillDown={onDrillDown}
                        />
                      </div>
                    )}
                    <TaskTooltip title={task.title} content={task.content}>
                      <div className="text-sm cursor-pointer hover:text-primary transition-colors truncate">
                        {truncateTitle(task.title)}
                      </div>
                    </TaskTooltip>
                  </div>
                </TableCell>
                <TableCell onClick={() => onTaskClick(task)} className="max-w-[120px]">
                  {task.pitch && (
                    <TaskTooltip title={task.title} content={task.pitch}>
                      <div className="text-xs text-muted-foreground truncate">
                        {truncateTitle(task.pitch, 30)}
                      </div>
                    </TaskTooltip>
                  )}
                </TableCell>
                <TableCell onClick={() => onTaskClick(task)}>
                  <div className="flex flex-wrap gap-1">
                    {statuses.map((status, index) => (
                      <Badge
                        key={`${status.id}-${index}`}
                        variant="outline"
                        className="text-xs"
                        style={status.color ? { borderLeftColor: status.color, borderLeftWidth: '3px' } : undefined}
                      >
                        {status.title}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell onClick={() => onTaskClick(task)}>
                  {owner && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={owner.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {owner.full_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate max-w-[100px]">{owner.full_name}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell onClick={() => onTaskClick(task)}>
                  <SubtasksBadges taskId={task.id} />
                </TableCell>
                <TableCell onClick={() => onTaskClick(task)}>
                  <DuplicatesBadges duplicates={task.duplicates} />
                </TableCell>
                <TableCell onClick={() => onTaskClick(task)} className="text-sm text-muted-foreground">
                  {task.updated_at && format(new Date(task.updated_at), "dd MMM yyyy, HH:mm", { locale: ru })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
