import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TaskScoreBadge } from "./TaskScoreBadge";

interface VersionRating {
  id: string;
  rating: number;
  comment: string | null;
  rated_by: string | null;
  created_at: string;
}

interface AgentInputVersionCardProps {
  version: {
    id: string;
    content: string;
    created_at: string;
  };
  onRestore: (versionId: string) => void;
}

export const AgentInputVersionCard = ({
  version,
  onRestore,
}: AgentInputVersionCardProps) => {
  const [ratings, setRatings] = useState<VersionRating[]>([]);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const loadRatings = async () => {
    try {
      const { data, error } = await supabase
        .from("agent_input_version_ratings")
        .select("*")
        .eq("version_id", version.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRatings(data || []);
    } catch (error) {
      console.error("Error loading ratings:", error);
    }
  };

  useEffect(() => {
    loadRatings();
  }, [version.id]);

  const handleSubmitRating = async () => {
    if (newRating === 0) {
      toast({
        title: "Ошибка",
        description: "Выберите оценку от 1 до 5",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("agent_input_version_ratings")
        .insert({
          version_id: version.id,
          rating: newRating,
          comment: newComment || null,
          rated_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Оценка сохранена",
      });

      setNewRating(0);
      setNewComment("");
      setShowRatingForm(false);
      loadRatings();
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить оценку",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    : null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="text-xs text-muted-foreground mb-1">
            {format(new Date(version.created_at), "dd MMM yyyy, HH:mm", { locale: ru })}
          </div>
          <div className="text-sm line-clamp-2 mb-2">
            {version.content.replace(/<[^>]*>/g, "").substring(0, 100)}...
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          {avgRating !== null && (
            <div className="flex items-center gap-1">
              <TaskScoreBadge score={Math.round(avgRating * 10) / 10} size="sm" />
              <span className="text-xs text-muted-foreground">
                ({ratings.length})
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRestore(version.id)}
            className="h-8 w-8 p-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!showRatingForm ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowRatingForm(true)}
        >
          <Star className="h-3 w-3 mr-1" />
          Оценить версию
        </Button>
      ) : (
        <div className="space-y-2 border-t pt-3">
          <div className="flex gap-1 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setNewRating(star)}
                className="transition-all hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-6 w-6",
                    star <= newRating
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Комментарий (опционально)"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowRatingForm(false);
                setNewRating(0);
                setNewComment("");
              }}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitRating}
              disabled={isSubmitting || newRating === 0}
              className="flex-1"
            >
              Сохранить
            </Button>
          </div>
        </div>
      )}

      {ratings.length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            Оценки ({ratings.length})
          </div>
          {ratings.slice(0, 2).map((rating) => (
            <div key={rating.id} className="text-xs bg-muted/50 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <TaskScoreBadge score={rating.rating} size="sm" />
                <span className="font-medium">{rating.rating}/5</span>
              </div>
              {rating.comment && (
                <div className="text-muted-foreground">{rating.comment}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
