import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, pointerWithin, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import Column from "./Column";
import TaskCard from "./TaskCard";
import { Task, Column as ColumnType } from "@/types/kanban";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ColumnEditor } from "./ColumnEditor";
import { BoardFilters, SortOption, SortDirection } from "./BoardFilters";
import { GenerateEmbeddingsButton } from "./GenerateEmbeddingsButton";
import { retryWithBackoff } from "@/lib/retryUtils";
import { TaskTable } from "./TaskTable";
import { TaskBulkActions } from "./TaskBulkActions";
import { TaskGraph } from "./TaskGraph";
import { Button } from "./ui/button";
import { LayoutGrid, Table as TableIcon, Network } from "lucide-react";
import { useBoardRootInfo } from "@/hooks/useBoardRootInfo";
import { useBoardTasksData } from "@/hooks/useBoardTasksData";
import { useBoardUserSettings } from "@/hooks/useBoardUserSettings";


const defaultColumns: ColumnType[] = [
  {
    id: "todo",
    title: "To Do",
    tasks: [],
  },
  {
    id: "inprogress",
    title: "In Progress",
    tasks: [],
  },
  {
    id: "done",
    title: "Done",
    tasks: [],
  },
];

interface BoardProps {
  parentTaskId?: string;
  parentTask?: Task;
  onDrillDown?: (task: Task) => void;
  onColumnsUpdate?: () => void;
}

const Board = ({ parentTaskId, parentTask, onDrillDown, onColumnsUpdate }: BoardProps) => {
  // IMPORTANT: avoid falling back to a hardcoded root; always rely on parentTaskId/parentTask.
  const [columns, setColumns] = useState<ColumnType[]>(defaultColumns);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [openDialogTaskId, setOpenDialogTaskId] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const { toast } = useToast();
  
  // Персональные настройки доски
  const boardId = parentTaskId ?? parentTask?.id ?? null;
  const { 
    settings: boardSettings, 
    updateSettings: updateBoardSettings,
    toggleCollapsedColumn,
    isLoading: isSettingsLoading 
  } = useBoardUserSettings(boardId);
  
  // Используем настройки из хука или дефолтные значения
  const sortBy = boardSettings?.sort_by ?? 'owner_first';
  const sortDirection = boardSettings?.sort_direction ?? 'desc';
  const filterByOwner = boardSettings?.filter_by_owner ?? null;
  const searchQuery = boardSettings?.search_query ?? '';
  const hideCompleted = boardSettings?.hide_completed ?? true;
  const viewMode = boardSettings?.view_mode ?? 'board';
  
  // Функции обновления настроек
  const setSortBy = (value: SortOption) => updateBoardSettings({ sort_by: value });
  const setSortDirection = (value: SortDirection) => updateBoardSettings({ sort_direction: value });
  const setFilterByOwner = (value: string | null) => updateBoardSettings({ filter_by_owner: value });
  const setSearchQuery = (value: string) => updateBoardSettings({ search_query: value });
  const setHideCompleted = (value: boolean) => updateBoardSettings({ hide_completed: value });
  const setViewMode = (value: "board" | "table" | "graph") => updateBoardSettings({ view_mode: value });
  
  // Загрузка информации о корне доски - ОДИН раз для всей доски
  const { rootTask: boardRootTask } = useBoardRootInfo(parentTaskId ?? parentTask?.id);
  
  // Получаем все taskIds для пакетной загрузки данных
  const allTaskIds = useMemo(() => {
    return columns.flatMap(col => col.tasks.map(t => t.id));
  }, [columns]);
  
  // Пакетная загрузка assignments, multi-parent данных и scores для всех задач доски
  const { assignmentsByTask, multiParentData, scoresByTask } = useBoardTasksData(allTaskIds);
  
  // Refs for debouncing and preventing duplicate loads
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReloadRef = useRef<number>(0);
  const isLoadingRef = useRef(false);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Debounced reload function to prevent rapid successive reloads
  const debouncedReload = useCallback(() => {
    const now = Date.now();
    // Минимальный интервал между перезагрузками - 2 секунды
    const minInterval = 2000;

    if (now - lastReloadRef.current < minInterval) {
      // Если прошло меньше 2 секунд, планируем отложенную перезагрузку
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
      reloadTimeoutRef.current = setTimeout(() => {
        lastReloadRef.current = Date.now();
        loadTasks();
      }, minInterval);
      return;
    }

    lastReloadRef.current = now;
    loadTasks();
  }, [parentTaskId, parentTask?.id]);

  // Load tasks from database
  useEffect(() => {
    loadTasks();

    // Realtime subscription для автообновления задач
    const tasksChannel = supabase
      .channel('board-tasks-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload: any) => {
          // Обновляем только если изменение касается текущего board
          const currentParentId = parentTaskId ?? parentTask?.id;
          if (!currentParentId) return;
          const changedTaskId = payload.new?.id || payload.old?.id;
          
          // Проверяем, является ли изменённая задача дочерней для текущего родителя
          // или самим родителем (для обновления колонок)
          if (changedTaskId === currentParentId) {
            debouncedReload();
          } else {
            // Для дочерних задач - обновляем локально (UPDATE) или делаем reload (INSERT/DELETE)
            const newData = payload.new;
            if (newData && payload.eventType === 'UPDATE') {
              setColumns(prevColumns =>
                prevColumns.map(col => ({
                  ...col,
                  tasks: col.tasks.map(task =>
                    task.id === changedTaskId
                      ? {
                          ...task,
                          title: newData.title ?? task.title,
                          content: newData.content ?? task.content,
                          priority: newData.priority ?? task.priority,
                          start_date: newData.start_date ?? task.start_date,
                          end_date: newData.end_date ?? task.end_date,
                          planned_hours: newData.planned_hours ?? task.planned_hours,
                          owner_id: newData.owner_id ?? task.owner_id,
                          updated_at: newData.updated_at ?? task.updated_at,
                          columnId: newData.column_id ?? task.columnId,
                        }
                      : task
                  )
                }))
              );
            } else {
              // Для INSERT/DELETE - перезагружаем с debounce
              debouncedReload();
            }
          }
        }
      )
      .subscribe();

    // Realtime subscription для task_relations
    const relationsChannel = supabase
      .channel('board-relations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_relations',
        },
        (payload: any) => {
          const currentParentId = parentTaskId ?? parentTask?.id;
          if (!currentParentId) return;
          // Перезагружаем только если изменение связано с текущим родителем
          if (payload.new?.parent_id === currentParentId || 
              payload.old?.parent_id === currentParentId ||
              payload.new?.child_id === currentParentId ||
              payload.old?.child_id === currentParentId) {
            debouncedReload();
          }
        }
      )
      .subscribe();

    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(relationsChannel);
    };
  }, [parentTaskId, parentTask, debouncedReload]);

  // Apply user's collapsed columns from settings when they change
  useEffect(() => {
    if (!boardSettings?.collapsed_columns) return;
    
    setColumns(prevColumns => 
      prevColumns.map(col => ({
        ...col,
        collapsed: boardSettings.collapsed_columns.includes(col.id),
      }))
    );
  }, [boardSettings?.collapsed_columns]);

  const loadTasks = async () => {
    const currentParentId = parentTaskId ?? parentTask?.id;
    if (!currentParentId) return;

    // Prevent concurrent loads
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    try {
      // First, fetch parent task data to check if it's a personal board with auto-load
      const { data: parentTaskData, error: parentError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", currentParentId)
        .single();
      
      if (parentError) throw parentError;
      
      const isPersonalBoardWithAutoLoad = 
        parentTaskData?.task_type === 'personal_board' && 
        parentTaskData?.auto_load_my_tasks === true;
      
      let childIds: string[] = [];
      let allTaskIds: string[] = [];
      let grandchildRelations: { parent_id: string; child_id: string }[] = [];
      
      // Determine board owner: use owner_id, or fallback to task_assignments
      let boardOwnerId = parentTaskData?.owner_id;
      if (!boardOwnerId && isPersonalBoardWithAutoLoad) {
        const { data: boardAssignment } = await supabase
          .from("task_assignments")
          .select("user_id")
          .eq("task_id", currentParentId)
          .limit(1)
          .maybeSingle();
        boardOwnerId = boardAssignment?.user_id || null;
      }
      
      if (isPersonalBoardWithAutoLoad && boardOwnerId) {
        // For personal board: load tasks where user is owner or participant
        
        // Get tasks where user is owner
        const { data: ownedTasks } = await supabase
          .from("tasks")
          .select("id, task_type")
          .eq("owner_id", boardOwnerId)
          .neq("id", currentParentId)
          .neq("task_type", "personal_board");
        
        // Get tasks where user is assigned
        const { data: assignedTasks } = await supabase
          .from("task_assignments")
          .select("task_id")
          .eq("user_id", boardOwnerId);
        
        const ownedIds = (ownedTasks || []).map(t => t.id);
        const assignedIds = (assignedTasks || []).map(a => a.task_id);
        
        // Merge and deduplicate, excluding personal board itself
        childIds = [...new Set([...ownedIds, ...assignedIds])].filter(id => id !== currentParentId);
        
        // Also get existing task_relations children (manually added)
        const { data: manualRelations } = await supabase
          .from("task_relations")
          .select("child_id")
          .eq("parent_id", currentParentId);
        
        const manualChildIds = (manualRelations || []).map(r => r.child_id);
        childIds = [...new Set([...childIds, ...manualChildIds])];
        
        // Fetch grandchildren for subtasks display
        const { data: grandchildData } = await supabase
          .from("task_relations")
          .select("parent_id, child_id")
          .in("parent_id", childIds);
        
        grandchildRelations = grandchildData || [];
        const grandchildIds = grandchildRelations.map(r => r.child_id);
        allTaskIds = [...new Set([currentParentId, ...childIds, ...grandchildIds])];
      } else {
        // Standard behavior: load via task_relations
        const { data: childRelations, error: relError } = await supabase
          .from("task_relations")
          .select("child_id")
          .eq("parent_id", currentParentId);
        
        if (relError) throw relError;
        
        childIds = (childRelations || []).map(r => r.child_id);
        
        // Fetch grandchildren for subtasks display
        const { data: grandchildData } = await supabase
          .from("task_relations")
          .select("parent_id, child_id")
          .in("parent_id", childIds);
        
        grandchildRelations = grandchildData || [];
        const grandchildIds = grandchildRelations.map(r => r.child_id);
        allTaskIds = [...new Set([currentParentId, ...childIds, ...grandchildIds])];
      }
      
      // Fetch only needed tasks
      const { data, error } = await retryWithBackoff(async () => {
        const result = await supabase
          .from("tasks")
          .select("*")
          .in("id", allTaskIds);
        
        if (result.error) throw result.error;
        return result;
      });

      if (error) throw error;

      if (data) {
        // Get custom columns from parent task (already loaded above for personal board check)
        let columnsToUse = defaultColumns;
        
        // parentTaskData is already fetched above, use it from data array for consistency
        const currentParentData = data.find((t) => t.id === currentParentId) || parentTaskData;
        if (currentParentData?.custom_columns && Array.isArray(currentParentData.custom_columns)) {
          columnsToUse = (currentParentData.custom_columns as any[]).map((col: any) => ({
            id: col.id,
            title: col.title,
            collapsed: col.collapsed || false,
            color: col.color,
            tasks: [],
          }));
        }

        // Build hierarchy using task_relations
        const allTasks: Task[] = data.map((task) => ({
          id: task.id,
          title: task.title,
          content: task.content,
          columnId: task.column_id,
          position: task.position ?? undefined,
          subtaskOrder: task.subtask_order,
          subtasks: [],
          priority: task.priority,
          start_date: task.start_date,
          end_date: task.end_date,
          owner_id: task.owner_id,
          task_type: task.task_type === 'standard' ? 'standup' : task.task_type,
          planned_hours: task.planned_hours,
          updated_at: task.updated_at,
          created_at: task.created_at,
        }));

        // Build relations map from grandchildRelations
        const parentChildMap = new Map<string, string[]>();
        (grandchildRelations || []).forEach((rel) => {
          const children = parentChildMap.get(rel.parent_id) || [];
          children.push(rel.child_id);
          parentChildMap.set(rel.parent_id, children);
        });

        // Filter tasks based on parentTaskId (default to ROOT_TASK_ID)
        const parentTasks = allTasks.filter((t) => childIds.includes(t.id));
        
        // Attach subtasks to parent tasks and sync their stages
        for (const parent of parentTasks) {
          const subtaskIds = parentChildMap.get(parent.id) || [];
          const subtasks = allTasks.filter((t) => subtaskIds.includes(t.id));
          // Sort subtasks by updated_at (most recent first)
          parent.subtasks = [...subtasks].sort((a, b) => {
            const aUpdated = data.find(t => t.id === a.id)?.updated_at || '';
            const bUpdated = data.find(t => t.id === b.id)?.updated_at || '';
            return new Date(bUpdated).getTime() - new Date(aUpdated).getTime();
          });

          // Find parent's stage title
          const parentStage = columnsToUse.find(col => col.id === parent.columnId);
          if (parentStage) {
            // Sync each subtask to parent's stage if subtask has that stage
            for (const subtask of subtasks) {
              const subtaskData = data.find(t => t.id === subtask.id);
              if (subtaskData && Array.isArray(subtaskData.custom_columns)) {
                const matchingStage = subtaskData.custom_columns.find(
                  (col: any) => col.title === parentStage.title
                ) as { id: string; title: string } | undefined;
                if (matchingStage && subtask.columnId !== matchingStage.id) {
                  // Update subtask's column_id to match parent's stage
                  await supabase
                    .from("tasks")
                    .update({ column_id: matchingStage.id })
                    .eq("id", subtask.id);
                  
                  // Update in memory
                  subtask.columnId = matchingStage.id;
                }
              }
            }
          }
        }

        // Create tasksByColumn using custom columns
        const tasksByColumn: { [key: string]: Task[] } = {};
        columnsToUse.forEach((col) => {
          tasksByColumn[col.id] = [];
        });

        // For personal board with auto-load, use smart placement
        if (isPersonalBoardWithAutoLoad) {
          parentTasks.forEach((task) => {
            // Smart column assignment based on task properties
            let targetColumnId: string;
            
            // Projects go to "my_projects" column if it exists
            const hasSubtasks = task.subtasks && task.subtasks.length > 0;
            const isProject = hasSubtasks || task.task_type === 'function';
            const myProjectsColumn = columnsToUse.find(c => c.id === 'my_projects');
            
            if (isProject && myProjectsColumn) {
              targetColumnId = 'my_projects';
            } else if (tasksByColumn[task.columnId]) {
              // Use task's own column_id if it exists in our columns
              targetColumnId = task.columnId;
            } else {
              // Map common column names to our standard columns
              const colLower = task.columnId.toLowerCase();
              if (colLower.includes('done') || colLower.includes('готов')) {
                targetColumnId = columnsToUse.find(c => c.id === 'done')?.id || columnsToUse[0]?.id || 'todo';
              } else if (colLower.includes('progress') || colLower.includes('работ')) {
                targetColumnId = columnsToUse.find(c => c.id === 'inprogress')?.id || columnsToUse[0]?.id || 'todo';
              } else if (colLower.includes('archiv') || colLower.includes('архив')) {
                targetColumnId = columnsToUse.find(c => c.id === 'archive')?.id || columnsToUse[0]?.id || 'todo';
              } else {
                // Default to todo
                targetColumnId = columnsToUse.find(c => c.id === 'todo')?.id || columnsToUse[0]?.id || 'todo';
              }
            }
            
            if (tasksByColumn[targetColumnId]) {
              tasksByColumn[targetColumnId].push(task);
            } else {
              const firstColumnId = columnsToUse[0]?.id;
              if (firstColumnId && tasksByColumn[firstColumnId]) {
                tasksByColumn[firstColumnId].push(task);
              }
            }
          });
        } else {
          // Standard behavior
          parentTasks.forEach((task) => {
            if (tasksByColumn[task.columnId]) {
              tasksByColumn[task.columnId].push(task);
            } else {
              const firstColumnId = columnsToUse[0]?.id;
              if (firstColumnId) {
                tasksByColumn[firstColumnId].push(task);
              }
            }
          });
        }

        // Ensure stable manual order by `position`.
        for (const colId of Object.keys(tasksByColumn)) {
          tasksByColumn[colId].sort((a, b) => {
            const ap = a.position ?? Number.MAX_SAFE_INTEGER;
            const bp = b.position ?? Number.MAX_SAFE_INTEGER;
            if (ap !== bp) return ap - bp;
            const au = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const bu = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return bu - au;
          });
        }

        // Apply user's personal collapsed columns from boardSettings
        const userCollapsedColumns = boardSettings?.collapsed_columns || [];
        
        setColumns(columnsToUse.map((col) => ({
          ...col,
          // User's personal collapsed state takes priority over global
          collapsed: userCollapsedColumns.includes(col.id) ? true : (col.collapsed || false),
          tasks: tasksByColumn[col.id] || [],
        })));
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      const isNetworkError = error instanceof Error && 
        (error.message.includes("fetch") || error.message.includes("Failed to fetch"));
      
      toast({
        title: isNetworkError ? "Ошибка сети" : "Ошибка",
        description: isNetworkError 
          ? "Не удалось загрузить задачи. Проверьте подключение к интернету." 
          : "Не удалось загрузить задачи",
        variant: "destructive",
      });
    } finally {
      isLoadingRef.current = false;
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [activeBadgeTask, setActiveBadgeTask] = useState<Task | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    
    // Handle mini-badge drag
    if (activeData?.type === "mini-badge") {
      setActiveBadgeTask(activeData.task as Task);
      setActiveTask(null);
      return;
    }
    
    // Handle regular task drag
    const task = columns
      .flatMap((col) => col.tasks)
      .find((task) => task.id === active.id);
    if (task) {
      setActiveTask(task);
      setActiveBadgeTask(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setActiveBadgeTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle column reordering
    if (activeData?.type === "column" && overData?.type === "column") {
      const oldIndex = columns.findIndex((col) => col.id === activeId);
      const newIndex = columns.findIndex((col) => col.id === overId);
      
      if (oldIndex !== newIndex) {
        const newColumns = arrayMove(columns, oldIndex, newIndex);
        setColumns(newColumns);
        
        // Save new column order to database
        if (parentTask?.id || parentTaskId) {
          try {
            const columnsData = newColumns.map(col => ({
              id: col.id,
              title: col.title,
              collapsed: col.collapsed || false,
              color: col.color,
            }));

            const targetTaskId = parentTask?.id || parentTaskId;
            const { error } = await supabase
              .from("tasks")
              .update({ custom_columns: columnsData })
              .eq("id", targetTaskId);

            if (error) throw error;

            toast({
              title: "Успешно",
              description: "Порядок колонок сохранён",
            });
          } catch (error) {
            console.error("Error saving column order:", error);
            toast({
              title: "Ошибка",
              description: "Не удалось сохранить порядок колонок",
              variant: "destructive",
            });
            loadTasks();
          }
        }
      }
      return;
    }

    // Handle dropping mini-badge (from MiniBoard) onto a task card
    if (activeData?.type === "mini-badge") {
      const badgeTask = activeData.task as Task;
      const oldParentId = activeData.parentTaskId as string;
      
      // Dropping onto a task to re-parent
      if (overData?.type === "task-dropzone") {
        const newParent = overData.task as Task;
        
        // Don't drop onto the same parent or onto itself
        if (newParent.id === oldParentId || newParent.id === badgeTask.id) {
          return;
        }
        
        await moveSubtaskToNewParent(badgeTask.id, oldParentId, newParent.id);
        return;
      }
      
      // Dropping onto a mini-column (status change within same parent) - handled locally, no-op here
      if (overData?.type === "mini-column") {
        // Status changes are handled by onStatusChange prop
        return;
      }
      
      return;
    }

    // Handle dropping subtask
    if (activeData?.type === "subtask") {
      const subtask = activeData.task as Task;
      
      // Dropping onto a task to make it a child
      if (overData?.type === "task-dropzone") {
        const newParent = overData.task as Task;
        await moveTaskToParent(subtask.id, newParent.id);
        return;
      }
      
      // Dropping onto column to extract from parent
      if (overData?.type === "column") {
        await extractSubtaskToColumn(subtask.id, overId);
        return;
      }

      // Reordering within parent - simplified for now
      if (activeData.type === "subtask" && overData?.type === "subtask") {
        loadTasks();
      }
      return;
    }

    // Handle dropping regular task
    const activeTaskId = activeId;
    
    // Handle drop-indicator (inserting between cards)
    if (overData?.type === "drop-indicator") {
      const position = overData.position;
      const targetTask = overData.task as Task | undefined;
      const targetIndex = overData.index as number | undefined;
      const targetColumnId = overData.columnId as string | undefined;
      
      // Find source column and task
      const sourceColumn = columns.find((col) =>
        col.tasks.some((task) => task.id === activeTaskId)
      );
      if (!sourceColumn) return;
      
      const task = sourceColumn.tasks.find((t) => t.id === activeTaskId);
      if (!task) return;

      // Determine target column
      let destColumnId: string;
      let insertIndex: number;
      
      if (position === "end" && targetColumnId) {
        // Dropping at end of a specific column
        destColumnId = targetColumnId;
        const destColumn = columns.find(c => c.id === destColumnId);
        insertIndex = destColumn?.tasks.length ?? 0;
      } else if (position === "before" && targetTask) {
        // Dropping before a specific task
        const targetColumn = columns.find((col) =>
          col.tasks.some((t) => t.id === targetTask.id)
        );
        if (!targetColumn) return;
        destColumnId = targetColumn.id;
        insertIndex = targetIndex ?? 0;
      } else {
        return;
      }
      
      const destColumn = columns.find(c => c.id === destColumnId);
      if (!destColumn) return;

      // Compute next state deterministically (we'll also use it to persist positions).
      const nextColumns = columns.map((col) => {
        if (col.id === sourceColumn.id && col.id === destColumnId) {
          // Same column - reorder
          const tasksWithoutActive = col.tasks.filter((t) => t.id !== activeTaskId);
          const newTasks = [...tasksWithoutActive];
          const adjustedIndex = insertIndex > tasksWithoutActive.length ? tasksWithoutActive.length : insertIndex;
          newTasks.splice(adjustedIndex, 0, { ...task, columnId: destColumnId });
          return { ...col, tasks: newTasks };
        }
        if (col.id === sourceColumn.id) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== activeTaskId) };
        }
        if (col.id === destColumnId) {
          const newTasks = [...col.tasks];
          newTasks.splice(insertIndex, 0, { ...task, columnId: destColumnId });
          return { ...col, tasks: newTasks };
        }
        return col;
      });

      setColumns(nextColumns);

      try {
        // Persist column + full ordering (positions) to avoid UI saying “moved” but order snapping back.
        const nextSource = nextColumns.find(c => c.id === sourceColumn.id)?.tasks ?? [];
        const nextDest = nextColumns.find(c => c.id === destColumnId)?.tasks ?? [];

        // Ensure moved task has correct column_id as well.
        const { error } = await supabase
          .from("tasks")
          .update({ column_id: destColumnId })
          .eq("id", activeTaskId);
        if (error) throw error;

        await updateTaskPositions(nextSource);
        if (sourceColumn.id !== destColumnId) {
          await updateTaskPositions(nextDest);
        }
        
        toast({
          title: "Перемещено",
          description: "Задача перемещена",
        });
      } catch (error) {
        console.error("Error reordering task:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось переместить задачу",
          variant: "destructive",
        });
        loadTasks();
      }
      return;
    }
    
    // Dropping task into another task (nesting)
    if (overData?.type === "task-dropzone") {
      const parentTask = overData.task as Task;
      await moveTaskToParent(activeTaskId, parentTask.id);
      return;
    }

    // Dropping task into column (simple move to end)
    if (overData?.type === "column") {
      const sourceColumn = columns.find((col) =>
        col.tasks.some((task) => task.id === activeTaskId)
      );
      const targetColumn = columns.find((col) => col.id === overId);

      if (!sourceColumn || !targetColumn) return;

      const task = sourceColumn.tasks.find((t) => t.id === activeTaskId);
      if (!task) return;

      const nextColumns = columns.map((col) => {
        if (col.id === sourceColumn.id) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== activeTaskId) };
        }
        if (col.id === targetColumn.id) {
          return { ...col, tasks: [...col.tasks, { ...task, columnId: col.id }] };
        }
        return col;
      });

      setColumns(nextColumns);

      try {
        const { error } = await supabase
          .from("tasks")
          .update({ column_id: targetColumn.id })
          .eq("id", activeTaskId);
        if (error) throw error;

        const nextSource = nextColumns.find(c => c.id === sourceColumn.id)?.tasks ?? [];
        const nextDest = nextColumns.find(c => c.id === targetColumn.id)?.tasks ?? [];
        await updateTaskPositions(nextSource);
        if (sourceColumn.id !== targetColumn.id) {
          await updateTaskPositions(nextDest);
        }

        console.log(`Task ${activeTaskId} moved to column ${targetColumn.id} (${targetColumn.title})`);

        // Check if target column is a global stage and sync across boards
        await syncTaskToGlobalStage(activeTaskId, targetColumn.title);
        
        // Sync subtasks to matching stage if exists
        await syncSubtasksToParentStage(activeTaskId, targetColumn.title);
      } catch (error) {
        console.error("Error updating task:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось переместить задачу",
          variant: "destructive",
        });
        loadTasks();
      }
    }
  };

  const moveTaskToParent = async (taskId: string, parentId: string) => {
    try {
      const { error } = await supabase
        .from("task_relations")
        .insert({
          parent_id: parentId,
          child_id: taskId,
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Внимание",
            description: "Эта связь уже существует",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Успешно",
        description: "Задача добавлена как дочерняя",
      });

      loadTasks();
    } catch (error: any) {
      console.error("Error moving task to parent:", error);
      
      if (error.message?.includes("Circular dependency")) {
        toast({
          title: "Ошибка",
          description: "Обнаружена циклическая зависимость",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось переместить задачу",
          variant: "destructive",
        });
      }
    }
  };

  // Move subtask from one parent to another (for cross-card badge drag-drop)
  const moveSubtaskToNewParent = async (taskId: string, oldParentId: string, newParentId: string) => {
    try {
      // Remove relation from old parent
      const { error: deleteError } = await supabase
        .from("task_relations")
        .delete()
        .eq("parent_id", oldParentId)
        .eq("child_id", taskId);

      if (deleteError) throw deleteError;

      // Add relation to new parent
      const { error: insertError } = await supabase
        .from("task_relations")
        .insert({
          parent_id: newParentId,
          child_id: taskId,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          toast({
            title: "Внимание",
            description: "Эта связь уже существует",
          });
          return;
        }
        throw insertError;
      }

      toast({
        title: "Успешно",
        description: "Подзадача перемещена к другой задаче",
      });

      loadTasks();
    } catch (error: any) {
      console.error("Error moving subtask to new parent:", error);
      
      if (error.message?.includes("Circular dependency")) {
        toast({
          title: "Ошибка",
          description: "Обнаружена циклическая зависимость",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось переместить подзадачу",
          variant: "destructive",
        });
      }
    }
  };

  const extractSubtaskToColumn = async (taskId: string, columnId: string) => {
    try {
      const column = columns.find((col) => col.id === columnId);
      if (!column) return;

      // Remove all parent relations for this task
      const { error: deleteError } = await supabase
        .from("task_relations")
        .delete()
        .eq("child_id", taskId);

      if (deleteError) throw deleteError;

      // Update task column and position
      const { error } = await supabase
        .from("tasks")
        .update({ 
          column_id: columnId,
          position: column.tasks.length,
          subtask_order: 0,
        })
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Задача извлечена из родительских",
      });

      loadTasks();
    } catch (error) {
      console.error("Error extracting subtask:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось извлечь задачу",
        variant: "destructive",
      });
    }
  };

  const updateSubtaskOrder = async (subtasks: Task[]) => {
    try {
      for (let i = 0; i < subtasks.length; i++) {
        await supabase
          .from("tasks")
          .update({ subtask_order: i })
          .eq("id", subtasks[i].id);
      }
    } catch (error) {
      console.error("Error updating subtask order:", error);
    }
  };

  const syncTaskToGlobalStage = async (taskId: string, stageName: string) => {
    try {
      // Check if this stage is a global stage
      const { data: globalStage } = await supabase
        .from("global_stages")
        .select("title")
        .eq("title", stageName)
        .single();

      if (!globalStage) return; // Not a global stage, no sync needed

      // Find all boards (tasks with custom_columns) that have this global stage
      const { data: allBoards } = await supabase
        .from("tasks")
        .select("id, custom_columns")
        .not("custom_columns", "is", null);

      if (!allBoards) return;

      // Find the column ID for this global stage on each board
      for (const board of allBoards) {
        if (board.id === (parentTaskId || parentTask?.id)) continue; // Skip current board
        
        if (Array.isArray(board.custom_columns)) {
          const cols = board.custom_columns as Array<{id: string; title: string}>;
          const matchingCol = cols.find(c => c.title === stageName);
          
          if (matchingCol) {
            // Check if this task is a child of this board
            const { data: relation } = await supabase
              .from("task_relations")
              .select("*")
              .eq("parent_id", board.id)
              .eq("child_id", taskId)
              .single();

            // If task is related to this board, update its column
            if (relation) {
              await supabase
                .from("tasks")
                .update({ column_id: matchingCol.id })
                .eq("id", taskId);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error syncing task to global stage:", error);
    }
  };

  const syncSubtasksToParentStage = async (parentTaskId: string, stageName: string) => {
    try {
      // Get all subtasks of this parent task
      const { data: relations } = await supabase
        .from("task_relations")
        .select("child_id")
        .eq("parent_id", parentTaskId);

      if (!relations || relations.length === 0) return;

      const subtaskIds = relations.map(r => r.child_id);

      // Get subtasks data
      const { data: subtasks } = await supabase
        .from("tasks")
        .select("id, custom_columns")
        .in("id", subtaskIds);

      if (!subtasks) return;

      // For each subtask, check if it has a matching stage in its custom_columns
      for (const subtask of subtasks) {
        if (Array.isArray(subtask.custom_columns)) {
          const cols = subtask.custom_columns as Array<{id: string; title: string}>;
          const matchingCol = cols.find(c => c.title === stageName);
          
          if (matchingCol) {
            // Update subtask to this stage
            await supabase
              .from("tasks")
              .update({ column_id: matchingCol.id })
              .eq("id", subtask.id);

            // Also sync this subtask to global stage
            await syncTaskToGlobalStage(subtask.id, stageName);
          }
        }
      }
    } catch (error) {
      console.error("Error syncing subtasks to parent stage:", error);
    }
  };

  const handleSubtaskStatusChange = async (taskId: string, newColumnId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ column_id: newColumnId })
        .eq("id", taskId);

      if (error) throw error;

      // Sync to global stage if applicable
      const column = columns.find(col => col.id === newColumnId);
      if (column) {
        await syncTaskToGlobalStage(taskId, column.title);
      }

      loadTasks();

      toast({
        title: "Успешно",
        description: "Статус задачи обновлён",
      });
    } catch (error) {
      console.error("Error updating subtask status:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус",
        variant: "destructive",
      });
    }
  };

  const handleSubtaskDelete = async (taskId: string) => {
    await handleDeleteTask(taskId);
  };

  const handleSubtaskOpen = (taskId: string) => {
    const task = columns
      .flatMap((col) => col.tasks)
      .flatMap((t) => [t, ...(t.subtasks || [])])
      .find((t) => t.id === taskId);

    if (task) {
      toast({
        title: "Открытие задачи",
        description: task.title,
      });
    }
  };

  const updateTaskPositions = async (tasks: Task[]) => {
    try {
      const updates = tasks.map((task, index) => ({
        id: task.id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from("tasks")
          .update({ position: update.position })
          .eq("id", update.id);
      }
    } catch (error) {
      console.error("Error updating positions:", error);
    }
  };

  const handleAddTask = async (columnId: string, content: string) => {
    try {
      const column = columns.find((col) => col.id === columnId);
      const position = column ? column.tasks.length : 0;

      // Generate title using Project agent
      let generatedTitle = "Новая задача";
      try {
        const { data: agentData, error: agentError } = await supabase.functions.invoke("test-agent", {
          body: {
            agentId: "08b00fd7-4da4-4dc4-9cbe-fc4a3a434916", // Проджект agent ID
            input: content,
          },
        });

        if (!agentError && agentData?.output) {
          // Parse the response to extract title
          try {
            const parsed = JSON.parse(agentData.output);
            if (parsed.title) {
              generatedTitle = parsed.title;
            }
          } catch {
            // If parsing fails, use first 50 chars of content as title
            generatedTitle = content.slice(0, 50);
          }
        }
      } catch (agentError) {
        console.error("Error generating title with agent:", agentError);
        // Fallback: use first 50 chars of content
        generatedTitle = content.slice(0, 50);
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: generatedTitle,
          content: content,
          column_id: columnId,
          position,
          owner_id: currentUserId,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Create relation with parent task
        const currentParentId = parentTaskId ?? parentTask?.id;
        if (!currentParentId) {
          throw new Error("Не удалось определить родительскую задачу");
        }
        const { error: relationError } = await supabase
          .from("task_relations")
          .insert({
            parent_id: currentParentId,
            child_id: data.id,
          });

        if (relationError) throw relationError;

        // Automatically add creator as owner in task_assignments
        if (currentUserId) {
          await supabase
            .from("task_assignments")
            .insert({
              task_id: data.id,
              user_id: currentUserId,
              role: "owner",
            });
        }

        const newTask: Task = {
          id: data.id,
          title: data.title,
          content: data.content,
          columnId: data.column_id,
          priority: data.priority,
          start_date: data.start_date,
          end_date: data.end_date,
          owner_id: data.owner_id,
        };

        setColumns((cols) =>
          cols.map((col) =>
            col.id === columnId
              ? { ...col, tasks: [...col.tasks, newTask] }
              : col
          )
        );

        toast({
          title: "Успешно",
          description: "Задача создана с автоматическим названием",
        });
      }
    } catch (error) {
      console.error("Error adding task:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить задачу",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      setColumns((cols) =>
        cols.map((col) => ({
          ...col,
          tasks: col.tasks.filter((task) => task.id !== taskId),
        }))
      );
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить задачу",
        variant: "destructive",
      });
    }
  };

  const handleEditTask = async (taskId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ title: newTitle })
        .eq("id", taskId);

      if (error) throw error;

      setColumns((cols) =>
        cols.map((col) => ({
          ...col,
          tasks: col.tasks.map((task) =>
            task.id === taskId ? { ...task, title: newTitle } : task
          ),
        }))
      );
    } catch (error) {
      console.error("Error editing task:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить задачу",
        variant: "destructive",
      });
    }
  };

  // PATCH из TaskDialog (после сохранений в TaskContent): обновляем карточку сразу, без повторного запроса в БД
  const handleUpdateTaskLocal = useCallback((taskId: string, updates: Partial<Task>) => {
    setColumns((cols) =>
      cols.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
      }))
    );
  }, []);

  const handleColumnsUpdate = () => {
    loadTasks();
    onColumnsUpdate?.();
  };

  const handleToggleCollapse = async (columnId: string) => {
    // Сохраняем в персональные настройки пользователя
    toggleCollapsedColumn(columnId);
    
    // Также обновляем локальный state для UI
    const updatedColumns = columns.map(col =>
      col.id === columnId ? { ...col, collapsed: !col.collapsed } : col
    );
    
    setColumns(updatedColumns);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Toolbar - fixed height */}
        {parentTask && (
          <div className="flex items-center justify-between gap-2 px-4 py-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <ColumnEditor
                taskId={parentTask.id}
                customColumns={parentTask.custom_columns}
                onColumnsUpdate={handleColumnsUpdate}
              />
              <GenerateEmbeddingsButton />
              <div className="flex items-center gap-1 border-l pl-2 ml-2">
                <Button
                  size="sm"
                  variant={viewMode === "board" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("board")}
                  className="h-8"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("table")}
                  className="h-8"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "graph" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("graph")}
                  className="h-8"
                >
                  <Network className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {viewMode === "table" && (
                <TaskBulkActions
                  selectedTasks={selectedTasks}
                  onActionsComplete={() => {
                    setSelectedTasks([]);
                    loadTasks();
                  }}
                />
              )}
              <BoardFilters
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortChange={setSortBy}
                onSortDirectionChange={setSortDirection}
                filterByOwner={filterByOwner}
                onOwnerFilterChange={setFilterByOwner}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                hideCompleted={hideCompleted}
                onHideCompletedChange={setHideCompleted}
              />
            </div>
          </div>
        )}
        
        {/* Content area - fills remaining space */}
        <div className="flex-1 min-h-0 px-4 pb-2">
          {viewMode === "table" ? (
            <TaskTable
              tasks={columns.flatMap(col => {
                if (hideCompleted) {
                  const columnTitle = col.title.toLowerCase();
                  const isCompletedColumn = columnTitle === 'done' || columnTitle.includes('архив') || columnTitle.includes('archive');
                  if (isCompletedColumn) {
                    return [];
                  }
                }
                return col.tasks;
              })}
              columns={columns.map(c => ({ id: c.id, title: c.title, color: c.color }))}
              onTaskClick={(task) => setOpenDialogTaskId(task.id)}
              onDrillDown={onDrillDown}
              selectedTasks={selectedTasks}
              onSelectionChange={setSelectedTasks}
            />
          ) : viewMode === "graph" ? (
            <TaskGraph
              tasks={columns.flatMap(col => {
                if (hideCompleted) {
                  const columnTitle = col.title.toLowerCase();
                  const isCompletedColumn = columnTitle === 'done' || columnTitle.includes('архив') || columnTitle.includes('archive');
                  if (isCompletedColumn) {
                    return [];
                  }
                }
                return col.tasks;
              })}
              onTaskClick={(task) => setOpenDialogTaskId(task.id)}
            />
          ) : (
            <SortableContext items={columns.map((c) => c.id)}>
              <div className="flex gap-3 h-full overflow-x-auto overflow-y-auto scrollbar-thin">
                {columns.map((column) => (
                <SortableContext key={column.id} items={column.tasks.map((t) => t.id)}>
                  <Column
                    column={column}
                    onAddTask={handleAddTask}
                    onDeleteTask={handleDeleteTask}
                    onEditTask={handleEditTask}
                    onUpdateTask={handleUpdateTaskLocal}
                    onSubtaskStatusChange={handleSubtaskStatusChange}
                    onSubtaskDelete={handleSubtaskDelete}
                    onSubtaskOpen={handleSubtaskOpen}
                    onDrillDown={onDrillDown}
                    onToggleCollapse={handleToggleCollapse}
                    availableColumns={columns.map(c => ({ id: c.id, title: c.title, color: c.color }))}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    filterByOwner={filterByOwner}
                    searchQuery={searchQuery}
                    hideCompleted={hideCompleted}
                    openDialogTaskId={openDialogTaskId}
                    onOpenDialog={setOpenDialogTaskId}
                    currentBoardRootId={boardRootTask?.id}
                    assignmentsByTask={assignmentsByTask}
                    multiParentData={multiParentData}
                    scoresByTask={scoresByTask}
                    activeTaskId={activeTask?.id}
                  />
                </SortableContext>
              ))}
              </div>
            </SortableContext>
          )}
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 150, easing: "ease-out" }}>
        {activeTask ? (
          <div className="rotate-3 opacity-80">
            <TaskCard
              task={activeTask}
              onDelete={() => {}}
              onEdit={() => {}}
              onSubtaskStatusChange={() => {}}
              onSubtaskDelete={() => {}}
              onSubtaskOpen={() => {}}
            />
          </div>
        ) : activeBadgeTask ? (
          <div className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full border-2 border-primary bg-primary/20 text-xs font-medium shadow-lg cursor-grabbing rotate-2 scale-105">
            <span className="whitespace-nowrap">
              {activeBadgeTask.title.length > 15 
                ? activeBadgeTask.title.slice(0, 15) + ".." 
                : activeBadgeTask.title}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default Board;
