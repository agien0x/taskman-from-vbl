import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Trash2, Edit2 } from "lucide-react";
import { Agent } from "@/types/agent";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { AgentRatingWidget } from "./AgentRatingWidget";
import { useAgentRatings } from "@/hooks/useAgentRatings";
import { getCleanTitle } from "@/lib/utils";

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agentId: string) => void;
}

const AgentCard = ({ agent, onEdit, onDelete }: AgentCardProps) => {
  const navigate = useNavigate();
  const { averageRating, ratings } = useAgentRatings(agent.id);
  
  return (
    <Card className="group p-3 hover:shadow-lg transition-all border-2 border-border">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 cursor-pointer" onClick={() => onEdit(agent)}>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{agent.name}</h3>
              <AgentRatingWidget 
                averageRating={averageRating} 
                totalRatings={ratings.length}
                size="sm"
              />
            </div>
            {agent.pitch && (
              <p className="text-[10px] text-muted-foreground/60 mb-1 italic line-clamp-1">
                {agent.pitch}
              </p>
            )}
            <p className="text-xs text-muted-foreground mb-1">{agent.model}</p>
            <p className="text-xs text-foreground/70 line-clamp-2">{getCleanTitle(agent.prompt, "")}</p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(agent);
                    }}
                    className="h-7 w-7 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Редактировать</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(agent.id);
                    }}
                    className="h-7 w-7 p-0 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Удалить</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AgentCard;
