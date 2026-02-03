import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ChevronDown, Play, Edit3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

interface TaskBulkActionsProps {
  selectedTasks: string[];
  onActionsComplete: () => void;
}

interface Agent {
  id: string;
  name: string;
  pitch?: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

export function TaskBulkActions({ selectedTasks, onActionsComplete }: TaskBulkActionsProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateField, setUpdateField] = useState<string>("");
  const [updateValue, setUpdateValue] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadAgents();
    loadProfiles();
  }, []);

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("id, name, pitch")
        .order("name");

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error("Error loading agents:", error);
    }
  };

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  const handleTriggerAgent = async (agentId: string, agentName: string) => {
    try {
      toast({
        title: "Запуск агента",
        description: `Запускаем ${agentName} для ${selectedTasks.length} задач...`,
      });

      let successCount = 0;
      let errorCount = 0;

      for (const taskId of selectedTasks) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-and-execute-triggers`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                triggerType: "on_demand",
                sourceEntity: {
                  type: "tasks",
                  id: taskId,
                },
                agentId: agentId,
              }),
            }
          );

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Error executing agent for task ${taskId}:`, error);
          errorCount++;
        }
      }

      toast({
        title: "Агент выполнен",
        description: `Успешно: ${successCount}, Ошибок: ${errorCount}`,
        variant: errorCount > 0 ? "destructive" : "default",
      });

      onActionsComplete();
    } catch (error) {
      console.error("Error triggering agent:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось запустить агента",
        variant: "destructive",
      });
    }
  };

  const handleBulkUpdate = async () => {
    if (!updateField || !updateValue) {
      toast({
        title: "Ошибка",
        description: "Выберите поле и введите значение",
        variant: "destructive",
      });
      return;
    }

    try {
      const updates: Record<string, any> = {};
      
      // Map field names to database columns
      switch (updateField) {
        case "priority":
          updates.priority = updateValue;
          break;
        case "owner_id":
          updates.owner_id = updateValue === "null" ? null : updateValue;
          break;
        case "column_id":
          updates.column_id = updateValue;
          break;
        case "pitch":
          updates.pitch = updateValue;
          break;
        case "title":
          updates.title = updateValue;
          break;
        case "content":
          updates.content = updateValue;
          break;
        case "start_date":
          updates.start_date = updateValue || null;
          break;
        case "end_date":
          updates.end_date = updateValue || null;
          break;
        case "planned_hours":
          updates.planned_hours = updateValue ? parseFloat(updateValue) : null;
          break;
        case "task_type":
          updates.task_type = updateValue;
          break;
        case "custom_quality_criteria":
          updates.custom_quality_criteria = updateValue;
          break;
        case "duplicates":
          try {
            updates.duplicates = JSON.parse(updateValue);
          } catch {
            toast({
              title: "Ошибка",
              description: "Неверный формат JSON для дублей",
              variant: "destructive",
            });
            return;
          }
          break;
        default:
          toast({
            title: "Ошибка",
            description: "Неизвестное поле",
            variant: "destructive",
          });
          return;
      }

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .in("id", selectedTasks);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: `Обновлено задач: ${selectedTasks.length}`,
      });

      setShowUpdateDialog(false);
      setUpdateField("");
      setUpdateValue("");
      onActionsComplete();
    } catch (error) {
      console.error("Error bulk updating tasks:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить задачи",
        variant: "destructive",
      });
    }
  };

  if (selectedTasks.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 p-2 bg-accent/50 rounded-lg border">
        <span className="text-sm font-medium">
          Выбрано: {selectedTasks.length}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="secondary">
              Действия
              <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Массовые действия</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => setShowUpdateDialog(true)}>
              <Edit3 className="h-4 w-4 mr-2" />
              Обновить поля
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Play className="h-4 w-4 mr-2" />
                Запустить агента
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {agents.map((agent) => (
                  <DropdownMenuItem
                    key={agent.id}
                    onClick={() => handleTriggerAgent(agent.id, agent.name)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{agent.name}</span>
                      {agent.pitch && (
                        <span className="text-xs text-muted-foreground">{agent.pitch}</span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                {agents.length === 0 && (
                  <DropdownMenuItem disabled>
                    Нет доступных агентов
                  </DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Обновить поля задач</DialogTitle>
            <DialogDescription>
              Обновить выбранные поля для {selectedTasks.length} задач
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Поле</Label>
              <Select value={updateField} onValueChange={(value) => {
                setUpdateField(value);
                setUpdateValue("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите поле" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Название</SelectItem>
                  <SelectItem value="content">Содержимое</SelectItem>
                  <SelectItem value="pitch">Питч</SelectItem>
                  <SelectItem value="priority">Приоритет</SelectItem>
                  <SelectItem value="owner_id">Владелец</SelectItem>
                  <SelectItem value="column_id">Статус</SelectItem>
                  <SelectItem value="start_date">Дата начала</SelectItem>
                  <SelectItem value="end_date">Дата окончания</SelectItem>
                  <SelectItem value="planned_hours">Плановые часы</SelectItem>
                  <SelectItem value="task_type">Тип задачи</SelectItem>
                  <SelectItem value="custom_quality_criteria">Критерии качества</SelectItem>
                  <SelectItem value="duplicates">Дубли</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Значение</Label>
              {updateField === "priority" ? (
                <Select value={updateValue} onValueChange={setUpdateValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите приоритет" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Нет</SelectItem>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                  </SelectContent>
                </Select>
              ) : updateField === "owner_id" ? (
                <Select value={updateValue} onValueChange={setUpdateValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите владельца" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Без владельца</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.user_id} value={profile.user_id}>
                        {profile.full_name || "Без имени"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : updateField === "task_type" ? (
                <Select value={updateValue} onValueChange={setUpdateValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Задача</SelectItem>
                    <SelectItem value="personal_board">Личная доска</SelectItem>
                    <SelectItem value="standard">Стандартная</SelectItem>
                    <SelectItem value="function">Функция</SelectItem>
                    <SelectItem value="standup">Стендап</SelectItem>
                  </SelectContent>
                </Select>
              ) : updateField === "start_date" || updateField === "end_date" ? (
                <Input
                  type="datetime-local"
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                />
              ) : updateField === "planned_hours" ? (
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                  placeholder="Введите количество часов"
                />
              ) : updateField === "content" || updateField === "custom_quality_criteria" ? (
                <Textarea
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                  placeholder="Введите текст"
                  rows={4}
                />
              ) : updateField === "duplicates" ? (
                <Textarea
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                  placeholder='[{"id": "uuid-1"}, {"id": "uuid-2"}]'
                  rows={3}
                />
              ) : (
                <Input
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                  placeholder="Введите значение"
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleBulkUpdate}>
              Обновить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
