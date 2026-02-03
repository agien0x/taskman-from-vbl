import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MAX_VERSIONS = 10;

interface ModuleVersion {
  id: string;
  module_id: string;
  agent_id: string;
  module_type: string;
  config: any;
  is_template: boolean;
  template_name: string | null;
  created_at: string;
  created_by: string | null;
}

export const useModuleVersions = (moduleId: string, agentId: string) => {
  const [versions, setVersions] = useState<ModuleVersion[]>([]);
  const [templates, setTemplates] = useState<ModuleVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (moduleId && agentId) {
      loadVersions();
      loadTemplates();
    }
  }, [moduleId, agentId]);

  const loadVersions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("module_versions")
        .select("*")
        .eq("module_id", moduleId)
        .eq("is_template", false)
        .order("created_at", { ascending: false })
        .limit(MAX_VERSIONS);

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error("Error loading module versions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("module_versions")
        .select("*")
        .eq("is_template", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error loading module templates:", error);
    }
  };

  const saveVersion = async (config: any, moduleType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from("module_versions")
        .insert({
          module_id: moduleId,
          agent_id: agentId,
          module_type: moduleType,
          config: config,
          is_template: false,
          created_by: user?.id,
        });

      if (insertError) throw insertError;

      await loadVersions();

      // Delete old versions if we have more than MAX_VERSIONS
      const { data: allVersions, error: countError } = await supabase
        .from("module_versions")
        .select("id")
        .eq("module_id", moduleId)
        .eq("is_template", false)
        .order("created_at", { ascending: false });

      if (countError) throw countError;

      if (allVersions && allVersions.length > MAX_VERSIONS) {
        const versionsToDelete = allVersions.slice(MAX_VERSIONS);
        const idsToDelete = versionsToDelete.map(v => v.id);

        const { error: deleteError } = await supabase
          .from("module_versions")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) throw deleteError;
        await loadVersions();
      }

      toast({
        title: "Успешно",
        description: "Версия модуля сохранена",
      });
    } catch (error) {
      console.error("Error saving module version:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить версию модуля",
        variant: "destructive",
      });
    }
  };

  const saveAsTemplate = async (config: any, moduleType: string, templateName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from("module_versions")
        .insert({
          module_id: moduleId,
          agent_id: agentId,
          module_type: moduleType,
          config: config,
          is_template: true,
          template_name: templateName,
          created_by: user?.id,
        });

      if (insertError) throw insertError;

      await loadTemplates();

      toast({
        title: "Успешно",
        description: "Шаблон модуля сохранен",
      });
    } catch (error) {
      console.error("Error saving module template:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить шаблон модуля",
        variant: "destructive",
      });
    }
  };

  const restoreVersion = async (versionId: string) => {
    try {
      const version = [...versions, ...templates].find(v => v.id === versionId);
      if (!version) return null;

      toast({
        title: "Успешно",
        description: "Версия модуля восстановлена",
      });

      return version.config;
    } catch (error) {
      console.error("Error restoring module version:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось восстановить версию",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteVersion = async (versionId: string) => {
    try {
      const { error } = await supabase
        .from("module_versions")
        .delete()
        .eq("id", versionId);

      if (error) throw error;

      await loadVersions();
      await loadTemplates();

      toast({
        title: "Успешно",
        description: "Версия удалена",
      });
    } catch (error) {
      console.error("Error deleting module version:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить версию",
        variant: "destructive",
      });
    }
  };

  return {
    versions,
    templates,
    isLoading,
    saveVersion,
    saveAsTemplate,
    restoreVersion,
    deleteVersion,
    loadVersions,
    loadTemplates,
  };
};