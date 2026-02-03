import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Filter } from "lucide-react";
import { AgentExecutionTable } from "@/components/AgentExecutionTable";
import { AgentAnalytics } from "@/components/AgentAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DESTINATION_TYPES } from "@/types/agent";
import type { Agent } from "@/types/agent";

export default function AgentHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [destinationFilter, setDestinationFilter] = useState<string>("all");

  useEffect(() => {
    if (!id) return;

    const loadAgent = async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error loading agent:", error);
      } else {
        setAgent({
          ...data,
          inputs: Array.isArray(data.inputs) ? (data.inputs as any) : [],
          outputs: Array.isArray(data.outputs) ? (data.outputs as any) : [],
          modules: Array.isArray((data as any).modules) ? ((data as any).modules as any) : [],
        });
      }
      setLoading(false);
    };

    loadAgent();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="text-destructive">Agent not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/agents")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{agent.name}</h1>
              <p className="text-muted-foreground">{agent.model}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="history" className="w-full">
          <TabsList>
            <TabsTrigger value="history">История выполнений</TabsTrigger>
            <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-6 space-y-4">
            {agent && agent.outputElements && agent.outputElements.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Фильтр по направлению:</span>
                </div>
                <Select value={destinationFilter} onValueChange={setDestinationFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Все направления" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все направления</SelectItem>
                    {agent.outputElements.map((output: any) => {
                      const destType = DESTINATION_TYPES.find(d => d.value === output.type);
                      return (
                        <SelectItem key={output.id} value={output.type}>
                          {destType?.label || output.type}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
            <AgentExecutionTable agentId={id!} destinationFilter={destinationFilter} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <AgentAnalytics agentId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
