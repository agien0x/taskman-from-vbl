import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Agent } from '@/types/agent';
import { AgentGraph3D } from '@/components/graph/AgentGraph3D';
import { GraphNavigationPanel } from '@/components/graph/GraphNavigationPanel';
import AgentDialog from '@/components/AgentDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Info, ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

const AgentGraph = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [cameraAction, setCameraAction] = useState<'zoomIn' | 'zoomOut' | 'reset' | 'fit' | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(agent => ({
        ...agent,
        inputs: agent.inputs as any,
        outputs: agent.outputs as any,
        modules: Array.isArray((agent as any).modules) ? ((agent as any).modules as any) : [],
        inputElements: Array.isArray(agent.inputs) ? (agent.inputs as any) : [],
        outputElements: Array.isArray(agent.outputs) ? (agent.outputs as any) : [],
        routerConfig: agent.router_config as any,
      })) as Agent[];
    },
  });

  const handleZoomIn = () => {
    setCameraAction('zoomIn');
    setTimeout(() => setCameraAction(null), 100);
  };

  const handleZoomOut = () => {
    setCameraAction('zoomOut');
    setTimeout(() => setCameraAction(null), 100);
  };

  const handleReset = () => {
    setCameraAction('reset');
    setTimeout(() => setCameraAction(null), 100);
  };

  const handleFit = () => {
    setCameraAction('fit');
    setTimeout(() => setCameraAction(null), 100);
  };

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsDialogOpen(true);
  };

  const handleSaveAgent = async () => {
    // Reload agents after save
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      toast({
        title: "Успешно",
        description: "Агент обновлен",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Загрузка графа...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Граф агентов</h1>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">О графе агентов</h3>
                  <p className="text-sm text-muted-foreground">
                    Этот 3D граф визуализирует связи между агентами, их инпутами и направлениями (destinations).
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li><span className="text-primary font-medium">Агенты</span> - центральные ноды в графе</li>
                    <li><span className="text-blue-500 font-medium">Инпуты</span> - слева, источники данных для агентов</li>
                    <li><span className="text-green-500 font-medium">Направления</span> - справа, куда агенты отправляют результаты</li>
                    <li><span className="text-muted-foreground">Связи</span> - показывают упоминания и потоки данных</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    Используйте мышь для вращения, колесо для масштабирования. Кликайте на агентов для просмотра деталей.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleFit}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Panel */}
        <GraphNavigationPanel
          agents={agents}
          selectedNodeId={selectedNodeId}
          onNodeSelect={setSelectedNodeId}
        />

        {/* 3D Graph */}
        <div className="flex-1 relative">
          <AgentGraph3D
            agents={agents}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
            onAgentClick={handleAgentClick}
            cameraAction={cameraAction}
          />
        </div>
      </div>

      {/* Agent Dialog */}
      <AgentDialog
        agent={selectedAgent}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveAgent}
      />
    </div>
  );
};

export default AgentGraph;
