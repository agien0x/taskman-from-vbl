import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ScoreExecutionView } from "./execution-views/ScoreExecutionView";
import { format } from "date-fns";

interface Execution {
  id: string;
  execution_type: string;
  input_data: any;
  output_data: any;
  context: any;
  rating: number | null;
  rating_comment: string | null;
  duration_ms: number;
  status: string;
  error_message: string | null;
  created_at: string;
  modules_chain?: any[];
}

interface AgentExecutionDetailProps {
  execution: Execution;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function AgentExecutionDetail({
  execution,
  open,
  onOpenChange,
  onUpdate,
}: AgentExecutionDetailProps) {
  const [rating, setRating] = useState(execution.rating || 0);
  const [comment, setComment] = useState(execution.rating_comment || "");
  const [saving, setSaving] = useState(false);

  const handleSaveRating = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("agent_executions")
        .update({
          rating,
          rating_comment: comment,
          rated_by: user?.id,
          rated_at: new Date().toISOString(),
        })
        .eq("id", execution.id);

      if (error) throw error;

      toast.success("Оценка сохранена");
      onUpdate();
    } catch (error) {
      console.error("Error saving rating:", error);
      toast.error("Не удалось сохранить оценку");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Детали выполнения</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Тип:</span> {execution.execution_type}
            </div>
            <div>
              <span className="font-medium">Статус:</span> {execution.status}
            </div>
            <div>
              <span className="font-medium">Длительность:</span> {execution.duration_ms}ms
            </div>
            <div>
              <span className="font-medium">Создано:</span>{" "}
              {format(new Date(execution.created_at), "dd MMM yyyy HH:mm:ss")}
            </div>
          </div>

          {/* Specialized view based on execution type */}
          {execution.execution_type === "score" && (
            <ScoreExecutionView execution={execution} />
          )}

          {/* Generic JSON view for other types */}
          {execution.execution_type !== "score" && (
              <>
              {/* Modules Chain Section */}
              {execution.modules_chain && execution.modules_chain.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <span className="text-primary">🔗</span>
                    Цепочка модулей ({execution.modules_chain.length})
                  </h3>
                  <div className="space-y-3">
                    {execution.modules_chain.map((module: any, index: number) => {
                      // Module type icons and colors
                      const getModuleIcon = (type: string) => {
                        switch (type) {
                          case 'trigger': return '⚡';
                          case 'inputs': return '📥';
                          case 'prompt': return '📝';
                          case 'model': return '🤖';
                          case 'llm_execution': return '💬';
                          case 'json_extractor': return '🔍';
                          case 'router': return '🔀';
                          case 'destinations': return '📤';
                          default: return '•';
                        }
                      };

                      const getStatusColor = (status?: string) => {
                        switch (status) {
                          case 'success': return 'text-green-600';
                          case 'error': case 'failed': return 'text-yellow-600';
                          case 'skipped': return 'text-yellow-600';
                          default: return 'text-primary';
                        }
                      };

                      return (
                        <div 
                          key={index}
                          className="relative pl-8 pb-4 border-l-2 border-primary/30 last:border-l-0 last:pb-0"
                        >
                          <div className={`absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full ${getStatusColor(module.status)} bg-background border-2`} />
                          
                          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{getModuleIcon(module.type)}</span>
                                <span className="font-medium text-sm">{module.name}</span>
                                {module.status && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${getStatusColor(module.status)} bg-background`}>
                                    {module.status}
                                  </span>
                                )}
                              </div>
                              {module.duration_ms && (
                                <span className="text-xs text-muted-foreground">
                                  {module.duration_ms}ms
                                </span>
                              )}
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                              {new Date(module.timestamp).toLocaleTimeString('ru-RU')}
                            </div>

                            {module.config && Object.keys(module.config).length > 0 && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                  Конфигурация модуля
                                </summary>
                                <pre className="mt-2 bg-background p-2 rounded text-[10px] overflow-x-auto">
                                  {JSON.stringify(module.config, null, 2)}
                                </pre>
                              </details>
                            )}
                            
                            {module.input && Object.keys(module.input).length > 0 && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                  📥 Вход ({Object.keys(module.input).length} параметров)
                                </summary>
                                <pre className="mt-2 bg-background p-2 rounded text-[10px] overflow-x-auto">
                                  {JSON.stringify(module.input, null, 2)}
                                </pre>
                              </details>
                            )}
                            
                            {module.output && Object.keys(module.output).length > 0 && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                  📤 Выход ({Object.keys(module.output).length} параметров)
                                </summary>
                                <pre className="mt-2 bg-background p-2 rounded text-[10px] overflow-x-auto">
                                  {JSON.stringify(module.output, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-medium mb-2">Данные инпута</h3>
                <ScrollArea className="h-[200px] w-full">
                  <pre className="bg-muted p-4 rounded-lg text-xs font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(execution.input_data, null, 2)}
                  </pre>
                </ScrollArea>
              </div>

              <div>
                <h3 className="font-medium mb-2">Данные аутпута</h3>
                {execution.status === "error" ? (
                  <ScrollArea className="h-[200px] w-full">
                    <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
                      {execution.error_message}
                    </div>
                  </ScrollArea>
                ) : (
                  <ScrollArea className="h-[200px] w-full">
                    <pre className="bg-muted p-4 rounded-lg text-xs font-mono whitespace-pre-wrap break-words">
                      {JSON.stringify(execution.output_data, null, 2)}
                    </pre>
                  </ScrollArea>
                )}
              </div>

              {Object.keys(execution.context).length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Контекст</h3>
                  <ScrollArea className="h-[200px] w-full">
                    <pre className="bg-muted p-4 rounded-lg text-xs font-mono whitespace-pre-wrap break-words">
                      {JSON.stringify(execution.context, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </>
          )}

          {/* Rating section */}
          <div className="border-t pt-6">
            <h3 className="font-medium mb-4">Оцените это выполнение</h3>
            
            <div className="flex gap-2 mb-4">
              {[0, 1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-all hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-8 w-8",
                      star <= rating
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
            </div>

            <Textarea
              placeholder="Добавьте комментарий к этому выполнению..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mb-4"
              rows={3}
            />

            <Button onClick={handleSaveRating} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить оценку"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
