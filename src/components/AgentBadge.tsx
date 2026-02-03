import { useState, useEffect } from "react";
import { Bot } from "lucide-react";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Agent } from "@/types/agent";
import AgentDialog from "./AgentDialog";

interface AgentBadgeProps {
  agentId: string;
  name: string;
  disableDialogOpen?: boolean;
}

const AgentBadge = ({ agentId, name, disableDialogOpen = false }: AgentBadgeProps) => {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const loadAgent = async () => {
      const { data } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .single();
      
      if (data) {
        setAgent({
          ...data,
          inputs: Array.isArray(data.inputs) ? (data.inputs as any) : [],
          outputs: (data.outputs as any) || [],
          modules: Array.isArray((data as any).modules) ? ((data as any).modules as any) : [],
        });
      }
    };

    loadAgent();
  }, [agentId]);

  return (
    <>
      <Badge
        variant="secondary"
        className={`inline-flex items-center gap-1.5 transition-colors ${disableDialogOpen ? '' : 'cursor-pointer hover:bg-secondary/80'}`}
        onClick={disableDialogOpen ? undefined : () => setIsDialogOpen(true)}
      >
        <Avatar className="h-4 w-4">
          <AvatarImage src={agent?.icon_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-[8px]">
            <Bot className="h-3 w-3" />
          </AvatarFallback>
        </Avatar>
        <span className="text-xs">{name}</span>
      </Badge>

      {agent && (
        <AgentDialog
          agent={agent}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSave={async () => {}}
        />
      )}
    </>
  );
};

export default AgentBadge;
