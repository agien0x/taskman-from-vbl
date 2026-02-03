import { useState, useEffect } from "react";

interface AgentRating {
  id: string;
  agent_id: string;
  rating: number;
  comment: string | null;
  rated_by: string | null;
  rated_at: string;
  created_at: string;
}

export const useAgentRatings = (
  agentId: string,
  supabaseClient: any,
  toast: (props: { title?: string; description?: string; variant?: string }) => void
) => {
  const [ratings, setRatings] = useState<AgentRating[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (agentId) {
      loadRatings();
    }
  }, [agentId]);

  const loadRatings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabaseClient
        .from("agent_ratings")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setRatings(data || []);
      
      if (data && data.length > 0) {
        const avg = data.reduce((sum: number, r: AgentRating) => sum + r.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
      } else {
        setAverageRating(0);
      }
    } catch (error) {
      console.error("Error loading agent ratings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addRating = async (rating: number, comment?: string) => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      const { error } = await supabaseClient
        .from("agent_ratings")
        .insert({
          agent_id: agentId,
          rating,
          comment: comment || null,
          rated_by: user?.id,
        });

      if (error) throw error;

      await loadRatings();

      toast({
        title: "Успешно",
        description: "Оценка добавлена",
      });
    } catch (error) {
      console.error("Error adding rating:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить оценку",
        variant: "destructive",
      });
    }
  };

  return {
    ratings,
    averageRating,
    isLoading,
    addRating,
    loadRatings,
  };
};