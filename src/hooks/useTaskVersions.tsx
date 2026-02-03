import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type TaskVersion = Database['public']['Tables']['task_versions']['Row'];

const MAX_VERSIONS = 5;

export const useTaskVersions = (taskId: string) => {
  const [versions, setVersions] = useState<TaskVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [embeddingsDisabled, setEmbeddingsDisabled] = useState(false);
  const { toast } = useToast();
  const embeddingWarnedRef = useRef(false);

  useEffect(() => {
    if (taskId) {
      loadVersions();
    }
  }, [taskId]);

  const loadVersions = async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_versions')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(MAX_VERSIONS);

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveVersion = async (content: string) => {
    try {
      // Clean HTML and check if content is not empty
      const cleanContent = content.replace(/<[^>]*>/g, '').trim();
      
      let embeddingData = null;
      
      // Only generate embedding if there's actual text content
      // and embeddings are not disabled due to quota/rate-limits.
      if (!embeddingsDisabled && cleanContent.length > 0) {
        const result = await supabase.functions.invoke(
          'generate-embedding',
          { body: { text: cleanContent } }
        );
        
        if (result.error) {
          console.error('Error generating embedding:', result.error);

          const status = (result.error as any)?.context?.status ?? (result.error as any)?.status;
          const msg = (result.error as any)?.message ?? String(result.error);
          if (status === 429 || msg.includes('429')) {
            setEmbeddingsDisabled(true);
            if (!embeddingWarnedRef.current) {
              embeddingWarnedRef.current = true;
              toast({
                title: 'Эмбеддинги временно недоступны',
                description: 'Квота/лимит исчерпан — сохраню версию без семантического поиска.',
              });
            }
          }
        } else {
          embeddingData = result.data;
        }
      }

      // Insert new version with embedding
      const { error: insertError } = await supabase
        .from('task_versions')
        .insert({ 
          task_id: taskId, 
          content,
          embedding: embeddingData?.embedding || null
        });

      if (insertError) throw insertError;

      // Also update the main task's embedding
      if (embeddingData?.embedding) {
        await supabase
          .from('tasks')
          .update({ content_embedding: embeddingData.embedding })
          .eq('id', taskId);
      }

      // Get all versions for this task
      const { data: allVersions, error: fetchError } = await supabase
        .from('task_versions')
        .select('id')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Delete old versions if we have more than MAX_VERSIONS
      if (allVersions && allVersions.length > MAX_VERSIONS) {
        const versionsToDelete = allVersions.slice(MAX_VERSIONS).map(v => v.id);
        const { error: deleteError } = await supabase
          .from('task_versions')
          .delete()
          .in('id', versionsToDelete);

        if (deleteError) throw deleteError;
      }

      await loadVersions();
    } catch (error) {
      console.error('Error saving version:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить версию',
        variant: 'destructive',
      });
    }
  };

  const restoreVersion = async (versionId: string) => {
    try {
      const version = versions.find(v => v.id === versionId);
      if (!version) return null;

      const { error } = await supabase
        .from('tasks')
        .update({ content: version.content })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Версия восстановлена',
      });

      return version.content;
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось восстановить версию',
        variant: 'destructive',
      });
      return null;
    }
  };

  return {
    versions,
    isLoading,
    saveVersion,
    restoreVersion,
    loadVersions,
  };
};
