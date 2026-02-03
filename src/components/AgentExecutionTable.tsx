import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AgentExecutionDetail } from "./AgentExecutionDetail";
import { TaskScoreBadge } from "./TaskScoreBadge";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Execution {
  id: string;
  execution_type: string;
  input_data: any;
  output_data: any;
  context: any;
  rating: number | null;
  rating_comment: string | null;
  duration_ms: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface AgentExecutionTableProps {
  agentId: string;
  destinationFilter?: string;
}

export function AgentExecutionTable({ agentId, destinationFilter = "all" }: AgentExecutionTableProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const loadExecutions = async () => {
    let query = supabase
      .from("agent_executions")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (typeFilter) {
      query = query.eq("execution_type", typeFilter);
    }

    // Примечание: фильтрация по destination пока работает через execution_type
    // Для полной функциональности можно добавить поле destination_type в таблицу
    if (destinationFilter && destinationFilter !== "all") {
      // Здесь можно добавить логику фильтрации по destination
      // Например, фильтровать по данным в output_data.destination
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading executions:", error);
    } else {
      setExecutions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadExecutions();
  }, [agentId, typeFilter, destinationFilter]);

  const getInputPreview = (execution: Execution) => {
    const input = JSON.stringify(execution.input_data);
    return input.length > 50 ? input.substring(0, 50) + "..." : input;
  };

  const getOutputPreview = (execution: Execution) => {
    const output = JSON.stringify(execution.output_data);
    return output.length > 50 ? output.substring(0, 50) + "..." : output;
  };

  const executionTypes = [...new Set(executions.map(e => e.execution_type))];

  if (loading) {
    return <div className="animate-pulse">Loading executions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={typeFilter === null ? "default" : "outline"}
          size="sm"
          onClick={() => setTypeFilter(null)}
        >
          Все
        </Button>
        {executionTypes.map((type) => (
          <Button
            key={type}
            variant={typeFilter === type ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter(type)}
          >
            {type}
          </Button>
        ))}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Инпут</TableHead>
              <TableHead>Аутпут</TableHead>
              <TableHead>Длительность</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Оценка</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {executions.map((execution) => (
              <TableRow key={execution.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>{format(new Date(execution.created_at), "dd MMM, HH:mm")}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{execution.execution_type}</Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate font-mono text-xs">
                  {getInputPreview(execution)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate font-mono text-xs">
                  {execution.status === "error" 
                    ? execution.error_message 
                    : getOutputPreview(execution)}
                </TableCell>
                <TableCell>{execution.duration_ms}ms</TableCell>
                <TableCell>
                  <Badge variant={execution.status === "success" ? "default" : "destructive"}>
                    {execution.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {execution.rating !== null && (
                    <TaskScoreBadge score={execution.rating} size="sm" />
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedExecution(execution)}
                  >
                    Детали
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {executions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Нет выполнений
        </div>
      )}

      {selectedExecution && (
        <AgentExecutionDetail
          execution={selectedExecution}
          open={selectedExecution !== null}
          onOpenChange={(open) => !open && setSelectedExecution(null)}
          onUpdate={loadExecutions}
        />
      )}
    </div>
  );
}
