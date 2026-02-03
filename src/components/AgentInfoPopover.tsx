import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Agent } from "@/types/agent";

interface AgentInfoPopoverProps {
  agent: Agent;
}

interface LastExecution {
  id: string;
  input_data: any;
  output_data: any;
  created_at: string;
  execution_type: string;
  status: string;
  duration_ms?: number;
}

// Определяем источники и назначения для агентов
const AGENT_IO_MAPPING: Record<string, { inputs: string[]; outputs: string[] }> = {
  // Редактор
  "11111111-1111-1111-1111-111111111111": {
    inputs: ["Текст из редактора задачи", "Голосовой ввод"],
    outputs: ["Отредактированный текст в редактор задачи"]
  },
  // Структуратор
  "22222222-2222-2222-2222-222222222222": {
    inputs: ["Текст из редактора задачи", "Название задачи", "Содержимое задачи"],
    outputs: ["Структурированное название задачи", "Структурированное содержимое", "Предложения парентов"]
  },
  // Дефолтные значения для других агентов
  default: {
    inputs: ["Текст из редактора задачи"],
    outputs: ["Обработанный текст в редактор"]
  }
};

export const AgentInfoPopover = ({ agent }: AgentInfoPopoverProps) => {
  const navigate = useNavigate();
  const [lastExecution, setLastExecution] = useState<LastExecution | null>(null);
  const [loading, setLoading] = useState(false);

  const ioMapping = AGENT_IO_MAPPING[agent.id] || AGENT_IO_MAPPING.default;

  const loadLastExecution = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agent_executions")
        .select("*")
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setLastExecution(data);
    } catch (error) {
      console.error("Error loading last execution:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-accent"
          onClick={(e) => {
            e.stopPropagation();
            if (!lastExecution && !loading) {
              loadLastExecution();
            }
          }}
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-96" side="right" align="start">
        <div className="space-y-3">
          {/* Header with agent link */}
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-sm">{agent.name}</h4>
              <p className="text-xs text-muted-foreground">{agent.model}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/agents/${agent.id}/history`);
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Input/Output mapping */}
          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium mb-1">Источники данных:</p>
              <div className="space-y-1">
                {ioMapping.inputs.map((input, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-primary"></span>
                    {input}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-xs font-medium mb-1">Куда идут результаты:</p>
              <div className="space-y-1">
                {ioMapping.outputs.map((output, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-primary"></span>
                    {output}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <p className="text-xs font-medium mb-1">Промпт:</p>
            <ScrollArea className="h-20 w-full rounded border p-2 bg-muted/30">
              <p className="text-xs whitespace-pre-wrap">{agent.prompt}</p>
            </ScrollArea>
          </div>

          {/* Last execution */}
          {loading ? (
            <div className="text-xs text-muted-foreground">Загрузка последнего выполнения...</div>
          ) : lastExecution ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Последнее выполнение:</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(lastExecution.created_at).toLocaleString()}
                </span>
              </div>

              {/* Technical details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Тип:</span> {lastExecution.execution_type}
                </div>
                <div>
                  <span className="text-muted-foreground">Статус:</span>{" "}
                  <span className={lastExecution.status === 'success' ? 'text-green-600' : 'text-yellow-600'}>
                    {lastExecution.status}
                  </span>
                </div>
                {lastExecution.duration_ms && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Время:</span> {lastExecution.duration_ms}ms
                  </div>
                )}
              </div>

              {/* Input */}
              <div>
                <p className="text-xs font-medium mb-1">Input:</p>
                <ScrollArea className="h-16 w-full rounded border p-2 bg-muted/30">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(lastExecution.input_data, null, 2)}
                  </pre>
                </ScrollArea>
              </div>

              {/* Output */}
              <div>
                <p className="text-xs font-medium mb-1">Output:</p>
                <ScrollArea className="h-16 w-full rounded border p-2 bg-muted/30">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(lastExecution.output_data, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Нет данных о выполнениях
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
