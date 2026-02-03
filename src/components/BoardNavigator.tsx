import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useSearchParams } from "react-router-dom";
import Board from "./Board";
import { Task } from "@/types/kanban";
import { supabase } from "@/integrations/supabase/client";
import { TaskContent } from "./TaskContent";
import { usePinnedTasks } from "@/hooks/usePinnedTasks";
import { useToast } from "@/hooks/use-toast";
import { retryWithBackoff } from "@/lib/retryUtils";
import { Button } from "./ui/button";
import { Maximize2, Minimize2, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BoardHeader } from "./BoardHeader";

const mapTaskFromDB = (data: any): Task => ({
  id: data.id,
  title: data.title,
  content: data.content,
  columnId: data.column_id,
  subtaskOrder: data.subtask_order,
  subtasks: [],
  is_root: data.is_root,
  custom_columns: data.custom_columns,
  priority: data.priority,
  start_date: data.start_date,
  end_date: data.end_date,
  owner_id: data.owner_id,
  planned_hours: data.planned_hours,
  task_type: data.task_type,
  recurrence_type: data.recurrence_type,
  recurrence_days: data.recurrence_days,
  default_content: data.default_content,
  last_recurrence_update: data.last_recurrence_update,
  use_custom_settings: data.use_custom_settings,
  custom_template: data.custom_template,
  custom_quality_criteria: data.custom_quality_criteria,
  updated_at: data.updated_at,
  pitch: data.pitch,
});

export interface BoardNavigatorHandle {
  getRootTask: () => Task | null;
  navigateToRoot: (task: Task) => void;
}

type ContentViewMode = "compact" | "expanded";

const BoardNavigator = forwardRef<BoardNavigatorHandle, {}>((_, ref) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [navigationStack, setNavigationStack] = useState<Task[]>([]);
  const [navigationHistory, setNavigationHistory] = useState<Task[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [rootTask, setRootTask] = useState<Task | null>(null);
  const [contentViewMode, setContentViewMode] = useState<ContentViewMode>("compact");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isNavigatingRef = useRef(false);
  const lastTaskIdRef = useRef<string | null>(null);
  const { pinTask, unpinTask, isPinned } = usePinnedTasks();
  const { toast } = useToast();

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getRootTask: () => rootTask,
    navigateToRoot: (task: Task) => handleNavigateToRoot(task),
  }));

  useEffect(() => {
    loadRootTask();
  }, []);

  // Restore navigation from URL or localStorage
  useEffect(() => {
    // Wait for rootTask to be loaded and don't process during active navigation
    if (!rootTask || isNavigatingRef.current) return;
    
    let taskId = searchParams.get('task');
    
    // If no taskId in URL and this is first load, try to restore from localStorage
    if (!taskId && !isInitialized) {
      const lastTaskId = localStorage.getItem('lastTaskId');
      if (lastTaskId) {
        taskId = lastTaskId;
        setSearchParams({ task: lastTaskId }, { replace: true });
      }
    }
    
    // Check if taskId has changed or first initialization
    const isFirstInit = !isInitialized && taskId === null && lastTaskIdRef.current === null;
    if (taskId !== lastTaskIdRef.current || isFirstInit) {
      lastTaskIdRef.current = taskId;
      
      if (taskId) {
        restoreNavigationFromUrl(taskId);
        if (!isInitialized) setIsInitialized(true);
      } else {
        setNavigationStack([rootTask]);
        setIsLoading(false);
        if (!isInitialized) setIsInitialized(true);
      }
    }
  }, [searchParams, rootTask, isInitialized]);

  // Update URL when navigation changes and save last task to localStorage
  useEffect(() => {
    // Don't update URL while navigation is in progress
    if (isNavigatingRef.current) return;
    
    if (isInitialized && navigationStack.length > 0) {
      const currentTask = navigationStack[navigationStack.length - 1];
      setSearchParams({ task: currentTask.id }, { replace: true });
      localStorage.setItem('lastTaskId', currentTask.id);
    }
  }, [navigationStack, isInitialized, setSearchParams]);

  const loadRootTask = async (taskId?: string): Promise<Task | null> => {
    try {
      setIsLoading(true);
      const { data, error } = await retryWithBackoff(async () => {
        if (taskId) {
          // Load specific task
          const result = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();
          
          if (result.error) throw result.error;
          return result;
        } else {
          // Load Cloved root task by default
          const clovedResult = await supabase
            .from('tasks')
            .select('*')
            .eq('is_root', true)
            .ilike('title', '%Cloved%')
            .limit(1)
            .maybeSingle();
          
          // If Cloved not found, load first root task
          if (!clovedResult.data) {
            const result = await supabase
              .from('tasks')
              .select('*')
              .eq('is_root', true)
              .order('created_at', { ascending: true })
              .limit(1)
              .maybeSingle();
            
            // If no root task exists at all, create a default one
            if (!result.data) {
              const { data: user } = await supabase.auth.getUser();
              const { data: newRoot, error: createError } = await supabase
                .from('tasks')
                .insert({
                  title: 'Мои задачи',
                  content: '<p>Добро пожаловать! Это ваша корневая доска задач.</p>',
                  column_id: 'backlog',
                  is_root: true,
                  task_type: 'task',
                  owner_id: user?.user?.id || null,
                })
                .select()
                .single();
              
              if (createError) throw createError;
              return { data: newRoot, error: null };
            }
            
            if (result.error) throw result.error;
            return result;
          } else {
            if (clovedResult.error) throw clovedResult.error;
            return clovedResult;
          }
        }
      });

      if (error) throw error;

      if (data) {
        const task = mapTaskFromDB(data);
        setRootTask(task);
        return task;
      }

      return null;
    } catch (error) {
      console.error('Error loading root task:', error);
      toast({
        title: "Ошибка сети",
        description: "Не удалось загрузить корневую задачу. Проверьте подключение к интернету.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const restoreNavigationFromUrl = async (taskId: string) => {
    isNavigatingRef.current = true;
    setIsLoading(true);
    
    try {
      // Check if the task is a root task
      const { data: taskData } = await supabase
        .from('tasks')
        .select('is_root')
        .eq('id', taskId)
        .single();

      if (taskData?.is_root) {
        const loadedRoot = await loadRootTask(taskId);
        if (loadedRoot) {
          setNavigationStack([loadedRoot]);
          setNavigationHistory([]);
          setHistoryIndex(-1);
        }
        return;
      }

      // Build path from root to target task
      const path: Task[] = [];
      let currentTaskId = taskId;
      let foundRoot = false;
      let rootForStack: Task | null = null;
      
      while (currentTaskId && !foundRoot) {
        try {
          const { data: innerTaskData, error: taskError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', currentTaskId)
            .single();

          if (taskError) throw taskError;

          if (innerTaskData) {
            const currentTask = mapTaskFromDB(innerTaskData);
            
            // If this is the root, load it and stop.
            if (innerTaskData.is_root) {
              rootForStack = (await loadRootTask(innerTaskData.id)) ?? currentTask;
              foundRoot = true;
              break;
            }
            
            // Otherwise add to path and walk up.
            path.unshift(currentTask);

            const { data: relations, error: relError } = await supabase
              .from('task_relations')
              .select('parent_id')
              .eq('child_id', currentTaskId)
              .limit(1)
              .maybeSingle();

            if (relError) throw relError;

            if (relations?.parent_id) {
              currentTaskId = relations.parent_id;
            } else {
              break;
            }
          } else {
            break;
          }
        } catch (error) {
          console.error('Error restoring navigation:', error);
          break;
        }
      }

      const baseRoot = rootForStack ?? rootTask;
      if (baseRoot) {
        setNavigationStack([baseRoot, ...path]);
      } else if (path.length > 0) {
        setNavigationStack(path);
      }
    } finally {
      isNavigatingRef.current = false;
      setIsLoading(false);
    }
  };

  const currentParent = navigationStack[navigationStack.length - 1];

  const handleParentRelationChange = async () => {
    // Сначала перезагружаем данные текущей задачи
    if (currentParent) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', currentParent.id)
          .single();
        
        if (!error && data) {
          const updatedTask = mapTaskFromDB(data);
          setNavigationStack(prev => 
            prev.map(t => t.id === updatedTask.id ? updatedTask : t)
          );
        }
      } catch (error) {
        console.error('Error reloading current task:', error);
      }
    }
    
    // Затем восстанавливаем путь навигации если это не root
    if (currentParent && currentParent.id !== rootTask?.id) {
      await restoreNavigationFromUrl(currentParent.id);
    }
  };

  const handleDrillDown = async (task: Task) => {
    // Build full path from root to target task using task_relations
    const path: Task[] = [];
    let currentTaskId = task.id;
    
    // Build path backwards from task to root
    let foundRoot = false;
    while (currentTaskId && !foundRoot) {
      try {
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', currentTaskId)
          .single();

        if (taskError) throw taskError;

        if (taskData) {
          const currentTask = mapTaskFromDB(taskData);
          
          // Check if this task is a root task
          if (taskData.is_root) {
            path.unshift(currentTask);
            await loadRootTask(taskData.id);
            foundRoot = true;
            break;
          }
          
          path.unshift(currentTask);

          // Find parent through task_relations
          const { data: relations, error: relError } = await supabase
            .from('task_relations')
            .select('parent_id')
            .eq('child_id', currentTaskId)
            .limit(1)
            .maybeSingle();

          if (relError) throw relError;

          if (relations?.parent_id) {
            currentTaskId = relations.parent_id;
          } else {
            break;
          }
        } else {
          break;
        }
      } catch (error) {
        console.error('Error loading parent task:', error);
        break;
      }
    }
    
    // Set navigation stack to root + full path
    if (rootTask) {
      setNavigationStack([rootTask, ...path]);
    }
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    setNavigationStack(prev => 
      prev.map(t => t.id === taskId ? { ...t, ...updates } : t)
    );
  };

  const handleColumnsUpdate = async () => {
    // Reload current task to get updated custom_columns
    if (currentParent) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', currentParent.id)
          .single();

        if (error) throw error;

        if (data) {
          const updatedTask = mapTaskFromDB(data);
          
          setNavigationStack(prev =>
            prev.map(t => t.id === updatedTask.id ? updatedTask : t)
          );
        }
      } catch (error) {
        console.error('Error reloading task after columns update:', error);
      }
    }
  };

  const handleNavigateBack = () => {
    if (navigationStack.length <= 1) return;
    
    // Сохраняем текущее состояние в историю
    const newHistory = navigationHistory.slice(0, historyIndex + 1);
    newHistory.push(navigationStack);
    setNavigationHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    setNavigationStack(navigationStack.slice(0, -1));
  };

  const handleNavigateForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      const nextState = navigationHistory[historyIndex + 1];
      setNavigationStack(nextState);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleTaskSearch = async (task: Task) => {
    // Navigate to the found task
    await restoreNavigationFromUrl(task.id);
  };

  const handleNavigateToRoot = async (task: Task) => {
    // Prevent race conditions during rapid switching
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    
    try {
      const loadedRoot = await loadRootTask(task.id);
      const nextRoot = loadedRoot ?? task;
      
      // Reset navigation stack to just the new root
      setNavigationStack([nextRoot]);
      setNavigationHistory([]);
      setHistoryIndex(-1);
      
      // Update URL and localStorage
      setSearchParams({ task: nextRoot.id }, { replace: true });
      localStorage.setItem('lastTaskId', nextRoot.id);
      lastTaskIdRef.current = nextRoot.id;
    } finally {
      isNavigatingRef.current = false;
    }
  };

  const handleNavigateToLevel = (index: number) => {
    setNavigationStack(navigationStack.slice(0, index + 1));
  };

  const handlePinTask = () => {
    if (!currentParent) return;
    
    const emoji = currentParent.content?.match(/^[\\p{Emoji}]/u)?.[0];
    
    if (isPinned(currentParent.id)) {
      unpinTask(currentParent.id);
      toast({
        title: "Открепили задачу",
        description: currentParent.title,
      });
    } else {
      pinTask({
        id: currentParent.id,
        title: currentParent.title,
        emoji,
      });
      toast({
        title: "Закрепили задачу",
        description: currentParent.title,
      });
    }
  };

  const toggleContentView = () => {
    setContentViewMode((prev) => prev === "compact" ? "expanded" : "compact");
  };

  const isNotRoot = navigationStack.length > 1;

  const handleNavigateHome = () => {
    // Clear navigation and switch to dashboard
    setSearchParams({}, { replace: true });
    localStorage.removeItem('lastTaskId');
    // Dispatch event to switch view mode
    window.dispatchEvent(new CustomEvent('navigateHome'));
  };

  // Show loading spinner while loading root task or navigating
  if (isLoading || !currentParent) {
    return (
      <div className="h-[calc(100vh-52px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="h-[calc(100vh-52px)] flex flex-col overflow-hidden">

      {/* Task Content Panel - collapsible */}
      {currentParent && isNotRoot && (
        <>
          {contentViewMode === "compact" ? (
            <div className="bg-card/80 border-b border-border/50 flex-shrink-0">
              <BoardHeader 
                task={currentParent} 
                onExpand={() => setContentViewMode("expanded")}
                navigationStack={navigationStack}
                onNavigate={(_, index) => handleNavigateToLevel(index)}
                rootTask={rootTask}
                onRootSelect={handleNavigateToRoot}
              />
            </div>
          ) : (
            <div className="bg-card border-b border-border flex-shrink-0">
              <div className="px-4 py-3">
                <TaskContent
                  key={currentParent.id}
                  task={currentParent}
                  onUpdate={handleTaskUpdate}
                  onDrillDown={handleDrillDown}
                  navigationStack={navigationStack}
                  rootTask={rootTask}
                  onRootSelect={handleNavigateToRoot}
                  onNavigate={(_, index) => handleNavigateToLevel(index)}
                  onNavigateBack={handleNavigateBack}
                  onNavigateForward={handleNavigateForward}
                  canNavigateBack={navigationStack.length > 1}
                  canNavigateForward={historyIndex < navigationHistory.length - 1}
                  onTaskSearch={handleTaskSearch}
                  onRelationChange={handleParentRelationChange}
                  onClose={navigationStack.length > 1 ? handleNavigateBack : undefined}
                />
              </div>
              {/* Collapse button in expanded mode */}
              <div className="flex justify-center py-1 bg-secondary/30 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setContentViewMode("compact")}
                  className="h-6 px-3 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <ChevronDown className="h-3 w-3 rotate-180" />
                  Свернуть
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Board - scrollable area with fixed height */}
      <div className="flex-1 min-h-0 flex flex-col">
        <Board
          key={currentParent.id}
          parentTaskId={currentParent.id}
          parentTask={currentParent}
          onDrillDown={handleDrillDown}
          onColumnsUpdate={handleColumnsUpdate}
        />
      </div>
    </div>
  );
});

export default BoardNavigator;
