import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SuggestedTaskBadge } from "./SuggestedTaskBadge";

interface ParentSuggestionsProps {
  taskId: string;
  currentTitle: string;
  currentContent: string;
  onParentAdded?: () => void;
  onLoadRequest?: () => void;
  onLoadComplete?: () => void;
}

interface SuggestedParent {
  title: string;
  reason?: string;
  id?: string;
}

export const ParentSuggestions = ({ 
  taskId, 
  currentTitle, 
  currentContent,
  onParentAdded,
  onLoadRequest,
  onLoadComplete
}: ParentSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<SuggestedParent[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const norm = (s: string) => (s || '').replace(/<[^>]*>/g, '').trim().toLowerCase();
  const currentTitleNorm = norm(currentTitle);

  // Realtime subscription для автозагрузки при добавлении родителей триггером
  useEffect(() => {
    const channel = supabase
      .channel(`task-suggestions-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_relations',
          filter: `child_id=eq.${taskId}`,
        },
        () => {
          console.log('[ParentSuggestions] Task relation added');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          const content = payload.new?.content || '';
          
          // Проверяем, это UI event для нас
          try {
            const eventData = JSON.parse(content);
            console.log('[ParentSuggestions] Received comment, parsed:', eventData);
            if (eventData.type === 'ui_event' && eventData.component === 'ParentSuggestions') {
              console.log('[ParentSuggestions] UI event detected, data:', eventData.data);
              const taskIdsOrObj = eventData.data;
              if (Array.isArray(taskIdsOrObj)) {
                console.log('[ParentSuggestions] Calling loadTasksFromIds with:', taskIdsOrObj);
                loadTasksFromIds(taskIdsOrObj);
              } else if (taskIdsOrObj && typeof taskIdsOrObj === 'object') {
                const idsFromObj = Object.values(taskIdsOrObj).filter((v: any) => typeof v === 'string' && /[0-9a-f-]{36}/i.test(v)) as string[];
                if (idsFromObj.length) {
                  console.log('[ParentSuggestions] Extracted IDs from object data:', idsFromObj);
                  loadTasksFromIds(idsFromObj);
                } else {
                  console.warn('[ParentSuggestions] Object data did not contain UUIDs:', taskIdsOrObj);
                }
              } else {
                console.warn('[ParentSuggestions] data is not an array/object:', taskIdsOrObj);
              }
              return;
            }
            // Также поддерживаем формат, где в JSON есть extracted_variables
            if (eventData.extracted_variables && typeof eventData.extracted_variables === 'object') {
              const ids = Object.values(eventData.extracted_variables).filter((v: any) => typeof v === 'string' && /[0-9a-f-]{36}/i.test(v)) as string[];
              if (ids.length) {
                console.log('[ParentSuggestions] IDs from extracted_variables in comment:', ids);
                loadTasksFromIds(ids);
                return;
              }
            }
          } catch (e) {
            console.log('[ParentSuggestions] Comment is not JSON or parsing failed:', e);
            // Не JSON или обычный комментарий
          }
          
          // Backward compatibility: если пришел обычный коммент от агента — пытаемся забрать последние extracted_variables
          if (content.includes('Структуратор') || content.includes('✅ Триггер') || content.includes('extracted_variables')) {
            console.log('[ParentSuggestions] Trigger-related comment detected, loading from latest execution');
            loadFromLatestExecution();
          } else {
            console.log('[ParentSuggestions] Regular comment received');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  // Proactive load on mount to avoid missing realtime event
  useEffect(() => {
    onLoadRequest?.();
    loadFromLatestExecution();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const loadTasksFromIds = async (taskIds: string[]) => {
    console.log('[ParentSuggestions] loadTasksFromIds called with:', taskIds);
    setLoading(true);
    try {
      // Проверяем, UUID это или названия задач (UUID имеет дефисы)
      const isUUIDs = taskIds.every(id => id.includes('-'));
      
      const { data: tasks, error } = isUUIDs
        ? await supabase
            .from('tasks')
            .select('id, title')
            .in('id', taskIds)
        : await supabase
            .from('tasks')
            .select('id, title')
            .in('title', taskIds);

      if (error) {
        console.error('[ParentSuggestions] Error loading tasks:', error);
        throw error;
      }

      console.log('[ParentSuggestions] Loaded tasks:', tasks);

      if (tasks && tasks.length > 0) {
        const newSuggestions = tasks
          .filter(t => {
            const isCurrentTask = t.id === taskId;
            console.log(`[ParentSuggestions] Task "${t.title}" (${t.id}): isCurrentTask=${isCurrentTask}`);
            return !isCurrentTask;
          })
          .map(t => ({
            id: t.id,
            title: t.title,
            reason: 'Предложено агентом роутинга'
          }));
        
        console.log('[ParentSuggestions] Final suggestions:', newSuggestions);
        setSuggestions(newSuggestions);
      } else {
        console.log('[ParentSuggestions] No tasks loaded or tasks array is empty');
      }
    } catch (error) {
      console.error('Error loading tasks from IDs:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить предложенные задачи",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      onLoadComplete?.();
    }
  };

  // Загружает последние успешные выполнения Структуратора и вытягивает extracted_variables -> UUIDs
  const loadFromLatestExecution = async () => {
    try {
      setLoading(true);
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: recentExecutions, error } = await supabase
        .from('agent_executions')
        .select('context, output_data, created_at')
        .eq('agent_id', '22222222-2222-2222-2222-222222222222')
        .gte('created_at', tenMinutesAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ParentSuggestions] Error loading executions:', error);
        return;
      }

      const exec = (recentExecutions || []).find((e: any) => {
        const ctx = e?.context || {};
        return ctx.task_id === taskId || ctx.source_entity_id === taskId;
      });

      if (!exec) {
        console.log('[ParentSuggestions] No recent execution for this task');
        return;
      }

      const output = exec.output_data as any;
      let ids: string[] = [];

      const extractIds = (obj: any) => {
        try {
          if (!obj) return [] as string[];
          if (typeof obj === 'string') {
            try { obj = JSON.parse(obj); } catch { /* ignore */ }
          }
          const ev = obj?.extracted_variables || obj?.extractedVars || obj?.vars;
          if (ev && typeof ev === 'object') {
            return Object.values(ev).filter((v: any) => typeof v === 'string' && /[0-9a-f-]{36}/i.test(v)) as string[];
          }
          return [] as string[];
        } catch { return [] as string[]; }
      };

      ids = extractIds(output);

      if (ids.length > 0) {
        console.log('[ParentSuggestions] IDs from latest execution:', ids);
        await loadTasksFromIds(ids);
      } else {
        console.log('[ParentSuggestions] No IDs found in extracted_variables');
      }
    } finally {
      setLoading(false);
      onLoadComplete?.();
    }
  };

  const addParent = async (suggestion: SuggestedParent, index: number) => {
    setAddingIndex(index);
    try {
      // Если есть ID существующей задачи, создаем связь напрямую
      if (suggestion.id) {
        const { error: relationError } = await supabase
          .from("task_relations")
          .insert({
            parent_id: suggestion.id,
            child_id: taskId,
          });

        if (relationError) {
          if (relationError.code === "23505") {
            toast({
              title: "Внимание",
              description: "Эта связь уже существует",
              variant: "destructive",
            });
            // Удаляем предложение из списка даже если связь уже есть
            setSuggestions(prev => prev.filter((_, i) => i !== index));
            return;
          }
          throw relationError;
        }

        toast({
          title: "Парент добавлен",
          description: `Задача "${suggestion.title}" добавлена как родительская`,
        });
      } else {
        // Создаём новую задачу-родителя (старая логика)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data: newParent, error: createError } = await supabase
          .from("tasks")
          .insert({
            title: suggestion.title,
            content: suggestion.reason || "",
            column_id: "backlog",
            owner_id: user.id,
            is_root: false,
          })
          .select()
          .single();

        if (createError) throw createError;

        const { error: relationError } = await supabase
          .from("task_relations")
          .insert({
            parent_id: newParent.id,
            child_id: taskId,
          });

        if (relationError) {
          if (relationError.code === "23505") {
            toast({
              title: "Внимание",
              description: "Эта связь уже существует",
              variant: "destructive",
            });
            setSuggestions(prev => prev.filter((_, i) => i !== index));
            return;
          }
          throw relationError;
        }

        toast({
          title: "Парент добавлен",
          description: `Задача "${suggestion.title}" добавлена как родительская`,
        });
      }

      // Удаляем предложение из списка
      setSuggestions(prev => prev.filter((_, i) => i !== index));
      
      onParentAdded?.();
    } catch (error: any) {
      console.error("Error adding parent:", error);
      
      if (error.message?.includes("Circular dependency")) {
        toast({
          title: "Ошибка",
          description: "Обнаружена циклическая зависимость. Эта связь создаст цикл в иерархии задач.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось добавить родительскую задачу",
          variant: "destructive",
        });
      }
    } finally {
      setAddingIndex(null);
    }
  };

  const rejectSuggestion = (index: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Предложение отклонено",
      description: "Задача не будет добавлена как родительская",
    });
  };

  if (loading && suggestions.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Загрузка предложений парентов...</span>
      </div>
    );
  }

  if (suggestions.length === 0 && !loading) {
    return null;
  }

  return (
    <Card className="p-3 border-border">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Предложения парентов от Структуратора</span>
          </div>
          {loading && (
            <div className="flex items-center gap-1 text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs">Загрузка...</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <SuggestedTaskBadge
              key={suggestion.id || index}
              taskId={suggestion.id!}
              title={suggestion.title}
              onApprove={() => addParent(suggestion, index)}
              onReject={() => rejectSuggestion(index)}
              isLoading={addingIndex === index}
            />
          ))}
        </div>
        
      </div>
    </Card>
  );
};
