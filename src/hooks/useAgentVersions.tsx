import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MAX_VERSIONS = 10;

interface AgentVersion {
  id: string;
  agent_id: string;
  name: string;
  model: string;
  prompt: string;
  inputs: any;
  outputs: any;
  router_config: any;
  trigger_config: any;
  inputs_raw: string;
  router_raw: string;
  channels: any;
  channel_message: string;
  modules: any;
  pitch: string;
  icon_url: string;
  created_at: string;
}

export const useAgentVersions = (agentId: string) => {
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (agentId) {
      loadVersions();
    }
  }, [agentId]);

  const loadVersions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("agent_versions")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(MAX_VERSIONS);

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error("Error loading agent versions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveVersion = async (agentData: {
    name: string;
    model: string;
    prompt: string;
    inputs: any;
    outputs: any;
    router_config: any;
    trigger_config: any;
    inputs_raw: string;
    router_raw: string;
    channels: any;
    channel_message: string;
    modules: any;
    pitch?: string;
    icon_url?: string;
  }) => {
    try {
      const { error: insertError } = await supabase
        .from("agent_versions")
        .insert({
          agent_id: agentId,
          ...agentData,
        });

      if (insertError) throw insertError;

      await loadVersions();

      const { data: allVersions, error: countError } = await supabase
        .from("agent_versions")
        .select("id")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false });

      if (countError) throw countError;

      if (allVersions && allVersions.length > MAX_VERSIONS) {
        const versionsToDelete = allVersions.slice(MAX_VERSIONS);
        const idsToDelete = versionsToDelete.map(v => v.id);

        const { error: deleteError } = await supabase
          .from("agent_versions")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) throw deleteError;
        await loadVersions();
      }
    } catch (error) {
      console.error("Error saving agent version:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить версию агента",
        variant: "destructive",
      });
    }
  };

  const restoreVersion = async (versionId: string) => {
    try {
      const version = versions.find(v => v.id === versionId);
      if (!version) return null;

      const { error } = await supabase
        .from("agents")
        .update({
          name: version.name,
          model: version.model,
          prompt: version.prompt,
          inputs: version.inputs,
          outputs: version.outputs,
          router_config: version.router_config,
          trigger_config: version.trigger_config,
          inputs_raw: version.inputs_raw,
          router_raw: version.router_raw,
          channels: version.channels,
          channel_message: version.channel_message,
          modules: version.modules,
          pitch: version.pitch,
          icon_url: version.icon_url,
        })
        .eq("id", agentId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Версия агента восстановлена",
      });

      return version;
    } catch (error) {
      console.error("Error restoring agent version:", error);
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
