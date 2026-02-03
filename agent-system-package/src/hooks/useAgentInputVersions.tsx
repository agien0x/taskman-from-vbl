import { useState, useEffect } from "react";

const MAX_VERSIONS = 5;

export const useAgentInputVersions = (
  agentId: string,
  supabaseClient: any,
  toast: (props: { title?: string; description?: string; variant?: string }) => void
) => {
  const [versions, setVersions] = useState<Array<{ id: string; content: string; created_at: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (agentId) {
      loadVersions();
    }
  }, [agentId]);

  const loadVersions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabaseClient
        .from("agent_input_versions")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(MAX_VERSIONS);

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error("Error loading agent input versions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveVersion = async (content: string) => {
    try {
      const { error: insertError } = await supabaseClient
        .from("agent_input_versions")
        .insert({ agent_id: agentId, content });

      if (insertError) throw insertError;

      await loadVersions();

      const { data: allVersions, error: countError } = await supabaseClient
        .from("agent_input_versions")
        .select("id")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false });

      if (countError) throw countError;

      if (allVersions && allVersions.length > MAX_VERSIONS) {
        const versionsToDelete = allVersions.slice(MAX_VERSIONS);
        const idsToDelete = versionsToDelete.map((v: any) => v.id);

        const { error: deleteError } = await supabaseClient
          .from("agent_input_versions")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) throw deleteError;
        await loadVersions();
      }
    } catch (error) {
      console.error("Error saving agent input version:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить версию инпутов",
        variant: "destructive",
      });
    }
  };

  const restoreVersion = async (versionId: string) => {
    try {
      const version = versions.find(v => v.id === versionId);
      if (!version) return null;

      const { error } = await supabaseClient
        .from("agents")
        .update({ inputs: version.content })
        .eq("id", agentId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Версия инпутов восстановлена",
      });

      return version.content;
    } catch (error) {
      console.error("Error restoring agent input version:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось восстановить версию",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    versions,
    isLoading,
    saveVersion,
    restoreVersion,
  };
};