import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type TemplateVersion = Database['public']['Tables']['template_versions']['Row'];

const MAX_VERSIONS = 5;

export const useTemplateVersions = (templateId: string) => {
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (templateId) {
      loadVersions();
    }
  }, [templateId]);

  const loadVersions = async () => {
    if (!templateId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('template_versions')
        .select('*')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false })
        .limit(MAX_VERSIONS);

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error loading template versions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveVersion = async (templateContent: string, qualityCriteria: string | null) => {
    try {
      // Insert new version
      const { error: insertError } = await supabase
        .from('template_versions')
        .insert({ 
          template_id: templateId, 
          template_content: templateContent,
          quality_criteria: qualityCriteria 
        });

      if (insertError) throw insertError;

      // Get all versions for this template
      const { data: allVersions, error: fetchError } = await supabase
        .from('template_versions')
        .select('id')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Delete old versions if we have more than MAX_VERSIONS
      if (allVersions && allVersions.length > MAX_VERSIONS) {
        const versionsToDelete = allVersions.slice(MAX_VERSIONS).map(v => v.id);
        const { error: deleteError } = await supabase
          .from('template_versions')
          .delete()
          .in('id', versionsToDelete);

        if (deleteError) throw deleteError;
      }

      await loadVersions();
    } catch (error) {
      console.error('Error saving template version:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить версию шаблона',
        variant: 'destructive',
      });
    }
  };

  const restoreVersion = async (versionId: string) => {
    try {
      const version = versions.find(v => v.id === versionId);
      if (!version) return null;

      const { error } = await supabase
        .from('task_type_templates')
        .update({ 
          template: version.template_content,
          quality_criteria: version.quality_criteria 
        })
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Версия шаблона восстановлена',
      });

      return { template: version.template_content, quality_criteria: version.quality_criteria };
    } catch (error) {
      console.error('Error restoring template version:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось восстановить версию шаблона',
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
