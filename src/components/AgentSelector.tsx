import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Agent } from "@/types/agent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { AgentInfoPopover } from "@/components/AgentInfoPopover";

interface AgentSelectorProps {
  selectedAgentIds?: string[];
  onAgentSelect: (agentIds: string[]) => void;
}

export const AgentSelector = ({ selectedAgentIds = [], onAgentSelect }: AgentSelectorProps) => {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    // Устанавливаем по умолчанию Редактор и Структуратор
    if (selectedAgentIds.length === 0 && agents.length > 0) {
      const editorAgent = agents.find(a => a.id === '11111111-1111-1111-1111-111111111111');
      const structuratorAgent = agents.find(a => a.id === '22222222-2222-2222-2222-222222222222');
      
      const defaultIds = [editorAgent?.id, structuratorAgent?.id].filter(Boolean) as string[];
      if (defaultIds.length > 0) {
        onAgentSelect(defaultIds);
      }
    }
  }, [agents]);

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAgents((data || []).map(agent => ({
        ...agent,
        inputs: Array.isArray(agent.inputs) ? (agent.inputs as any) : [],
        outputs: (agent.outputs as any) || [],
        modules: Array.isArray((agent as any).modules) ? ((agent as any).modules as any) : [],
      })));
    } catch (error) {
      console.error("Error loading agents:", error);
    }
  };

  const toggleAgent = (agentId: string) => {
    if (selectedAgentIds.includes(agentId)) {
      onAgentSelect(selectedAgentIds.filter(id => id !== agentId));
    } else {
      onAgentSelect([...selectedAgentIds, agentId]);
    }
  };

  return (
    <div className="w-80 rounded-md border bg-popover shadow-md">
      <div className="p-3 border-b">
        <p className="text-sm font-medium">Выберите агентов</p>
        <p className="text-xs text-muted-foreground">
          Можно выбрать несколько агентов для обработки
        </p>
      </div>
      <ScrollArea className="h-64">
        <div className="p-2 space-y-1">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer group"
              onClick={() => toggleAgent(agent.id)}
            >
              <Checkbox
                checked={selectedAgentIds.includes(agent.id)}
                onCheckedChange={() => toggleAgent(agent.id)}
              />
              {agent.icon_url ? (
                <img 
                  src={agent.icon_url} 
                  alt={agent.name}
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              <span className="truncate text-sm flex-1">{agent.name}</span>
              <AgentInfoPopover agent={agent} />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
