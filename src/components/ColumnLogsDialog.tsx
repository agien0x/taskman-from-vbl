import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface ColumnLog {
  id: string;
  action: string;
  column_id: string | null;
  column_title: string | null;
  old_value: string | null;
  new_value: string | null;
  user_id: string | null;
  created_at: string;
}

interface ColumnLogsDialogProps {
  taskId: string;
}

export const ColumnLogsDialog = ({ taskId }: ColumnLogsDialogProps) => {
  const [logs, setLogs] = useState<ColumnLog[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("column_logs")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      console.log("Loaded column logs:", data?.length || 0, "entries");
      setLogs(data || []);
    } catch (error) {
      console.error("Error loading column logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, taskId]);

  const getActionText = (log: ColumnLog) => {
    switch (log.action) {
      case "created":
        return `Создан стейдж "${log.column_title || log.new_value}"`;
      case "deleted":
        return `Удалён стейдж "${log.column_title || log.old_value}"`;
      case "renamed":
        return `Переименован стейдж с "${log.old_value}" на "${log.new_value}"`;
      case "reset":
        return "Стейджи сброшены к дефолтным";
      case "saved":
        return `Сохранены изменения: ${log.column_title}`;
      case "collapsed":
        return `Стейдж "${log.column_title}" сужен`;
      case "expanded":
        return `Стейдж "${log.column_title}" развёрнут`;
      default:
        return `${log.action}: ${log.column_title || log.column_id}`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2">
          <FileText className="h-3.5 w-3.5" />
          <span className="text-xs ml-1">История</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>История изменений стейджей</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              История изменений пуста
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 border rounded-lg bg-card text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium mb-1">{getActionText(log)}</div>
                      {log.column_id && (
                        <div className="text-xs text-muted-foreground">
                          ID: {log.column_id}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "dd.MM.yyyy HH:mm", {
                        locale: ru,
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
