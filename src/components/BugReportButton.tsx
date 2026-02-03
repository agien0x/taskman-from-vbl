import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UnifiedEditor } from "./editor/UnifiedEditor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ParentSuggestions } from "./ParentSuggestions";

export const BugReportButton = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<any>(null);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [createdTaskTitle, setCreatedTaskTitle] = useState<string>("");
  const [showParentSuggestions, setShowParentSuggestions] = useState(false);
  const [loadingParentSuggestions, setLoadingParentSuggestions] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите описание",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const logs: any = {
      timestamp: new Date().toISOString(),
      steps: []
    };

    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      logs.steps.push({
        step: "1. Проверка авторизации",
        userId: userId,
        timestamp: new Date().toISOString()
      });

      // Вызываем агента "Структуратор" для генерации заголовка
      const agentInput = {
        agentId: "22222222-2222-2222-2222-222222222222",
        input: content.trim()
      };

      logs.steps.push({
        step: "2. Вызов агента 'Структуратор'",
        agent_name: "Структуратор",
        agent_id: "22222222-2222-2222-2222-222222222222",
        input: {
          raw_content: content.trim()
        },
        timestamp: new Date().toISOString()
      });

      const { data: agentResponse, error: agentError } = await supabase.functions.invoke('test-agent', {
        body: agentInput
      });

      if (agentError) {
        logs.steps.push({
          step: "2.1. ОШИБКА агента",
          error: {
            name: agentError.name,
            message: agentError.message,
            context: agentError.context,
            details: agentError
          },
          timestamp: new Date().toISOString()
        });
        console.error("Agent error:", agentError);
        throw agentError;
      }

      logs.steps.push({
        step: "2.2. Ответ агента получен",
        output: agentResponse,
        timestamp: new Date().toISOString()
      });

      let taskTitle = "Без названия";
      let taskContent = content;

      // Парсим ответ агента (ожидаем JSON с title и content)
      if (agentResponse?.output) {
        try {
          const jsonMatch = agentResponse.output.match(/\{[\s\S]*"title"[\s\S]*"content"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            taskTitle = parsed.title || taskTitle;
            taskContent = parsed.content || taskContent;
            
            logs.steps.push({
              step: "3. Парсинг ответа агента",
              input: {
                raw_output: agentResponse.output
              },
              output: {
                parsed_title: taskTitle,
                parsed_content: taskContent
              },
              timestamp: new Date().toISOString()
            });
          }
        } catch (e) {
          logs.steps.push({
            step: "3.1. ОШИБКА парсинга",
            input: {
              raw_output: agentResponse?.output
            },
            error: String(e),
            timestamp: new Date().toISOString()
          });
          console.warn("Could not parse agent response:", e);
        }
      }

      // Создаем задачу
      const taskInsertData = {
        title: taskTitle,
        content: taskContent,
        column_id: "todo",
        owner_id: userId,
      };

      logs.steps.push({
        step: "4. Создание задачи",
        input: taskInsertData,
        timestamp: new Date().toISOString()
      });

      const { data: newTask, error: taskError } = await supabase
        .from("tasks")
        .insert(taskInsertData)
        .select()
        .single();

      if (taskError) {
        logs.steps.push({
          step: "4.1. ОШИБКА создания задачи",
          error: {
            message: taskError.message,
            details: taskError.details,
            hint: taskError.hint,
            code: taskError.code
          },
          timestamp: new Date().toISOString()
        });
        throw taskError;
      }

      logs.steps.push({
        step: "4.2. Задача создана",
        output: {
          task_id: newTask.id,
          task_title: newTask.title,
          task_column: newTask.column_id
        },
        timestamp: new Date().toISOString()
      });

      // Добавляем связь с задачей "Баги"
      const BUGS_TASK_ID = "00000000-0000-0000-0000-000000000001";
      const relationData = {
        parent_id: BUGS_TASK_ID,
        child_id: newTask.id,
      };

      logs.steps.push({
        step: "5. Создание связи с 'Баги'",
        input: {
          parent_task_id: BUGS_TASK_ID,
          child_task_id: newTask.id
        },
        timestamp: new Date().toISOString()
      });

      const { error: relationError } = await supabase
        .from("task_relations")
        .insert(relationData);

      if (relationError) {
        logs.steps.push({
          step: "5.1. ОШИБКА создания связи",
          error: {
            message: relationError.message,
            details: relationError.details,
            hint: relationError.hint,
            code: relationError.code
          },
          timestamp: new Date().toISOString()
        });
        console.error("Error creating bug relation:", relationError);
      } else {
        logs.steps.push({
          step: "5.2. Связь создана",
          output: {
            parent_task: "Баги",
            child_task: newTask.id
          },
          timestamp: new Date().toISOString()
        });
      }

      logs.status = "SUCCESS";
      logs.summary = {
        total_steps: logs.steps.length,
        duration_ms: Date.now() - new Date(logs.timestamp).getTime(),
        created_task_id: newTask.id
      };
      setExecutionLogs(logs);
      setShowLogs(true);
      
      // Сохраняем ID и заголовок созданной задачи для ParentSuggestions
      // ParentSuggestions покажется автоматически через realtime подписку
      setCreatedTaskId(newTask.id);
      setCreatedTaskTitle(taskTitle);

      toast({
        title: "Успешно",
        description: "Баг отправлен",
      });
    } catch (error: any) {
      logs.status = "ERROR";
      logs.steps.push({
        step: "КРИТИЧЕСКАЯ ОШИБКА",
        error: {
          name: error?.name || "UnknownError",
          message: error?.message || String(error),
          stack: error?.stack,
          context: error?.context,
          full_error: error
        },
        timestamp: new Date().toISOString()
      });
      logs.summary = {
        total_steps: logs.steps.length,
        duration_ms: Date.now() - new Date(logs.timestamp).getTime(),
        error_message: error?.message || String(error)
      };
      setExecutionLogs(logs);
      setShowLogs(true);

      console.error("Error creating bug:", error);
      toast({
        title: "Ошибка",
        description: error?.message || "Не удалось создать задачу",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setShowLogs(false);
    setExecutionLogs(null);
    setContent("");
    setCreatedTaskId(null);
    setCreatedTaskTitle("");
    setShowParentSuggestions(false);
    setLoadingParentSuggestions(false);
  };
  
  // Realtime подписка для автоматического показа ParentSuggestions
  useEffect(() => {
    if (!createdTaskId) return;
    
    const channel = supabase
      .channel(`bug-task-comments-${createdTaskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${createdTaskId}`,
        },
        (payload) => {
          const content = (payload as any)?.new?.content || '';
          if (content.includes('Структуратор') || content.includes('✅ Триггер')) {
            setLoadingParentSuggestions(true);
            setShowParentSuggestions(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [createdTaskId]);

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        size="sm"
        className="fixed right-0 top-1/2 -translate-y-1/2 rounded-l-full rounded-r-none bg-destructive/90 hover:bg-destructive text-white shadow-lg z-50 pl-3 pr-2 py-6"
        title="Сообщить о баге или фичи"
      >
        <Bug className="h-5 w-5" />
      </Button>
      
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          handleReset();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Сообщить о баге или фиче</DialogTitle>
            <DialogDescription>
              {showLogs ? "Логи выполнения агентов" : "Опишите проблему или идею - агент автоматически создаст заголовок"}
            </DialogDescription>
          </DialogHeader>
          
          {!showLogs ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Описание</label>
                <div className="mt-1 border rounded-md">
                  <UnifiedEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Подробно опишите проблему или идею для улучшения..."
                    minimal
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Отмена
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Отправка..." : "Отправить"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-auto space-y-4">
                {/* Логи выполнения */}
                <div className="bg-muted/50 rounded-md p-4">
                  <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                    {JSON.stringify(executionLogs, null, 2)}
                  </pre>
                </div>
                
                {/* Parent Suggestions */}
                {showParentSuggestions && createdTaskId && (
                  <ParentSuggestions
                    taskId={createdTaskId}
                    currentTitle={createdTaskTitle}
                    currentContent={content}
                    onParentAdded={() => {
                      toast({
                        title: "Парент добавлен",
                        description: "Связь с родительской задачей создана",
                      });
                    }}
                    onLoadRequest={() => setLoadingParentSuggestions(true)}
                    onLoadComplete={() => setLoadingParentSuggestions(false)}
                  />
                )}
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={handleReset}
                >
                  Создать еще один баг
                </Button>
                <Button
                  onClick={() => setIsDialogOpen(false)}
                >
                  Закрыть
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
