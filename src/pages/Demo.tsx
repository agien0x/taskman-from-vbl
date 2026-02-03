import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { toast as sonnerToast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  AgentDialog,
  AgentSystemProvider,
} from "../../agent-system-package/src";
import "../../agent-system-package/src/components/editor/editor-styles.css";
import "../../agent-system-package/src/components/editor/collaboration-styles.css";

const Demo = () => {
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [demoAgents, setDemoAgents] = useState<any[]>([]);
  
  // Создаем Supabase клиент для использования в npm пакете
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Адаптер для toast из sonner в формат, ожидаемый AgentDialog
  const toastAdapter = (props: { title?: string; description?: string; variant?: string }) => {
    if (props.variant === "destructive") {
      sonnerToast.error(props.title || props.description || "Ошибка");
    } else {
      sonnerToast.success(props.title || props.description || "Успех");
    }
  };

  // Демо данные для модулей
  const demoModules = [
    {
      id: "module-1",
      type: "trigger" as const,
      order: 0,
      config: {
        triggerType: "on_demand",
        conditions: [],
      },
    },
    {
      id: "module-2",
      type: "prompt" as const,
      order: 1,
      config: {
        content: "Ты полезный AI ассистент. Помоги пользователю с его задачей.",
      },
    },
    {
      id: "module-3",
      type: "model" as const,
      order: 2,
      config: {
        model: "grok-3",
      },
    },
  ];

  // Создание демо-агента
  const createDemoAgent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        sonnerToast.error("Необходима авторизация");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("agents")
        .insert({
          name: "Демо Агент",
          model: "grok-3",
          prompt: "Ты полезный AI ассистент",
          modules: demoModules,
          pitch: "Простой демо-агент для тестирования",
        })
        .select()
        .single();

      if (error) throw error;

      setDemoAgents([...demoAgents, data]);
      sonnerToast.success("Демо-агент создан!");
    } catch (error) {
      console.error("Error creating demo agent:", error);
      sonnerToast.error("Ошибка создания агента");
    }
  };

  const openAgentDialog = (agent: any) => {
    setSelectedAgent(agent);
    setIsAgentDialogOpen(true);
  };

  const handleSaveAgent = async () => {
    sonnerToast.success("Агент сохранен!");
    setIsAgentDialogOpen(false);
    // Перезагрузить список агентов
  };

  // Загружаем агентов при монтировании
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const { data, error } = await supabase
          .from("agents")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (error) throw error;
        setDemoAgents(data || []);
      } catch (error) {
        console.error("Error loading agents:", error);
      }
    };
    
    loadAgents();
  }, []);

  const agentSystemConfig = {
    supabaseUrl: supabaseUrl || '',
    supabaseKey: supabaseKey || '',
  };

  return (
    <AgentSystemProvider config={agentSystemConfig}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">Agent System Demo</h1>
                  <p className="text-sm text-muted-foreground">
                    Демонстрация микросервиса @lovable/agent-system
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                v1.0.0
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Компонент AgentDialog</CardTitle>
              <CardDescription>
                Основной компонент для создания и редактирования агентов с модульной архитектурой
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Описание:</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  AgentDialog - это полнофункциональный компонент для управления агентами,
                  включающий редактирование модулей (Trigger, Prompt, Model, Router, Destinations),
                  тестирование, версионирование и аналитику.
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={createDemoAgent}>
                  Создать демо-агента
                </Button>
                {demoAgents.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => openAgentDialog(demoAgents[0])}
                  >
                    Открыть AgentDialog
                  </Button>
                )}
              </div>

              {demoAgents.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Созданные агенты:</h3>
                  <div className="space-y-2">
                    {demoAgents.map((agent) => (
                      <Card key={agent.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{agent.name}</h4>
                            <p className="text-sm text-muted-foreground">{agent.pitch}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAgentDialog(agent)}
                          >
                            Редактировать
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AgentDialog */}
        <AgentDialog
          agent={selectedAgent}
          open={isAgentDialogOpen}
          onOpenChange={setIsAgentDialogOpen}
          onSave={handleSaveAgent}
          supabaseClient={supabase}
          toast={toastAdapter}
        />
      </div>
    </AgentSystemProvider>
  );
};

export default Demo;
