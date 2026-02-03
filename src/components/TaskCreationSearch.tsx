import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/types/kanban";
import { useToast } from "@/hooks/use-toast";
import { TaskTooltip } from "@/components/TaskTooltip";
import { getCleanTitle } from "@/lib/utils";
import { UnifiedEditor } from "./editor/UnifiedEditor";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskWithParent extends Task {
  parentTitle?: string;
  similarityScore?: number;
  freshnessScore?: number;
  exactMatchScore?: number;
  finalScore?: number;
}

interface TaskCreationSearchProps {
  columnId: string;
  parentTaskId?: string; // Parent task to link to when selecting existing task
  onTaskCreated: (taskId: string, content: string) => void;
  onCancel: () => void;
}

export const TaskCreationSearch = ({
  columnId,
  parentTaskId,
  onTaskCreated,
  onCancel,
}: TaskCreationSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TaskWithParent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [semanticSearchDisabled, setSemanticSearchDisabled] = useState(false);
  const { toast } = useToast();
  const semanticWarnedRef = useRef(false);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    // Debounce to avoid hammering the backend on every keystroke (especially when embeddings are rate-limited).
    const t = window.setTimeout(() => {
      searchTasks();
    }, 250);

    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const searchTasks = async () => {
    setIsSearching(true);
    try {
      const cleanQuery = getCleanTitle(searchQuery, "");

      let tasks: TaskWithParent[] = [];

      // Only search if query is not empty
      if (cleanQuery.trim().length > 0) {
        // Split query into words for better matching
        const words = cleanQuery.trim().split(/\s+/).filter(w => w.length > 1);
        
        // Build OR conditions for each word to match partial terms
        // This handles cases like "hr пла" matching "HR-платформа"
        const orConditions = words.map(word => 
          `title.ilike.%${word}%,content.ilike.%${word}%`
        ).join(',');

        // STEP 1: Fast text search by exact match (ILIKE)
        const { data: textData, error: textError } = await supabase
          .from("tasks")
          .select("*")
          .or(orConditions || `title.ilike.%${cleanQuery}%,content.ilike.%${cleanQuery}%`)
          .limit(20);

        if (textError) throw textError;

        // Process text search results
        const textTasks = await Promise.all(
          (textData || []).map(async (t) => {
            const { data: relationData } = await supabase
              .from("task_relations")
              .select("parent_id")
              .eq("child_id", t.id)
              .limit(1)
              .maybeSingle();

            let parentTitle: string | undefined;
            if (relationData?.parent_id) {
              const { data: parentTask } = await supabase
                .from("tasks")
                .select("title")
                .eq("id", relationData.parent_id)
                .maybeSingle();
              
              parentTitle = parentTask?.title;
            }

            // Calculate text match score based on how many words match
            const titleLower = t.title?.toLowerCase() || '';
            const contentLower = t.content?.toLowerCase() || '';
            
            // Count how many query words appear in title/content
            const matchingWords = words.filter(word => 
              titleLower.includes(word.toLowerCase()) || 
              contentLower.includes(word.toLowerCase())
            );
            
            // Higher score for more matching words and title matches
            const wordMatchRatio = matchingWords.length / words.length;
            const titleMatchBonus = words.some(w => titleLower.includes(w.toLowerCase())) ? 0.15 : 0;
            const allWordsMatch = matchingWords.length === words.length ? 0.2 : 0;
            const exactMatchScore = (wordMatchRatio * 0.15) + titleMatchBonus + allWordsMatch;
            
            // Calculate freshness (20% max, degrading over 30 days)
            const daysSinceUpdate = (Date.now() - new Date(t.updated_at || t.created_at).getTime()) / (1000 * 60 * 60 * 24);
            const freshnessScore = Math.max(0, (1 - daysSinceUpdate / 30) * 0.2);

            return {
              id: t.id,
              title: t.title,
              content: t.content,
              columnId: t.column_id,
              subtaskOrder: t.subtask_order,
              subtasks: [],
              parentTitle,
              similarityScore: 0,
              freshnessScore,
              exactMatchScore,
              finalScore: exactMatchScore + freshnessScore,
            };
          })
        );

        // Sort by final score
        textTasks.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

        // STEP 2: If text search found results, use them. Otherwise, try vector search
        if (textTasks.length > 0) {
          tasks = textTasks;
        } else if (!semanticSearchDisabled) {
          // Only use vector search if text search returned nothing
          const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke(
            'generate-embedding',
            { body: { text: cleanQuery } }
          );

          if (embeddingError) {
            const status = (embeddingError as any)?.context?.status ?? (embeddingError as any)?.status;
            const msg = (embeddingError as any)?.message ?? String(embeddingError);

            // If embeddings quota/rate limit is hit, disable semantic search for this session.
            if (status === 429 || msg.includes('429')) {
              setSemanticSearchDisabled(true);
              if (!semanticWarnedRef.current) {
                semanticWarnedRef.current = true;
                toast({
                  title: "Семантический поиск недоступен",
                  description: "Квота/лимит эмбеддингов исчерпан — использую только текстовый поиск.",
                });
              }
            }
          }

          if (embeddingData?.embedding && !embeddingError) {
            // Use vector search with hybrid ranking
            const { data, error } = await supabase.rpc('search_similar_tasks', {
              query_embedding: embeddingData.embedding,
              query_text: cleanQuery,
              limit_count: 10,
              similarity_threshold: 0.3
            });

            if (error) throw error;

            tasks = await Promise.all(
              (data || []).map(async (t: any) => {
                const { data: relationData } = await supabase
                  .from("task_relations")
                  .select("parent_id")
                  .eq("child_id", t.id)
                  .limit(1)
                  .maybeSingle();

                let parentTitle: string | undefined;
                if (relationData?.parent_id) {
                  const { data: parentTask } = await supabase
                    .from("tasks")
                    .select("title")
                    .eq("id", relationData.parent_id)
                    .maybeSingle();
                  
                  parentTitle = parentTask?.title;
                }

                return {
                  id: t.id,
                  title: t.title,
                  content: t.content,
                  columnId: t.column_id,
                  subtaskOrder: t.subtask_order,
                  subtasks: [],
                  parentTitle,
                  similarityScore: t.similarity_score,
                  freshnessScore: t.freshness_score,
                  exactMatchScore: t.exact_match_score,
                  finalScore: t.final_score,
                };
              })
            );
          }
        }
      } else {
        // Empty query - don't search
        tasks = [];
      }

      setSearchResults(tasks);
    } catch (error) {
      console.error("Error searching tasks:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectExisting = async (task: Task) => {
    try {
      if (!parentTaskId) {
        // No parent - just update column (legacy behavior)
        const { error } = await supabase
          .from("tasks")
          .update({ column_id: columnId })
          .eq("id", task.id);

        if (error) throw error;
      } else {
        // Check if relation already exists
        const { data: existingRelation } = await supabase
          .from("task_relations")
          .select("id")
          .eq("parent_id", parentTaskId)
          .eq("child_id", task.id)
          .maybeSingle();

        if (!existingRelation) {
          // Create parent-child relation (add task to this board)
          const { error: relationError } = await supabase
            .from("task_relations")
            .insert({
              parent_id: parentTaskId,
              child_id: task.id,
            });

          if (relationError) throw relationError;
        }

        // Also update column_id to match the target column
        const { error: updateError } = await supabase
          .from("tasks")
          .update({ column_id: columnId })
          .eq("id", task.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Успешно",
        description: parentTaskId ? "Задача добавлена на доску" : "Задача добавлена в колонку",
      });

      onTaskCreated(task.id, task.title || task.content || "");
    } catch (error) {
      console.error("Error adding task:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить задачу",
        variant: "destructive",
      });
    }
  };

  const handleCreateNew = () => {
    const cleanQuery = getCleanTitle(searchQuery, "");
    if (cleanQuery.trim()) {
      onTaskCreated(columnId, searchQuery);
    }
  };

  return (
    <div className="w-[400px] p-2 bg-card rounded-lg border border-border shadow-sm space-y-2">
      <UnifiedEditor
        content={searchQuery}
        onChange={setSearchQuery}
        placeholder="Введите описание задачи..."
        autoFocus
        singleLine
      />
      
      {searchQuery.trim() && (
        <Command shouldFilter={false} className="rounded-lg border">
          <CommandList className="max-h-[300px]">
            <CommandGroup heading="Создать новую">
              <CommandItem onSelect={handleCreateNew} className="gap-2 cursor-pointer">
                <Plus className="h-4 w-4" />
                <span className="flex-1 truncate">"{getCleanTitle(searchQuery, "")}"</span>
              </CommandItem>
            </CommandGroup>
            
            {searchResults.length > 0 && (
              <CommandGroup heading="Выбрать существующую">
                {searchResults.map((task) => {
                  const cleanTitle = getCleanTitle(task.title, task.title);
                  const truncatedTitle = cleanTitle.length > 30 
                    ? cleanTitle.slice(0, 30) + '...' 
                    : cleanTitle;
                  
                  const cleanParentTitle = task.parentTitle ? getCleanTitle(task.parentTitle, task.parentTitle) : undefined;
                  const truncatedParent = cleanParentTitle && cleanParentTitle.length > 15
                    ? cleanParentTitle.slice(0, 15) + '...'
                    : cleanParentTitle;

                  return (
                    <TaskTooltip key={task.id} title={task.title} content={task.content} taskId={task.id}>
                      <CommandItem
                        onSelect={() => handleSelectExisting(task)}
                        className="gap-2 cursor-pointer"
                      >
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <span className="truncate">{truncatedTitle}</span>
                          {truncatedParent && (
                            <span className="text-xs text-muted-foreground">
                              ← {truncatedParent}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {task.finalScore !== undefined && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Sparkles className="h-3 w-3" />
                                    <span>{Math.round(task.finalScore * 100)}%</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <div className="space-y-1 text-xs">
                                    <p className="font-semibold">Коэффициент похожести:</p>
                                    {task.similarityScore !== undefined && task.similarityScore > 0 && (
                                      <p>• Семантическая схожесть: {Math.round((task.similarityScore || 0) * 100)}% (60%)</p>
                                    )}
                                    {!task.similarityScore && (
                                      <p className="text-muted-foreground italic">• Векторный поиск недоступен (эмбеддинги не сгенерированы)</p>
                                    )}
                                    <p>• Свежесть задачи: {Math.round((task.freshnessScore || 0) * 100)}% (20%)</p>
                                    <p>• Точное вхождение: {Math.round((task.exactMatchScore || 0) * 100)}% (20%)</p>
                                    <p className="pt-1 border-t">Общий балл: {Math.round(task.finalScore * 100)}%</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <span className="text-xs text-muted-foreground">{task.columnId}</span>
                        </div>
                      </CommandItem>
                    </TaskTooltip>
                  );
                })}
              </CommandGroup>
            )}
            
            {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
              <CommandEmpty>Похожие задачи не найдены</CommandEmpty>
            )}
            
            {isSearching && (
              <CommandEmpty>Поиск...</CommandEmpty>
            )}
          </CommandList>
        </Command>
      )}
      
      <div className="flex gap-2">
        <Button size="sm" onClick={handleCreateNew} disabled={!getCleanTitle(searchQuery, "").trim()}>
          Добавить
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
