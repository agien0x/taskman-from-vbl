import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TimeSelector } from "@/components/TimeSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UnifiedEditor } from "@/components/editor/UnifiedEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { TimeLog } from "@/types/kanban";

interface TimeLogDialogProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TIME_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 6];
const COMPLETION_OPTIONS = [10, 25, 50, 75, 90, 100];

export const TimeLogDialog = ({ taskId, isOpen, onClose, onSuccess }: TimeLogDialogProps) => {
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState<number | null>(null);
  const [completion, setCompletion] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLogs, setTimeLogs] = useState<(TimeLog & { user_name?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadTimeLogs();
    }
  }, [isOpen, taskId]);

  const loadTimeLogs = async () => {
    setIsLoading(true);
    try {
      const { data: logs, error } = await supabase
        .from("time_logs")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (logs) {
        const userIds = [...new Set(logs.map(log => log.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
        
        setTimeLogs(logs.map(log => ({
          ...log,
          user_name: profileMap.get(log.user_id) || "Неизвестный пользователь"
        })));
      }
    } catch (error: any) {
      console.error("Error loading time logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!description || description.length < 30) {
      toast({
        title: "Ошибка",
        description: "Описание должно содержать минимум 30 символов",
        variant: "destructive",
      });
      return;
    }

    if (!hours) {
      toast({
        title: "Ошибка",
        description: "Выберите время",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("time_logs").insert({
        task_id: taskId,
        user_id: user.id,
        hours,
        description,
        completion_percentage: completion,
      });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Время залогировано",
      });

      setDescription("");
      setHours(null);
      setCompletion(null);
      loadTimeLogs();
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Лог времени</DialogTitle>
        </DialogHeader>
        
        {timeLogs.length > 0 && (
          <div className="border-b pb-4">
            <p className="text-xs text-muted-foreground mb-2">История ({timeLogs.length})</p>
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-3">
                {timeLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{log.user_name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {log.hours}ч
                        </Badge>
                        {log.completion_percentage && (
                          <Badge variant="secondary" className="text-xs">
                            {log.completion_percentage}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div 
                      className="text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: log.description }}
                    />
                    <p className="text-muted-foreground text-[10px]">
                      {format(new Date(log.created_at), "dd.MM.yyyy HH:mm")}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="space-y-4 flex-1 overflow-auto">
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Описание работы</label>
            <UnifiedEditor
              content={description}
              onChange={setDescription}
              placeholder="Опишите выполненную работу (минимум 30 символов)..."
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/30 символов
            </p>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-2 block">Время</label>
              <TimeSelector
                value={hours}
                onChange={setHours}
                options={TIME_OPTIONS}
                placeholder="Выбрать"
              />
            </div>

            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-2 block">Прогресс</label>
              <Select
                value={completion?.toString() || ""}
                onValueChange={(val) => setCompletion(val ? parseInt(val) : null)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Выбрать">
                    {completion ? `${completion}%` : "Выбрать"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COMPLETION_OPTIONS.map((pct) => (
                    <SelectItem key={pct} value={pct.toString()} className="text-xs">
                      {pct}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Отмена
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
