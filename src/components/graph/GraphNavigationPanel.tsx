import { useState } from 'react';
import { Agent, INPUT_TYPES, DESTINATION_TYPES } from '@/types/agent';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Bot, ArrowRight, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface GraphNavigationPanelProps {
  agents: Agent[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
}

export const GraphNavigationPanel = ({ agents, selectedNodeId, onNodeSelect }: GraphNavigationPanelProps) => {
  const [search, setSearch] = useState('');
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [inputsOpen, setInputsOpen] = useState(false);
  const [outputsOpen, setOutputsOpen] = useState(false);

  // Collect unique inputs and outputs
  const uniqueInputs = new Set<string>();
  const uniqueOutputs = new Set<string>();

  agents.forEach(agent => {
    agent.inputElements?.forEach(input => uniqueInputs.add(input.type));
    agent.outputElements?.forEach(output => uniqueOutputs.add(output.type));
  });

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredInputs = Array.from(uniqueInputs).filter(type => {
    const inputType = INPUT_TYPES.find(t => t.value === type);
    return inputType?.label.toLowerCase().includes(search.toLowerCase());
  });

  const filteredOutputs = Array.from(uniqueOutputs).filter(type => {
    const outputType = DESTINATION_TYPES.find(t => t.value === type);
    return outputType?.label.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <Card className="w-80 m-4 flex flex-col border-r">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">Навигация</h2>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {/* Agents Section */}
          <Collapsible open={agentsOpen} onOpenChange={setAgentsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Агенты ({filteredAgents.length})
                </span>
                {agentsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {filteredAgents.map(agent => (
                <Button
                  key={agent.id}
                  variant={selectedNodeId === `agent-${agent.id}` ? 'secondary' : 'ghost'}
                  className="w-full justify-start pl-8 text-sm"
                  onClick={() => onNodeSelect(`agent-${agent.id}`)}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {agent.icon_url ? (
                      <img src={agent.icon_url} alt={agent.name} className="w-5 h-5 rounded-full flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <span className="truncate">{agent.name}</span>
                  </div>
                </Button>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Inputs Section */}
          <Collapsible open={inputsOpen} onOpenChange={setInputsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-blue-500" />
                  Инпуты ({filteredInputs.length})
                </span>
                {inputsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {filteredInputs.map(type => {
                const inputType = INPUT_TYPES.find(t => t.value === type);
                return (
                  <Button
                    key={type}
                    variant={selectedNodeId === `input-${type}` ? 'secondary' : 'ghost'}
                    className="w-full justify-start pl-8 text-sm"
                    onClick={() => onNodeSelect(`input-${type}`)}
                  >
                    <span className="truncate">{inputType?.label}</span>
                  </Button>
                );
              })}
            </CollapsibleContent>
          </Collapsible>

          {/* Outputs Section */}
          <Collapsible open={outputsOpen} onOpenChange={setOutputsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-green-500" />
                  Направления ({filteredOutputs.length})
                </span>
                {outputsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {filteredOutputs.map(type => {
                const outputType = DESTINATION_TYPES.find(t => t.value === type);
                return (
                  <Button
                    key={type}
                    variant={selectedNodeId === `output-${type}` ? 'secondary' : 'ghost'}
                    className="w-full justify-start pl-8 text-sm"
                    onClick={() => onNodeSelect(`output-${type}`)}
                  >
                    <span className="truncate">{outputType?.label}</span>
                  </Button>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </Card>
  );
};
