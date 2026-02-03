import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, User } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { TaskScoreBadge } from "./TaskScoreBadge";

interface TaskScore {
  id: string;
  score: number;
  scored_by: string | null;
  is_manual: boolean;
  reasoning: string | null;
  quality_criteria: string | null;
  created_at: string;
}

interface TaskScoreDialogProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
  onScoreUpdated?: () => void;
}

export const TaskScoreDialog = ({
  taskId,
  isOpen,
  onClose,
  onScoreUpdated,
}: TaskScoreDialogProps) => {
  const [scores, setScores] = useState<TaskScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [manualScore, setManualScore] = useState("");
  const [manualReasoning, setManualReasoning] = useState("");
  const { toast } = useToast();

  const loadScores = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("task_scores")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setScores(data || []);
    } catch (error) {
      console.error("Error loading scores:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить историю оценок",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadScores();
    }
  }, [isOpen, taskId]);

  const handleAIScore = async () => {
    setIsScoring(true);
    try {
      const { data, error } = await supabase.functions.invoke("score-task", {
        body: { taskId, isManual: false },
      });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "AI оценил задачу",
      });

      loadScores();
      if (onScoreUpdated) onScoreUpdated();
    } catch (error) {
      console.error("Error scoring task:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось оценить задачу",
        variant: "destructive",
      });
    } finally {
      setIsScoring(false);
    }
  };

  const handleManualScore = async () => {
    const score = parseFloat(manualScore);
    if (isNaN(score) || score < 0 || score > 5) {
      toast({
        title: "Ошибка",
        description: "Оценка должна быть числом от 0 до 5",
        variant: "destructive",
      });
      return;
    }

    setIsScoring(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("task_scores").insert({
        task_id: taskId,
        score: Math.round(score * 2) / 2, // Округляем до 0.5
        scored_by: user?.id || null,
        is_manual: true,
        reasoning: manualReasoning || "Ручная оценка",
        quality_criteria: null,
      });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Оценка сохранена",
      });

      setManualScore("");
      setManualReasoning("");
      loadScores();
      if (onScoreUpdated) onScoreUpdated();
    } catch (error) {
      console.error("Error saving manual score:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить оценку",
        variant: "destructive",
      });
    } finally {
      setIsScoring(false);
    }
  };

  const latestScore = scores[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Оценка качества задачи</DialogTitle>
          <DialogDescription>
            История оценок и возможность запустить новую оценку
          </DialogDescription>
        </DialogHeader>

        {/* Текущая оценка */}
        {latestScore && (
          <div className="p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-3 mb-2">
              <TaskScoreBadge score={latestScore.score} size="lg" />
              <div>
                <div className="font-semibold text-lg">
                  Текущая оценка: {latestScore.score}/5
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {latestScore.is_manual ? (
                    <>
                      <User className="h-3 w-3" />
                      Ручная оценка
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      AI оценка
                    </>
                  )}
                  {" • "}
                  {format(new Date(latestScore.created_at), "dd MMM yyyy, HH:mm", { locale: ru })}
                </div>
              </div>
            </div>
            {latestScore.reasoning && (
              <p className="text-sm mt-2">{latestScore.reasoning}</p>
            )}
          </div>
        )}

        {/* Действия */}
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Запустить AI оценку</h4>
            <Button
              onClick={handleAIScore}
              disabled={isScoring}
              className="w-full"
            >
              {isScoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Оценка...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Запустить AI оценку
                </>
              )}
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Ручная оценка</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="manual-score">Оценка (0-5)</Label>
                <Input
                  id="manual-score"
                  type="number"
                  min="0"
                  max="5"
                  step="0.5"
                  value={manualScore}
                  onChange={(e) => setManualScore(e.target.value)}
                  placeholder="3.5"
                />
              </div>
              <div>
                <Label htmlFor="manual-reasoning">Обоснование (опционально)</Label>
                <Textarea
                  id="manual-reasoning"
                  value={manualReasoning}
                  onChange={(e) => setManualReasoning(e.target.value)}
                  placeholder="Почему такая оценка?"
                  rows={3}
                />
              </div>
              <Button
                onClick={handleManualScore}
                disabled={!manualScore || isScoring}
                variant="outline"
                className="w-full"
              >
                <User className="h-4 w-4 mr-2" />
                Сохранить оценку
              </Button>
            </div>
          </div>
        </div>

        {/* История оценок */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">История оценок</h4>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : scores.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Нет истории оценок
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {scores.map((score) => (
                <div
                  key={score.id}
                  className="p-3 bg-muted/20 rounded border text-sm"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TaskScoreBadge score={score.score} size="sm" />
                    <span className="font-semibold">{score.score}/5</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {score.is_manual ? (
                        <User className="h-3 w-3" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {format(new Date(score.created_at), "dd MMM yyyy, HH:mm", { locale: ru })}
                    </span>
                  </div>
                  {score.reasoning && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {score.reasoning}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
