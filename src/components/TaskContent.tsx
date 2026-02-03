import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Task, TaskPriority } from "@/types/kanban";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { UnifiedEditor } from "@/components/editor/UnifiedEditor";
import { CollaborationUser } from "@/components/editor/CollaborationExtension";
import { useTaskVersions } from "@/hooks/useTaskVersions";
import { ParentChainBar } from "@/components/ParentChainBar";
import { ParentSuggestions } from "@/components/ParentSuggestions";
import { AgentTriggerButton } from "@/components/AgentTriggerButton";
import { TaskComments } from "@/components/TaskComments";
import { TaskMetadata } from "@/components/TaskMetadata";
import { TaskSubtasksRow } from "@/components/TaskSubtasksRow";
import { TaskHistoryDialog } from "@/components/TaskHistoryDialog";
import { Button } from "@/components/ui/button";
import { Activity, Sparkles, Info, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTaskLogs } from "@/hooks/useTaskLogs";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecurrenceType } from "@/types/kanban";
import { TemplateSettingsPopover } from "@/components/TemplateSettingsPopover";
import { getTaskTypeConfigs } from "@/components/TaskTypeEditor";
import { format } from "date-fns";
import { TaskAttachments } from "@/components/TaskAttachments";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TaskBadge from "@/components/TaskBadge";

interface TaskContentProps {
  task: Task;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDrillDown?: (task: Task) => void;
  onClose?: () => void;
  // Navigation props for BoardNavigator
  navigationStack?: Task[];
  rootTask?: Task | null;
  onRootSelect?: (task: Task) => void;
  onNavigate?: (task: Task, index: number) => void;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  canNavigateBack?: boolean;
  canNavigateForward?: boolean;
  onTaskSearch?: (task: Task) => void;
  onRelationChange?: () => void;
  className?: string;
}

interface Comment {
  id: string;
  task_id: string;
  content: string;
  created_at: string;
}

interface Column {
  id: string;
  title: string;
}

export interface TaskContentHandle {
  saveBeforeClose: () => Promise<void>;
}

// TYPING INDICATOR: Commented out to disable realtime typing
// interface ActiveUser {
//   user_id: string;
//   full_name: string | null;
//   avatar_url: string | null;
//   online_at: string;
//   is_typing?: boolean;
//   cursor_position?: { from: number; to: number };
// }

export const TaskContent = forwardRef<TaskContentHandle, TaskContentProps>(({
  task,
  onUpdate,
  onDrillDown,
  onClose,
  navigationStack,
  rootTask,
  onRootSelect,
  onNavigate,
  onNavigateBack,
  onNavigateForward,
  canNavigateBack,
  canNavigateForward,
  onTaskSearch,
  onRelationChange: externalOnRelationChange,
  className = "",
}, ref) => {
  const [title, setTitle] = useState(task.title);
  const [pitch, setPitch] = useState<string | null>(task.pitch || null);
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [content, setContent] = useState(task.content);
  const [comments, setComments] = useState<Comment[]>([]);
  const [parentTasks, setParentTasks] = useState<Task[]>([]);
  const [loadedRootTask, setLoadedRootTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority>(task.priority || "none");
  const [startDate, setStartDate] = useState<Date | null>(task.start_date ? new Date(task.start_date) : null);
  const [endDate, setEndDate] = useState<Date | null>(task.end_date ? new Date(task.end_date) : null);
  const [plannedHours, setPlannedHours] = useState<number | null>(task.planned_hours || null);
  const [taskType, setTaskType] = useState<'task' | 'personal_board' | 'standup' | 'function'>(task.task_type || 'task');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(task.recurrence_type || 'none');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(task.recurrence_days || []);
  const [defaultContent, setDefaultContent] = useState<string>(task.default_content || '');
  const [isPinned, setIsPinned] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [boardColumns, setBoardColumns] = useState<Column[]>([]);
  const [subtaskColumns, setSubtaskColumns] = useState<Column[]>([]);
  const [showParentSuggestions, setShowParentSuggestions] = useState(false);
  const [loadingParentSuggestions, setLoadingParentSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; size: number }>>(
    task.attachments || []
  );
  // TYPING INDICATOR: Commented out to disable realtime typing
  // const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const { toast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  // TYPING INDICATOR: Commented out typing timeout
  // const typingTimeoutRef = useRef<NodeJS.Timeout>();
  // const presenceChannelRef = useRef<any>(null);
  const { versions, saveVersion, restoreVersion } = useTaskVersions(task.id);
  const { logs, loadLogs } = useTaskLogs(task.id);
  const isUpdatingFromRealtimeRef = useRef(false);
  const lastLocalSaveRef = useRef<number>(0);
  const editorFocusedRef = useRef(false);
  const titleFocusedRef = useRef(false);
  const titleSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const hasPendingTitleSaveRef = useRef(false);
  const isSavingContentRef = useRef(false); // Lock для предотвращения дублирования
  const pendingContentSaveRef = useRef<string | null>(null); // Очередь сохранения
  const isClosingRef = useRef(false); // Флаг закрытия - отключает blur-save
  
  // Последние подтверждённо сохранённые значения
  const lastSavedContentRef = useRef(task.content);
  const lastSavedTitleRef = useRef(task.title);
  
  // Refs для актуальных значений (для cleanup)
  const contentRef = useRef(content);
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  const titleRef = useRef(title);

  // Синхронизируем refs с актуальными значениями
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  const DuplicatesBadges = ({ duplicates }: { duplicates: Array<{ id: string }> }) => {
    const [duplicateTasks, setDuplicateTasks] = useState<Array<{ id: string; title: string }>>([]);

    useEffect(() => {
      const loadDuplicates = async () => {
        if (!duplicates || duplicates.length === 0) return;

        try {
          const dupIds = duplicates.map(d => d.id).filter(Boolean);
          if (dupIds.length === 0) return;

          const { data } = await supabase
            .from("tasks")
            .select("id, title")
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
      <>
        {duplicateTasks.map((dup) => (
          <TaskBadge
            key={dup.id}
            taskId={dup.id}
            title={dup.title}
            showMenu={false}
          />
        ))}
      </>
    );
  };

  const getUserColor = (userId: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // TYPING INDICATOR: Commented out to disable realtime typing
  // const collaborationUsers: CollaborationUser[] = activeUsers
  //   .filter(u => u.cursor_position)
  //   .map(u => ({
  //     userId: u.user_id,
  //     userName: u.full_name || 'Пользователь',
  //     color: getUserColor(u.user_id),
  //     cursor: u.cursor_position,
  //   }));

  // Функция для полной перезагрузки данных задачи из БД
  const reloadTaskData = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', task.id)
        .single();

      if (error) throw error;

      if (data) {
        setTitle(data.title);
        setContent(data.content);
        setPitch(data.pitch || null);
        setPriority(data.priority || 'none');
        setStartDate(data.start_date ? new Date(data.start_date) : null);
        setEndDate(data.end_date ? new Date(data.end_date) : null);
        setPlannedHours(data.planned_hours || null);
        setTaskType((data.task_type as 'task' | 'personal_board' | 'standup' | 'function') || 'task');
        setRecurrenceType((data.recurrence_type as RecurrenceType) || 'none');
        setRecurrenceDays((data.recurrence_days as number[]) || []);
        setDefaultContent(data.default_content || '');
        setAttachments((data.attachments as Array<{ url: string; name: string; size: number }>) || []);
      }
    } catch (error) {
      console.error('Error reloading task data:', error);
    }
  };

  useEffect(() => {
    // Загружаем актуальные данные из БД при открытии
    const loadFreshData = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', task.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setTitle(data.title);
          setPitch(data.pitch || null);
          setContent(data.content);
          setPriority(data.priority || "none");
          setStartDate(data.start_date ? new Date(data.start_date) : null);
          setEndDate(data.end_date ? new Date(data.end_date) : null);
          setPlannedHours(data.planned_hours || null);
          setTaskType((data.task_type as 'task' | 'personal_board' | 'standup' | 'function') || 'task');
          setRecurrenceType((data.recurrence_type as RecurrenceType) || 'none');
          setRecurrenceDays((data.recurrence_days as number[]) || []);
          setDefaultContent(data.default_content || '');
          setAttachments((data.attachments as Array<{ url: string; name: string; size: number }>) || []);
        }
      } catch (error) {
        console.error('Error loading fresh task data:', error);
        // Fallback к props если не удалось загрузить
        setTitle(task.title);
        setPitch(task.pitch || null);
        setContent(task.content);
        setPriority(task.priority || "none");
        setStartDate(task.start_date ? new Date(task.start_date) : null);
        setEndDate(task.end_date ? new Date(task.end_date) : null);
        setPlannedHours(task.planned_hours || null);
        setTaskType(task.task_type || 'task');
        setRecurrenceType(task.recurrence_type || 'none');
        setRecurrenceDays(task.recurrence_days || []);
        setDefaultContent(task.default_content || '');
        setAttachments(task.attachments || []);
      }
    };
    
    loadFreshData();
    loadComments();
    loadParentTasks();
    loadSubtasks();
    loadOwner();
    checkIfPinned();
    loadBoardColumns();

    // Realtime subscription для автообновления комментариев
    const commentsChannel = supabase
      .channel(`task-comments-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${task.id}`,
        },
        (payload) => {
          loadComments();
          const content = (payload as any)?.new?.content || '';
          console.log('[TaskContent] Received comment event, content:', content);
          
          // Проверяем UI event формат
          try {
            const eventData = JSON.parse(content);
            console.log('[TaskContent] Parsed event data:', eventData);
            if (eventData.type === 'ui_event' && eventData.component === 'ParentSuggestions') {
              console.log('[TaskContent] ParentSuggestions UI event detected, showing component');
              setLoadingParentSuggestions(true);
              setShowParentSuggestions(true);
              return;
            }
          } catch (e) {
            console.log('[TaskContent] Comment is not JSON:', e);
            // Не JSON, проверяем старый формат (backward compatibility)
          }
          
          // Старый формат комментариев от триггера
          if (content.includes('Структуратор') || content.includes('✅ Триггер')) {
            console.log('[TaskContent] Legacy trigger comment detected');
            setLoadingParentSuggestions(true);
            setShowParentSuggestions(true);
          }
        }
      )
      .subscribe();

    // Realtime subscription для автообновления задачи
    const taskChannel = supabase
      .channel(`task-updates-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${task.id}`,
        },
        (payload) => {
          // Игнорируем эхо собственных изменений (в течение 2 секунд после локального сохранения)
          if (Date.now() - lastLocalSaveRef.current < 2000) {
            console.log('Ignoring realtime echo of own save');
            return;
          }
          
          const updatedTask = payload.new as any;
          const oldTask = payload.old as any;
          
          console.log('Task updated in realtime:', payload);
          
          isUpdatingFromRealtimeRef.current = true;
          
          // Обновляем title только если не редактируется
          if (!titleFocusedRef.current && updatedTask.title !== title) {
            setTitle(updatedTask.title);
          }
          if ((updatedTask.pitch || null) !== pitch) {
            setPitch(updatedTask.pitch || null);
          }
          
          // Обновляем content только если редактор не в фокусе и контент изменился
          if (!editorFocusedRef.current && 
              updatedTask.content !== undefined && 
              updatedTask.content !== null &&
              updatedTask.content !== '<p></p>' &&
              oldTask?.content !== updatedTask.content) {
            setContent(updatedTask.content);
          }
          
          if ((updatedTask.priority || 'none') !== priority) {
            setPriority(updatedTask.priority || 'none');
          }
          
          // Остальные поля обновляем напрямую (они редко меняются)
          setStartDate(updatedTask.start_date ? new Date(updatedTask.start_date) : null);
          setEndDate(updatedTask.end_date ? new Date(updatedTask.end_date) : null);
          setPlannedHours(updatedTask.planned_hours || null);
          setTaskType(updatedTask.task_type || 'task');
          setRecurrenceType(updatedTask.recurrence_type || 'none');
          setRecurrenceDays(updatedTask.recurrence_days || []);
          setDefaultContent(updatedTask.default_content || '');
          setAttachments(updatedTask.attachments || []);
          
          setTimeout(() => {
            isUpdatingFromRealtimeRef.current = false;
          }, 500);
        }
      )
      .subscribe();

    // Realtime subscription для автообновления логов
    const logsChannel = supabase
      .channel(`task-logs-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_logs',
          filter: `task_id=eq.${task.id}`,
        },
        () => {
          // Перезагружаем логи при любом изменении
          loadLogs();
        }
      )
      .subscribe();

    // Realtime subscription для task_relations (подзадачи)
    const relationsChildChannel = supabase
      .channel(`task-relations-child-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_relations',
          filter: `parent_id=eq.${task.id}`,
        },
        () => {
          console.log('[TaskContent] task_relations changed (as parent), reloading subtasks');
          loadSubtasks();
        }
      )
      .subscribe();

    // Realtime subscription для task_relations (родители)
    const relationsParentChannel = supabase
      .channel(`task-relations-parent-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_relations',
          filter: `child_id=eq.${task.id}`,
        },
        () => {
          console.log('[TaskContent] task_relations changed (as child), reloading parents');
          loadParentTasks();
        }
      )
      .subscribe();

    // Слушатель событий от AgentTriggerButton
    const handleAgentLoading = (event: CustomEvent) => {
      const { agentName, taskId: loadingTaskId } = event.detail || {};
      console.log('[TaskContent] Agent loading event:', agentName, loadingTaskId);
      
      if (agentName === 'Структуратор' && loadingTaskId === task.id) {
        console.log('[TaskContent] Showing parent suggestions with loading');
        setShowParentSuggestions(true);
        setLoadingParentSuggestions(true);
      }
    };
    
    const handleAgentExecuted = (event: CustomEvent) => {
      const { agentName, taskId: executedTaskId } = event.detail || {};
      console.log('[TaskContent] Agent executed event:', agentName, executedTaskId);
      
      if (agentName === 'Структуратор' && executedTaskId === task.id) {
        console.log('[TaskContent] Agent execution confirmed');
        setShowParentSuggestions(true);
        setLoadingParentSuggestions(true);
      }
    };
    
    window.addEventListener('agent-loading', handleAgentLoading as EventListener);
    window.addEventListener('agent-executed', handleAgentExecuted as EventListener);
    
    // TYPING INDICATOR: Commented out to disable realtime typing
    // const setupPresence = async () => {
    //   const presenceChannel = supabase.channel(`task-presence-${task.id}`);
    //   presenceChannelRef.current = presenceChannel;
    //   
    //   // Получаем ID текущего пользователя заранее
    //   const { data: { user: currentUser } } = await supabase.auth.getUser();
    //   const currentUserId = currentUser?.id;
    //   
    //   presenceChannel
    //     .on('presence', { event: 'sync' }, () => {
    //       const state = presenceChannel.presenceState();
    //       const usersMap = new Map<string, ActiveUser>();
    //       
    //       Object.keys(state).forEach(key => {
    //         const presences = state[key] as any[];
    //         presences.forEach(presence => {
    //           // Не показываем текущего пользователя в списке активных
    //           if (presence.user_id !== currentUserId) {
    //             // Дедупликация: оставляем только последнюю запись для каждого user_id
    //             const existing = usersMap.get(presence.user_id);
    //             if (!existing || new Date(presence.online_at) > new Date(existing.online_at)) {
    //               usersMap.set(presence.user_id, presence as ActiveUser);
    //             }
    //           }
    //         });
    //       });
    //       setActiveUsers(Array.from(usersMap.values()));
    //     })
    //     .subscribe(async (status) => {
    //       if (status === 'SUBSCRIBED') {
    //         const { data: { user } } = await supabase.auth.getUser();
    //         if (user) {
    //           const { data: profile } = await supabase
    //             .from('profiles')
    //             .select('full_name, avatar_url')
    //             .eq('user_id', user.id)
    //             .single();
    //           
    //         await presenceChannel.track({
    //           user_id: user.id,
    //           full_name: profile?.full_name || null,
    //           avatar_url: profile?.avatar_url || null,
    //           online_at: new Date().toISOString(),
    //           is_typing: false,
    //           cursor_position: undefined,
    //         });
    //         }
    //       }
    //     });
    // };
    // 
    // setupPresence();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(taskChannel);
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(relationsChildChannel);
      supabase.removeChannel(relationsParentChannel);
      window.removeEventListener('agent-loading', handleAgentLoading as EventListener);
      window.removeEventListener('agent-executed', handleAgentExecuted as EventListener);
      // TYPING INDICATOR: Commented out to disable realtime typing
      // if (presenceChannelRef.current) {
      //   supabase.removeChannel(presenceChannelRef.current);
      // }
    };
  }, [task.id]);

  const checkIfPinned = () => {
    const pinnedTasks = JSON.parse(localStorage.getItem('pinnedTasks') || '[]');
    setIsPinned(pinnedTasks.includes(task.id));
  };

  const loadOwner = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("owner_id")
        .eq("id", task.id)
        .single();
      if (error) throw error;
      setOwnerId(data?.owner_id || null);
    } catch (error) {
      console.error("Error loading owner:", error);
    }
  };

  const loadParentTasks = async () => {
    try {
      const { data: relations, error } = await supabase
        .from("task_relations")
        .select(`
          parent_id,
          tasks!task_relations_parent_id_fkey (
            id, title, content, column_id, subtask_order, is_root
          )
        `)
        .eq("child_id", task.id);

      if (error) throw error;

      const parents: Task[] = (relations || [])
        .map((r: any) => {
          const parentData = r.tasks;
          if (!parentData) return null;
          return {
            id: parentData.id,
            title: parentData.title,
            content: parentData.content,
            columnId: parentData.column_id,
            subtaskOrder: parentData.subtask_order || 0,
            subtasks: [],
            is_root: parentData.is_root,
          } as Task;
        })
        .filter((p: Task | null): p is Task => p !== null);

      setParentTasks(parents);
      
      // Если rootTask не передан через props, загружаем корень из цепочки
      if (!rootTask && parents.length > 0) {
        // Проверяем, есть ли среди родителей корень
        const rootParent = parents.find(p => p.is_root);
        if (rootParent) {
          setLoadedRootTask(rootParent);
        } else {
          // Нужно подняться вверх по иерархии до корня
          loadRootFromParent(parents[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading parent tasks:", error);
      setParentTasks([]);
    }
  };
  
  // Загружаем корневую задачу, поднимаясь вверх от указанного parent
  const loadRootFromParent = async (startId: string) => {
    try {
      let currentId = startId;
      const visited = new Set<string>();
      
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        
        // Загружаем задачу
        const { data: taskData } = await supabase
          .from("tasks")
          .select("id, title, content, column_id, subtask_order, is_root")
          .eq("id", currentId)
          .maybeSingle();
          
        if (!taskData) break;
        
        // Если это корень - нашли
        if (taskData.is_root) {
          setLoadedRootTask({
            id: taskData.id,
            title: taskData.title,
            content: taskData.content,
            columnId: taskData.column_id,
            subtaskOrder: taskData.subtask_order || 0,
            subtasks: [],
            is_root: true,
          });
          return;
        }
        
        // Ищем родителя
        const { data: relation } = await supabase
          .from("task_relations")
          .select("parent_id")
          .eq("child_id", currentId)
          .limit(1)
          .maybeSingle();
          
        if (!relation) break;
        currentId = relation.parent_id;
      }
    } catch (error) {
      console.error("Error loading root task:", error);
    }
  };

  const loadSubtasks = async () => {
    try {
      const { data: relations, error } = await supabase
        .from("task_relations")
        .select(`
          child_id,
          tasks!task_relations_child_id_fkey (
            id, title, content, column_id, subtask_order
          )
        `)
        .eq("parent_id", task.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const tasks: Task[] = (relations || [])
        .map((r: any) => {
          const childData = r.tasks;
          if (!childData) return null;
          return {
            id: childData.id,
            title: childData.title,
            content: childData.content,
            columnId: childData.column_id,
            subtaskOrder: childData.subtask_order || 0,
            subtasks: [],
          } as Task;
        })
        .filter((t: Task | null): t is Task => t !== null);

      setSubtasks(tasks);
    } catch (error) {
      console.error("Error loading subtasks:", error);
    }
  };

  const loadBoardColumns = async () => {
    try {
      // Загружаем колонки родительской доски (откуда пришла текущая задача)
      const { data: relations, error: relError } = await supabase
        .from("task_relations")
        .select(`
          parent_id,
          tasks!task_relations_parent_id_fkey (custom_columns)
        `)
        .eq("child_id", task.id)
        .limit(1)
        .maybeSingle();

      if (relError) throw relError;

      if (!relations?.tasks) {
        // Если нет родителя, используем дефолтные колонки
        setBoardColumns([
          { id: "todo", title: "To Do" },
          { id: "inprogress", title: "In Progress" },
          { id: "done", title: "Done" },
        ]);
      } else {
        const parentTask = relations.tasks as any;
        const rawCols = parentTask.custom_columns as unknown;
        const cols = Array.isArray(rawCols) ? (rawCols as Column[]) : null;
        
        if (cols && cols.length > 0) {
          setBoardColumns(cols);
        } else {
          // Дефолтные колонки
          setBoardColumns([
            { id: "todo", title: "To Do" },
            { id: "inprogress", title: "In Progress" },
            { id: "done", title: "Done" },
          ]);
        }
      }

      // Для подзадач используем custom_columns текущей задачи напрямую
      const currentCols = task.custom_columns as unknown;
      const subtaskCols = Array.isArray(currentCols) ? (currentCols as Column[]) : null;
      
      if (subtaskCols && subtaskCols.length > 0) {
        setSubtaskColumns(subtaskCols);
      } else {
        // Дефолтные колонки для подзадач
        setSubtaskColumns([
          { id: "todo", title: "To Do" },
          { id: "inprogress", title: "In Progress" },
          { id: "done", title: "Done" },
        ]);
      }
    } catch (error) {
      console.error("Error loading board columns:", error);
      setBoardColumns([
        { id: "todo", title: "To Do" },
        { id: "inprogress", title: "In Progress" },
        { id: "done", title: "Done" },
      ]);
      setSubtaskColumns([
        { id: "todo", title: "To Do" },
        { id: "inprogress", title: "In Progress" },
        { id: "done", title: "Done" },
      ]);
    }
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("task_id", task.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Фильтруем служебные комментарии (UI events, логи триггеров)
      const userComments = (data || []).filter(comment => {
        try {
          const parsed = JSON.parse(comment.content);
          // Скрываем UI events
          if (parsed.type === 'ui_event') return false;
        } catch (e) {
          // Не JSON - обычный комментарий
        }
        
        // Скрываем автоматические логи от триггеров
        if (comment.content.includes('✅ Триггер') || 
            comment.content.includes('Структуратор выполнен') ||
            comment.content.includes('Агент выполнен')) {
          return false;
        }
        
        return true;
      });
      
      setComments(userComments);
    } catch (error) {
      console.error("Error loading comments:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить комментарии",
        variant: "destructive",
      });
    }
  };

  const handleRelationChange = async () => {
    // Перезагружаем данные самой задачи из БД
    await reloadTaskData();
    
    // Перезагружаем родителей и подзадачи
    loadParentTasks();
    loadSubtasks();
    
    // Вызываем внешний обработчик
    if (externalOnRelationChange) {
      externalOnRelationChange();
    }
  };

  const handleRemoveSubtask = async (subtaskId: string) => {
    try {
      const { error } = await supabase
        .from("task_relations")
        .delete()
        .eq("parent_id", task.id)
        .eq("child_id", subtaskId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Подзадача удалена",
      });

      loadSubtasks();
    } catch (error) {
      console.error("Error removing subtask:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить подзадачу",
        variant: "destructive",
      });
    }
  };

  const handleSubtaskStatusChange = async (taskId: string, newColumnId: string) => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ column_id: newColumnId })
        .eq("id", taskId)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Не удалось изменить статус подзадачи. Возможно, у вас нет прав на редактирование этой задачи.");
      }

      toast({
        title: "Успешно",
        description: "Статус подзадачи изменен",
      });

      loadSubtasks();
    } catch (error) {
      console.error("Error updating subtask status:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось изменить статус",
        variant: "destructive",
      });
    }
  };

  const handleSubtaskDelete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Подзадача удалена",
      });

      loadSubtasks();
    } catch (error) {
      console.error("Error deleting subtask:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить подзадачу",
        variant: "destructive",
      });
    }
  };

  // Сохранение title в БД (вызывается с debounce)
  const saveTitleToDb = async (newTitle: string): Promise<void> => {
    lastLocalSaveRef.current = Date.now();
    hasPendingTitleSaveRef.current = false;
    
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ title: newTitle })
        .eq("id", task.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Не удалось сохранить название. Возможно, у вас нет прав на редактирование этой задачи.");
      }

      // Подтверждаем сохранение
      lastSavedTitleRef.current = newTitle;
      
      onUpdate(task.id, { title: newTitle });
    } catch (error) {
      console.error("Error updating task title:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось сохранить название",
        variant: "destructive",
      });
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    hasPendingTitleSaveRef.current = true;
    
    // Debounce сохранения на 800ms
    if (titleSaveTimeoutRef.current) {
      clearTimeout(titleSaveTimeoutRef.current);
    }
    
    titleSaveTimeoutRef.current = setTimeout(() => {
      saveTitleToDb(newTitle);
    }, 800);
  };

  const handleTitleFocus = () => {
    titleFocusedRef.current = true;
  };

  const handleTitleBlur = () => {
    titleFocusedRef.current = false;
    // Сохраняем сразу при потере фокуса если есть несохраненные изменения
    if (hasPendingTitleSaveRef.current) {
      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current);
      }
      saveTitleToDb(titleRef.current);
    }
  };

  const handleGeneratePitch = async () => {
    setIsGeneratingPitch(true);
    try {
      const { data, error } = await supabase.functions.invoke('text-correction', {
        body: { 
          text: content,
          generatePitchOnly: true 
        }
      });

      if (error) throw error;

      const generatedPitch = data.correctedText;
      setPitch(generatedPitch);

      const { error: updateError } = await supabase
        .from("tasks")
        .update({ pitch: generatedPitch })
        .eq("id", task.id);

      if (updateError) throw updateError;

      toast({
        title: "Успешно",
        description: "Питч сгенерирован",
      });
    } catch (error) {
      console.error("Error generating pitch:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать питч",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPitch(false);
    }
  };

  const saveContent = async (contentToSave: string, silent = false): Promise<void> => {
    // Если сохранение уже идет — запоминаем последнюю версию
    if (isSavingContentRef.current) {
      pendingContentSaveRef.current = contentToSave;
      return;
    }
    
    isSavingContentRef.current = true;
    setIsSaving(true);
    lastLocalSaveRef.current = Date.now();
    
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ content: contentToSave })
        .eq("id", task.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Не удалось сохранить изменения. Возможно, у вас нет прав на редактирование этой задачи.");
      }

      // Подтверждаем сохранение
      lastSavedContentRef.current = contentToSave;
      hasUnsavedChangesRef.current = false;

      // Автоматически вызываем проверку триггеров после сохранения
      supabase.functions.invoke("check-and-execute-triggers", {
        body: {
          triggerType: 'on_update',
          sourceEntity: {
            type: 'tasks',
            id: task.id
          },
          changedFields: ['content']
        }
      }).catch(err => {
        console.error('Trigger execution error:', err);
      });

      onUpdate(task.id, { content: contentToSave });
      setHasUnsavedChanges(false);
      
      if (!silent) {
        toast({
          title: "Сохранено",
          description: "Описание задачи успешно сохранено",
        });
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось сохранить изменения",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      isSavingContentRef.current = false;
      
      // Если накопилась более новая версия — сохраняем её
      const pending = pendingContentSaveRef.current;
      if (pending !== null && pending !== lastSavedContentRef.current) {
        pendingContentSaveRef.current = null;
        void saveContent(pending, true);
      } else {
        pendingContentSaveRef.current = null;
      }
    }
  };

  const handleSaveContent = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveContent(content);
  };

  // TYPING INDICATOR: Commented out to disable realtime typing
  // const updateTypingStatus = async (isTyping: boolean, cursorPosition?: { from: number; to: number }) => {
  //   if (!presenceChannelRef.current) return;
  //   
  //   const { data: { user } } = await supabase.auth.getUser();
  //   if (user) {
  //     const { data: profile } = await supabase
  //       .from('profiles')
  //       .select('full_name, avatar_url')
  //       .eq('user_id', user.id)
  //       .single();
  //     
  //     await presenceChannelRef.current.track({
  //       user_id: user.id,
  //       full_name: profile?.full_name || null,
  //       avatar_url: profile?.avatar_url || null,
  //       online_at: new Date().toISOString(),
  //       is_typing: isTyping,
  //       cursor_position: cursorPosition,
  //     });
  //   }
  // };

  // const handleCursorUpdate = (position: { from: number; to: number }) => {
  //   updateTypingStatus(true, position);
  // };

  const handleContentChange = (newContent: string) => {
    if (isUpdatingFromRealtimeRef.current) return;
    
    // Синхронно обновляем refs
    contentRef.current = newContent;
    hasUnsavedChangesRef.current = true;
    
    // Только один setState - hasUnsavedChanges трекается через ref
    setContent(newContent);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Автосохранение каждые 15 секунд пока пользователь работает
    saveTimeoutRef.current = setTimeout(() => {
      saveContent(newContent);
    }, 15000);
  };

  // Сохранение при потере фокуса редактором
  const handleContentBlur = () => {
    editorFocusedRef.current = false;
    // Не сохраняем при blur если идет закрытие - saveBeforeClose это сделает
    if (isClosingRef.current) return;
    
    // Используем refs для актуальных значений
    if (hasUnsavedChangesRef.current && saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      if (contentRef.current) {
        saveContent(contentRef.current);
      }
    }
  };

  const handleContentFocus = () => {
    editorFocusedRef.current = true;
  };

  // Принудительное сохранение перед закрытием
  const saveBeforeClose = async () => {
    isClosingRef.current = true; // Отключаем blur-save
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (titleSaveTimeoutRef.current) {
      clearTimeout(titleSaveTimeoutRef.current);
    }
    
    const saves: Promise<void>[] = [];
    
    // Сохраняем title если изменился
    const currentTitle = titleRef.current;
    if (currentTitle && currentTitle !== lastSavedTitleRef.current) {
      saves.push(saveTitleToDb(currentTitle));
    }
    
    // Сохраняем content если изменился
    const currentContent = contentRef.current;
    if (currentContent !== lastSavedContentRef.current) {
      saves.push(saveContent(currentContent || '', true));
    }
    
    if (saves.length > 0) {
      await Promise.all(saves);
    }
  };

  // Expose saveBeforeClose via ref
  useImperativeHandle(ref, () => ({
    saveBeforeClose
  }));

  // Cleanup с сохранением несохраненных изменений
  useEffect(() => {
    // Получаем токен сессии при монтировании для использования при unmount
    let sessionToken: string | null = null;
    supabase.auth.getSession().then(({ data }) => {
      sessionToken = data.session?.access_token || null;
    });
    
    return () => {
      const token = sessionToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const taskId = task.id;
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current);
      }
      
      // Объединяем все несохраненные изменения в один запрос
      const updates: Record<string, string> = {};
      
      // Проверяем несохраненный title
      if (hasPendingTitleSaveRef.current && titleRef.current) {
        updates.title = titleRef.current;
      }
      
      // Проверяем несохраненный content
      if (hasUnsavedChangesRef.current && contentRef.current) {
        updates.content = contentRef.current;
      }
      
      // Если есть что сохранять - делаем один запрос
      if (Object.keys(updates).length > 0) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tasks?id=eq.${taskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${token}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(updates),
          keepalive: true
        }).catch(err => console.error('Error saving on unmount:', err));
      }
    };
  }, [task.id]);

  const handleRestoreVersion = async (versionId: string) => {
    const restoredContent = await restoreVersion(versionId);
    if (restoredContent) {
      setContent(restoredContent);
      onUpdate(task.id, { content: restoredContent });
    }
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    setPriority(newPriority);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ priority: newPriority })
        .eq("id", task.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Не удалось изменить приоритет. Возможно, у вас нет прав на редактирование этой задачи.");
      }

      onUpdate(task.id, { priority: newPriority });
    } catch (error) {
      console.error("Error updating priority:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить приоритет",
        variant: "destructive",
      });
    }
  };

  const handleStartDateChange = async (date: Date | null) => {
    setStartDate(date);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ start_date: date?.toISOString() || null })
        .eq("id", task.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Не удалось изменить дату начала. Возможно, у вас нет прав на редактирование этой задачи.");
      }

      onUpdate(task.id, { start_date: date?.toISOString() || undefined });
    } catch (error) {
      console.error("Error updating start date:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить дату старта",
        variant: "destructive",
      });
    }
  };

  const handleEndDateChange = async (date: Date | null) => {
    setEndDate(date);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ end_date: date?.toISOString() || null })
        .eq("id", task.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Не удалось изменить дату окончания. Возможно, у вас нет прав на редактирование этой задачи.");
      }

      onUpdate(task.id, { end_date: date?.toISOString() || undefined });
    } catch (error) {
      console.error("Error updating end date:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить дату окончания",
        variant: "destructive",
      });
    }
  };

  const handlePlannedHoursChange = async (hours: number | null) => {
    setPlannedHours(hours);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ planned_hours: hours })
        .eq("id", task.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Не удалось изменить плановые часы. Возможно, у вас нет прав на редактирование этой задачи.");
      }

      onUpdate(task.id, { planned_hours: hours || undefined });
    } catch (error) {
      console.error("Error updating planned hours:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить плановое время",
        variant: "destructive",
      });
    }
  };

  const handleTaskTypeChange = async (type: 'task' | 'personal_board' | 'standup' | 'function') => {
    setTaskType(type);
    
    // Вставляем шаблон типа СВЕРХУ текущего контента (не стирая)
    const typeConfigs = getTaskTypeConfigs();
    const typeConfig = typeConfigs[type];
    let newContent = content;
    
    if (typeConfig.template) {
      // Добавляем шаблон сверху текущего контента
      newContent = content 
        ? `${typeConfig.template}\n\n${content}`
        : typeConfig.template;
      setContent(newContent);
      
      // Для function типа также сохраняем как default_content
      if (type === 'function') {
        setDefaultContent(typeConfig.template);
      }
    }
    
    try {
      const updateData: any = { task_type: type };
      
      if (typeConfig.template) {
        updateData.content = newContent;
        if (type === 'function') {
          updateData.default_content = typeConfig.template;
        }
      }
      
      const { data, error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", task.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Не удалось изменить тип задачи. Возможно, у вас нет прав на редактирование этой задачи.");
      }

      onUpdate(task.id, updateData);
      
      toast({
        title: "Успешно",
        description: typeConfig.template ? "Тип изменен, шаблон добавлен сверху" : "Тип задачи изменен",
      });
    } catch (error) {
      console.error("Error updating task type:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить тип задачи",
        variant: "destructive",
      });
    }
  };

  const handleRecurrenceTypeChange = async (type: RecurrenceType) => {
    setRecurrenceType(type);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ recurrence_type: type })
        .eq("id", task.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Не удалось изменить периодичность. Возможно, у вас нет прав на редактирование этой задачи.");
      }

      onUpdate(task.id, { recurrence_type: type });
    } catch (error) {
      console.error("Error updating recurrence type:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить периодичность",
        variant: "destructive",
      });
    }
  };

  const handleRecurrenceDaysChange = async (days: number[]) => {
    setRecurrenceDays(days);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ recurrence_days: days })
        .eq("id", task.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Не удалось изменить дни недели. Возможно, у вас нет прав на редактирование этой задачи.");
      }

      onUpdate(task.id, { recurrence_days: days });
    } catch (error) {
      console.error("Error updating recurrence days:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить дни недели",
        variant: "destructive",
      });
    }
  };

  const handleSaveAsDefault = async () => {
    setDefaultContent(content);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ default_content: content })
        .eq("id", task.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Не удалось сохранить шаблон. Возможно, у вас нет прав на редактирование этой задачи.");
      }
      
      toast({
        title: "Успешно",
        description: "Текущий контент сохранен как дефолтный шаблон",
      });
    } catch (error) {
      console.error("Error saving default content:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось сохранить шаблон",
        variant: "destructive",
      });
    }
  };

  const handleInsertDefault = () => {
    if (!defaultContent) {
      toast({
        title: "Ошибка",
        description: "Сначала сохраните дефолтный шаблон",
        variant: "destructive",
      });
      return;
    }
    
    const now = new Date();
    const dateTime = format(now, 'dd.MM.yyyy HH:mm');
    const newContent = `${dateTime}\n\n${defaultContent}\n\n---\n\n${content}`;
    setContent(newContent);
    handleContentChange(newContent);
  };

  const handleTogglePin = () => {
    const pinnedTasks = JSON.parse(localStorage.getItem('pinnedTasks') || '[]');
    const newPinnedTasks = isPinned
      ? pinnedTasks.filter((id: string) => id !== task.id)
      : [...pinnedTasks, task.id];
    localStorage.setItem('pinnedTasks', JSON.stringify(newPinnedTasks));
    setIsPinned(!isPinned);
    window.dispatchEvent(new Event('pinnedTasksChanged'));
    toast({
      title: isPinned ? "Задача откреплена" : "Задача закреплена",
      description: isPinned ? "Задача удалена из закрепленных" : "Задача добавлена в закрепленные",
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = subtasks.findIndex((st) => `subtask-${st.id}` === active.id);
    const newIndex = subtasks.findIndex((st) => `subtask-${st.id}` === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedSubtasks = arrayMove(subtasks, oldIndex, newIndex);
    setSubtasks(reorderedSubtasks);

    // Сохраняем новый порядок в базу
    try {
      await Promise.all(
        reorderedSubtasks.map((subtask, index) =>
          supabase
            .from("tasks")
            .update({ subtask_order: index })
            .eq("id", subtask.id)
        )
      );

      toast({
        title: "Успешно",
        description: "Порядок подзадач сохранён",
      });
    } catch (error) {
      console.error("Error saving subtask order:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить порядок",
        variant: "destructive",
      });
      loadSubtasks(); // Перезагружаем подзадачи в случае ошибки
    }
  };

  return (
    <>
      <div className={`space-y-3 ${className}`}>
        {/* TYPING INDICATOR: Commented out to disable realtime typing */}
        {/* {activeUsers.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-accent/50 rounded-md">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {activeUsers.some(u => u.is_typing) ? 'Печатает:' : 'Сейчас редактируют:'}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {activeUsers.map((user) => (
                  <TooltipProvider key={user.user_id}>
                    <Tooltip>
                      <TooltipTrigger>
                        <Avatar className={`h-6 w-6 border-2 ${user.is_typing ? 'border-primary animate-pulse' : 'border-background'}`}>
                          {user.avatar_url ? (
                            <AvatarImage src={user.avatar_url} alt={user.full_name || 'User'} />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {(user.full_name || 'U').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {user.full_name || 'Пользователь'}
                          {user.is_typing && ' печатает...'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
              {activeUsers.some(u => u.is_typing) && (
                <span className="text-xs text-muted-foreground animate-pulse">
                  ...
                </span>
              )}
            </div>
          </div>
        )} */}
        
        {/* Task Metadata */}
        <TaskMetadata
          taskId={task.id}
          priority={priority}
          startDate={startDate}
          endDate={endDate}
          ownerId={ownerId}
          plannedHours={plannedHours || undefined}
          taskType={taskType}
          onPriorityChange={handlePriorityChange}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          onOwnerChange={loadOwner}
          onPlannedHoursChange={handlePlannedHoursChange}
          onTaskTypeChange={handleTaskTypeChange}
          onDrillDown={onDrillDown ? () => onDrillDown(task) : undefined}
          onVersionHistory={() => setShowVersionHistory(!showVersionHistory)}
          isPinned={isPinned}
          onTogglePin={handleTogglePin}
          onClose={onClose}
          variant="compact"
        />

        {/* Parent Chain - всегда показываем если есть navigationStack (даже на корневом уровне) */}
        {(navigationStack && navigationStack.length >= 1) || parentTasks.length > 0 || rootTask || loadedRootTask ? (
          <div className="pb-2 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <ParentChainBar
                  parentChain={navigationStack ? navigationStack.slice(0, -1) : (loadedRootTask ? [loadedRootTask, ...parentTasks.filter(p => !p.is_root)] : parentTasks)}
                  rootTaskId={rootTask?.id || loadedRootTask?.id}
                  onRootSelect={onRootSelect}
                  onNavigate={onNavigate}
                  onDrillDown={onDrillDown}
                  showAddParent={true}
                  currentTaskId={task.id}
                  onRelationChange={handleRelationChange}
                  variant={navigationStack ? "full" : "dialog"}
                  onNavigateBack={onNavigateBack}
                  onNavigateForward={onNavigateForward}
                  canNavigateBack={canNavigateBack}
                  canNavigateForward={canNavigateForward}
                  onTaskSearch={onTaskSearch || (onDrillDown ? async (searchedTask: Task) => {
                    onDrillDown(searchedTask);
                  } : undefined)}
                />
              </div>
              
              {/* Кнопка для вызова агента-структуратора */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AgentTriggerButton
                      agentName="Структуратор"
                      taskId={task.id}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 flex-shrink-0"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Предложить parent через Структуратора</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Parent Suggestions from Структуратор */}
            {showParentSuggestions && (
              <ParentSuggestions
                taskId={task.id}
                currentTitle={title}
                currentContent={content}
                onParentAdded={handleRelationChange}
                onLoadRequest={() => setLoadingParentSuggestions(true)}
                onLoadComplete={() => setLoadingParentSuggestions(false)}
              />
            )}
          </div>
        ) : null}

        {/* Task Title */}
        <UnifiedEditor
          content={title}
          onChange={handleTitleChange}
          onFocus={handleTitleFocus}
          onBlur={handleTitleBlur}
          placeholder="Название задачи"
          singleLine={true}
          className="font-semibold text-lg"
          minimal={true}
        />

        {/* Task Pitch */}
        <div className="flex items-center gap-2">
          {pitch ? (
            <p className="text-xs text-muted-foreground flex-1">{pitch}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic flex-1">Питч не создан</p>
          )}
          <AgentTriggerButton
            agentName="Редактор"
            taskId={task.id}
            label="Сгенерить питч"
          />
        </div>

        {/* Duplicates Section */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            {task.duplicates && task.duplicates.length > 0 ? (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-muted-foreground">Дубли:</span>
                <DuplicatesBadges duplicates={task.duplicates} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Дубли не найдены</p>
            )}
          </div>
          <AgentTriggerButton
            agentName="Поиск дублей"
            taskId={task.id}
            label="Найти дубли"
          />
        </div>

        {/* Task Content */}
        <div className="space-y-2">
          <div className={`transition-all ${hasUnsavedChanges ? 'border-l-2 border-l-primary pl-2' : ''}`}>
            <UnifiedEditor
              content={content}
              onChange={handleContentChange}
              onFocus={handleContentFocus}
              onBlur={handleContentBlur}
              placeholder="Описание задачи"
              className="flex-1 min-h-[160px] max-h-[600px] resize-y"
              // TYPING INDICATOR: Commented out to disable realtime typing
              // collaborationUsers={collaborationUsers}
              // onCursorUpdate={handleCursorUpdate}
              templateSettingsComponent={
                <TemplateSettingsPopover
                  task={task}
                  recurrenceType={recurrenceType}
                  recurrenceDays={recurrenceDays}
                  onRecurrenceTypeChange={handleRecurrenceTypeChange}
                  onRecurrenceDaysChange={handleRecurrenceDaysChange}
                  onSaveAsDefault={handleSaveAsDefault}
                  onInsertTemplate={(templateContent) => {
                    const newContent = content 
                      ? `${templateContent}\n\n${content}`
                      : templateContent;
                    setContent(newContent);
                    saveContent(newContent);
                  }}
                  onUpdateTask={(updates) => {
                    onUpdate(task.id, updates);
                    if (updates.use_custom_settings !== undefined) {
                      setContent(task.content);
                    }
                    toast({
                      title: "Настройки сохранены",
                      description: "Настройки задачи успешно обновлены",
                    });
                  }}
                />
              }
            />
          </div>
          {hasUnsavedChanges && !isSaving && (
            <span className="text-xs text-muted-foreground">
              Автосохранение...
            </span>
          )}
          {isSaving && (
            <span className="text-xs text-muted-foreground">
              Сохранение...
            </span>
          )}
        </div>

        {/* Task Attachments */}
        <TaskAttachments
          taskId={task.id}
          attachments={attachments}
          onUpdate={setAttachments}
        />

        {/* Subtasks */}
        {subtasks.length > 0 && (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={subtasks.map((st) => `subtask-${st.id}`)}>
              <TaskSubtasksRow
                taskId={task.id}
                subtasks={subtasks}
                onDrillDown={onDrillDown}
                onRemoveSubtask={handleRemoveSubtask}
                onRelationChange={handleRelationChange}
                onStatusChange={handleSubtaskStatusChange}
                onDelete={handleSubtaskDelete}
                availableColumns={subtaskColumns}
                showDragHandle={true}
              />
            </SortableContext>
          </DndContext>
        )}

        {/* Activity Logs */}
        {logs.length > 0 && (
          <div className="flex items-start gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Активность:</span>
            <div className="flex-1 space-y-1">
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedLog(logs[0])}>
                <CardContent className="p-1.5">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3 w-3 text-muted-foreground shrink-0" />
                    <p className="text-xs flex-1">
                      {logs[0].action === 'created' ? (
                        <span>Создано: <span className="font-medium">{logs[0].user_name}</span></span>
                      ) : logs[0].action === 'updated' ? (
                        <span>Изменено: {logs[0].field_name || 'поле'} (<span className="font-medium">{logs[0].user_name}</span>)</span>
                      ) : logs[0].action === 'trigger_executed' ? (
                        <span>Триггер: <span className="font-medium">{logs[0].field_name}</span></span>
                      ) : logs[0].action === 'trigger_error' ? (
                        <span>Ошибка триггера: <span className="font-medium">{logs[0].field_name}</span></span>
                      ) : (
                        <span>{logs[0].action} (<span className="font-medium">{logs[0].user_name}</span>)</span>
                      )}
                    </p>
                    <Info className="h-3 w-3 text-muted-foreground shrink-0" />
                    <p className="text-[10px] text-muted-foreground">{new Date(logs[0].created_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
              {showAllLogs && logs.slice(1).map(log => (
                <Card key={log.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedLog(log)}>
                  <CardContent className="p-1.5">
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3 w-3 text-muted-foreground shrink-0" />
                      <p className="text-xs flex-1">
                        {log.action === 'created' ? (
                          <span>Создано: <span className="font-medium">{log.user_name}</span></span>
                        ) : log.action === 'updated' ? (
                          <span>Изменено: {log.field_name || 'поле'} (<span className="font-medium">{log.user_name}</span>)</span>
                        ) : log.action === 'trigger_executed' ? (
                          <span>Триггер: <span className="font-medium">{log.field_name}</span></span>
                        ) : log.action === 'trigger_error' ? (
                          <span>Ошибка триггера: <span className="font-medium">{log.field_name}</span></span>
                        ) : (
                          <span>{log.action} (<span className="font-medium">{log.user_name}</span>)</span>
                        )}
                      </p>
                      <Info className="h-3 w-3 text-muted-foreground shrink-0" />
                      <p className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {logs.length > 1 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAllLogs(!showAllLogs)}
                className="h-6 px-2 text-xs shrink-0"
              >
                {showAllLogs ? "Скрыть" : `Все (${logs.length})`}
              </Button>
            )}
          </div>
        )}

        {/* Comments */}
        <div className="pt-1">
          <TaskComments
            taskId={task.id}
            comments={comments}
            onCommentsChange={() => {
              loadComments();
              loadSubtasks();
            }}
          />
        </div>
      </div>

      {/* History Dialog */}
      <TaskHistoryDialog
        taskId={task.id}
        versions={versions}
        onRestore={handleRestoreVersion}
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
      />

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Детали события</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2">
              <div>
                <span className="text-sm font-medium">Действие:</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedLog.action === 'created' ? 'Создание задачи' :
                   selectedLog.action === 'updated' ? 'Обновление задачи' :
                   selectedLog.action === 'trigger_executed' ? 'Выполнение триггера' :
                   selectedLog.action === 'trigger_error' ? 'Ошибка триггера' :
                   selectedLog.action}
                </p>
              </div>
              
              {selectedLog.field_name && (
                <div>
                  <span className="text-sm font-medium">Поле:</span>
                  <p className="text-sm text-muted-foreground mt-1">{selectedLog.field_name}</p>
                </div>
              )}
              
              {selectedLog.user_name && (
                <div>
                  <span className="text-sm font-medium">Пользователь:</span>
                  <p className="text-sm text-muted-foreground mt-1">{selectedLog.user_name}</p>
                </div>
              )}
              
              {selectedLog.old_value && (
                <div>
                  <span className="text-sm font-medium">Старое значение:</span>
                  <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                    {selectedLog.old_value}
                  </div>
                </div>
              )}
              
              {selectedLog.new_value && (
                <div>
                  <span className="text-sm font-medium">Новое значение:</span>
                  <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                    {selectedLog.new_value}
                  </div>
                </div>
              )}
              
              <div>
                <span className="text-sm font-medium">Дата и время:</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(selectedLog.created_at).toLocaleString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});
