import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AgentTriggerButtonProps {
  agentName: string;
  taskId: string;
  label?: string;
  variant?: "ghost" | "default" | "outline";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export const AgentTriggerButton = ({
  agentName,
  taskId,
  label,
  variant = "ghost",
  size = "sm",
  className = "h-6 px-2 text-xs",
}: AgentTriggerButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleTriggerAgent = async () => {
    setIsLoading(true);
    
    // Отправить событие сразу для показа индикатора загрузки
    window.dispatchEvent(new CustomEvent('agent-loading', { 
      detail: { agentName, taskId } 
    }));
    
    try {
      // Fetch agent by name
      const { data: agent, error: agentError } = await supabase
        .from("agents")
        .select("id, name, trigger_config")
        .eq("name", agentName)
        .single();

      if (agentError || !agent) {
        throw new Error(`Агент "${agentName}" не найден`);
      }

      // Check if agent has button/on_demand trigger in inputTriggers
      const triggerConfig = agent.trigger_config as any;
      const hasButtonTrigger = triggerConfig?.inputTriggers?.some(
        (inputTrigger: any) => 
          inputTrigger.conditions?.some(
            (condition: any) => 
              condition.type === "trigger" && 
              (condition.triggerType === "button" || condition.triggerType === "on_demand")
          )
      );

      if (!hasButtonTrigger) {
        throw new Error(`У агента "${agentName}" нет триггера "по запросу"`);
      }

      // Trigger the agent with on_demand type
      const { data, error } = await supabase.functions.invoke(
        "check-and-execute-triggers",
        {
          body: {
            triggerType: "on_demand",
            agentId: agent.id,
            sourceEntity: {
              type: "tasks",
              id: taskId,
            },
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Агент запущен",
        description: `Агент "${agentName}" успешно выполнен`,
      });

      // Trigger a custom event to notify components to refresh
      window.dispatchEvent(new CustomEvent('agent-executed', { 
        detail: { agentName, taskId, data } 
      }));
    } catch (error) {
      console.error("Error triggering agent:", error);
      toast({
        title: "Ошибка",
        description:
          error instanceof Error ? error.message : "Не удалось запустить агент",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showLabel = label !== undefined;
  
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleTriggerAgent}
      disabled={isLoading}
    >
      <Sparkles className={`h-3 w-3 ${showLabel ? 'mr-1' : ''}`} />
      {showLabel && (isLoading ? "Запуск..." : label)}
    </Button>
  );
};
