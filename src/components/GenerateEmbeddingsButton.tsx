import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EmbeddingStats {
  total: number;
  withEmbeddings: number;
  withoutEmbeddings: number;
}

export const GenerateEmbeddingsButton = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      // Use direct count queries
      const { count: totalCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });

      const { count: withEmbeddings } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .not('content_embedding', 'is', null);

      setStats({
        total: totalCount || 0,
        withEmbeddings: withEmbeddings || 0,
        withoutEmbeddings: (totalCount || 0) - (withEmbeddings || 0),
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleGenerate = async () => {
    if (!stats || stats.withoutEmbeddings === 0) {
      toast({
        title: "Нечего обрабатывать",
        description: "Все задачи уже имеют эмбеддинги",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'generate-all-embeddings'
      );

      if (error) throw error;

      toast({
        title: "Успешно",
        description: `Обработано задач: ${data.processed}${data.errors ? `, ошибок: ${data.errors}` : ''}. Всего задач: ${data.total}`,
      });

      // Reload stats after generation
      await loadStats();
    } catch (error) {
      console.error('Error generating embeddings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать эмбеддинги",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const percentage = stats ? Math.round((stats.withEmbeddings / stats.total) * 100) : 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || isLoadingStats || (stats?.withoutEmbeddings === 0)}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {stats && (
                  <span className="text-xs">
                    {stats.withEmbeddings}/{stats.total}
                  </span>
                )}
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-semibold">Статистика эмбеддингов:</p>
            {isLoadingStats ? (
              <p>Загрузка...</p>
            ) : stats ? (
              <>
                <p>• Всего задач: {stats.total}</p>
                <p>• С эмбеддингами: {stats.withEmbeddings} ({percentage}%)</p>
                <p>• Без эмбеддингов: {stats.withoutEmbeddings}</p>
                {stats.withoutEmbeddings > 0 && (
                  <p className="pt-1 border-t text-muted-foreground">
                    Нажмите чтобы сгенерировать эмбеддинги для {stats.withoutEmbeddings} задач
                  </p>
                )}
                {stats.withoutEmbeddings === 0 && (
                  <p className="pt-1 border-t text-green-600">
                    ✓ Все задачи имеют эмбеддинги
                  </p>
                )}
              </>
            ) : (
              <p>Не удалось загрузить статистику</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
