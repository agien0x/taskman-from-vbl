import BoardNavigator from "@/components/BoardNavigator";
import { FractalMenu } from "@/components/FractalMenu";
import { Users, LogOut, User as UserIcon, Code, Shield, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Session } from "@supabase/supabase-js";
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PinnedTasks } from "@/components/PinnedTasks";
import { usePinnedTasks } from "@/hooks/usePinnedTasks";
import { BugReportButton } from "@/components/BugReportButton";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useSystemAdmin } from "@/hooks/useSystemAdmin";
import { Task } from "@/types/kanban";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRootTask, setCurrentRootTask] = useState<Task | null>(null);
  const { pinnedTasks, unpinTask } = usePinnedTasks();
  const { isSystemAdmin } = useSystemAdmin();
  const boardNavigatorRef = useRef<{ getRootTask: () => Task | null; navigateToRoot: (task: Task) => void }>(null);

  const handleNavigateToPinnedTask = (taskId: string) => {
    setSearchParams({ task: taskId });
  };

  const handleNavigateToTask = (taskId: string) => {
    setSearchParams({ task: taskId });
  };

  useEffect(() => {
    let mounted = true;
    
    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.error("Loading timeout - possible network issue");
        setLoading(false);
        if (!session) {
          navigate("/auth");
        }
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        console.log("Auth state change:", event, !!session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        clearTimeout(loadingTimeout);
        
        if (!session && event !== 'INITIAL_SESSION') {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        
        if (error) {
          console.error("Error getting session:", error);
          setLoading(false);
          navigate("/auth");
          return;
        }
        
        console.log("Initial session check:", !!session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        clearTimeout(loadingTimeout);
        
        if (!session) {
          navigate("/auth");
        }
      })
      .catch((error) => {
        console.error("Failed to get session:", error);
        if (mounted) {
          setLoading(false);
          navigate("/auth");
        }
      });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Watch for task param changes - restore last task if none specified
  useEffect(() => {
    if (!searchParams.get("task")) {
      const lastTaskId = localStorage.getItem("lastTaskId");
      if (lastTaskId) {
        setSearchParams({ task: lastTaskId }, { replace: true });
      }
    }
  }, [searchParams, setSearchParams]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось выйти",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Вы вышли из системы",
      });
      navigate("/auth");
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const rootTask = boardNavigatorRef.current?.getRootTask();
      if (rootTask && rootTask.id !== currentRootTask?.id) {
        setCurrentRootTask(rootTask);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [currentRootTask?.id]);

  const getUserInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center animated-rainbow-bg dark:from-background dark:via-background dark:to-background">
        <div className="text-white text-lg mb-2">Загрузка...</div>
        <div className="text-white/70 text-sm">Подключение к серверу</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen animated-rainbow-bg dark:from-background dark:via-background dark:to-background">
      <BugReportButton />
      <header className="px-4 py-2 bg-card/10 dark:bg-card/50 backdrop-blur-sm border-b border-white/10 dark:border-border sticky top-0 z-50">
        <div className="flex items-center justify-between gap-4">
          {/* Logo with Dropdown Menu - shows current root task name */}
          <FractalMenu 
            onNavigateToTask={handleNavigateToTask}
            currentRootTask={currentRootTask}
          />

          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            <PinnedTasks
              pinnedTasks={pinnedTasks}
              onNavigate={handleNavigateToPinnedTask}
              onUnpin={unpinTask}
            />
            
            <Button
              onClick={() => navigate("/agents")}
              variant="ghost"
              size="sm"
              className="h-8 text-white dark:text-foreground hover:bg-white/20 dark:hover:bg-muted hidden md:flex"
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Агенты
            </Button>

            <ThemeSelector />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full hover:bg-white/20 dark:hover:bg-muted"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-white/20 dark:bg-primary/20 text-white dark:text-primary text-xs">
                      {user?.email ? getUserInitials(user.email) : "US"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                {/* Mobile nav items */}
                <div className="md:hidden">
                  <DropdownMenuItem onClick={() => navigate("/agents")}>
                    <Users className="h-3.5 w-3.5 mr-2" />
                    Агенты
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </div>
                
                {isSystemAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="h-3.5 w-3.5 mr-2" />
                    Админ-панель
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/spec")}>
                  <FileText className="h-3.5 w-3.5 mr-2" />
                  Техзадание
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/demo")}>
                  <Code className="h-3.5 w-3.5 mr-2" />
                  Demo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserIcon className="h-3.5 w-3.5 mr-2" />
                  Профиль
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-3.5 w-3.5 mr-2" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <BoardNavigator ref={boardNavigatorRef} />
    </div>
  );
};

export default Index;
