import { useState, useEffect } from "react";
import { CheckSquare, Plus, ArrowLeft, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import AgentCard from "@/components/AgentCard";
import AgentDialog from "@/components/AgentDialog";
import { Agent } from "@/types/agent";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Agents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadAgents();
  }, []);

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
        outputs: Array.isArray(agent.outputs) ? (agent.outputs as any) : [],
        modules: Array.isArray((agent as any).modules) ? ((agent as any).modules as any) : [],
      })));
    } catch (error) {
      console.error("Error loading agents:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить агентов",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedAgent(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from("agents")
        .delete()
        .eq("id", agentId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Агент удален",
      });

      loadAgents();
    } catch (error) {
      console.error("Error deleting agent:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить агента",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    loadAgents();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-accent">
      <header className="px-8 py-6 bg-card/10 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
            <div className="p-2 bg-card rounded-lg shadow-sm">
              <CheckSquare className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-white">Агенты</h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/agents/graph")}
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              <Network className="h-4 w-4 mr-2" />
              Граф агентов
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Создать агента
            </Button>
          </div>
        </div>
      </header>

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {agents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/60 mb-4">Нет агентов</p>
            <Button
              onClick={handleCreate}
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Создать первого агента
            </Button>
          </div>
        )}
      </div>

      <AgentDialog
        agent={selectedAgent}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
      />
    </div>
  );
};

export default Agents;
