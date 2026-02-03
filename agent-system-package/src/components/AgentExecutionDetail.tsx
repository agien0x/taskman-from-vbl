import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Star } from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { Badge } from "./ui/badge";
import { ScoreExecutionView } from "./execution-views/ScoreExecutionView";

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
  supabaseClient: any;
  toast: (props: { title?: string; description?: string; variant?: string }) => void;
}

export function AgentExecutionDetail({
  execution,
  open,
  onOpenChange,
  onUpdate,
  supabaseClient,
  toast,
}: AgentExecutionDetailProps) {
  const [rating, setRating] = useState(execution.rating || 0);
  const [comment, setComment] = useState(execution.rating_comment || "");
  const [saving, setSaving] = useState(false);

  const handleSaveRating = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      const { error } = await supabaseClient
        .from("agent_executions")
        .update({
          rating,
          rating_comment: comment,
          rated_by: user?.id,
          rated_at: new Date().toISOString(),
        })
        .eq("id", execution.id);

      if (error) throw error;

      toast({ title: "Оценка сохранена" });
      onUpdate();
    } catch (error) {
      console.error("Error saving rating:", error);
      toast({ title: "Не удалось сохранить оценку", variant: "destructive" });
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

          {/* Modules Chain */}
          {execution.modules_chain && execution.modules_chain.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <span className="text-primary">🔗</span>
                Цепочка модулей ({execution.modules_chain.length})
              </h3>
              <div className="space-y-3">
                {execution.modules_chain.map((module: any, index: number) => {
                  const getModuleIcon = (type: string) => {
                    const icons: Record<string, string> = {
                      trigger: '⚡', inputs: '📥', prompt: '📝', model: '🤖',
                      llm_execution: '💬', json_extractor: '🔍', router: '🔀', destinations: '📤'
                    };
                    return icons[type] || '•';
                  };

                  const getStatusColor = (status?: string) => {
                    if (status === 'success') return 'text-green-600';
                    if (status === 'error' || status === 'failed') return 'text-red-600';
                    if (status === 'skipped') return 'text-yellow-600';
                    return 'text-primary';
                  };

                  return (
                    <div key={index} className="relative pl-8 pb-4 border-l-2 border-primary/30 last:border-l-0 last:pb-0">
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
                          {module.duration_ms && <span className="text-xs text-muted-foreground">{module.duration_ms}ms</span>}
                        </div>
                        
                        {module.input && Object.keys(module.input).length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Входные данные</summary>
                            <pre className="mt-2 bg-background p-2 rounded text-[10px] overflow-x-auto max-h-32">
                              {JSON.stringify(module.input, null, 2)}
                            </pre>
                          </details>
                        )}
                        
                        {module.output && (
                          <div className="text-xs">
                            <div className="font-medium mb-1">Результат:</div>
                            <div className="bg-background p-2 rounded">
                              {module.type === 'model' || module.type === 'llm_execution' ? (
                                <div className="text-foreground whitespace-pre-wrap">{module.output}</div>
                              ) : (
                                <pre className="text-[10px] overflow-x-auto max-h-32">{JSON.stringify(module.output, null, 2)}</pre>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Score Execution View */}
          {execution.execution_type === "score" && (
            <ScoreExecutionView execution={execution} />
          )}

          {/* Input Data */}
          <div>
            <h3 className="font-medium mb-2">Входные данные</h3>
            <ScrollArea className="h-[150px]">
              <pre className="text-xs bg-muted p-4 rounded">
                {JSON.stringify(execution.input_data, null, 2)}
              </pre>
            </ScrollArea>
          </div>

          {/* Output Data */}
          <div>
            <h3 className="font-medium mb-2">Выходные данные</h3>
            <ScrollArea className="h-[150px]">
              <pre className="text-xs bg-muted p-4 rounded">
                {JSON.stringify(execution.output_data, null, 2)}
              </pre>
            </ScrollArea>
          </div>

          {/* Error Message */}
          {execution.error_message && (
            <div>
              <h3 className="font-medium mb-2 text-destructive">Ошибка</h3>
              <div className="text-sm bg-destructive/10 text-destructive p-4 rounded">
                {execution.error_message}
              </div>
            </div>
          )}

          {/* Rating */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Оценка выполнения</h3>
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setRating(value)}
                  className={cn(
                    "transition-colors",
                    value <= rating ? "text-yellow-500" : "text-muted"
                  )}
                >
                  <Star className="w-6 h-6" fill={value <= rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Комментарий к оценке (необязательно)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mb-4"
            />
            <Button onClick={handleSaveRating} disabled={saving || rating === 0}>
              {saving ? "Сохранение..." : "Сохранить оценку"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
