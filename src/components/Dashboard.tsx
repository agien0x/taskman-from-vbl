import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Clock, User, Building2, FolderOpen, ChevronRight, Star, TrendingUp, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface RecentTask {
  id: string;
  title: string;
  updated_at: string;
  column_id: string;
  parent_title?: string;
  parent_id?: string;
}

interface Organization {
  id: string;
  title: string;
  projectCount: number;
  taskCount: number;
}

interface DashboardProps {
  userId: string;
  onNavigateToTask: (taskId: string) => void;
  isSystemAdmin?: boolean;
}

export const Dashboard = ({ userId, onNavigateToTask, isSystemAdmin = false }: DashboardProps) => {
  const [myOrganizations, setMyOrganizations] = useState<Organization[]>([]);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, myOrgs: 0, allOrgs: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // First, get user's organizations (where they are members)
        const { data: orgMemberships } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", userId);

        const myOrgIds = orgMemberships?.map((m) => m.organization_id) || [];

        // Get my organizations
        let myOrgsData: { id: string; title: string }[] = [];
        if (myOrgIds.length > 0) {
          const { data } = await supabase
            .from("tasks")
            .select("id, title")
            .in("id", myOrgIds)
            .eq("is_root", true)
            .order("title");
          myOrgsData = data || [];
        }

        // For system admins, get ALL organizations for the "All Organizations" tab
        let allOrgsData: { id: string; title: string }[] = [];
        if (isSystemAdmin) {
          const { data: allOrgs } = await supabase
            .from("tasks")
            .select("id, title")
            .eq("is_root", true)
            .order("title");
          allOrgsData = allOrgs || [];
        }

        // Helper function to get org counts
        const getOrgCounts = async (orgs: { id: string; title: string }[]): Promise<Organization[]> => {
          const result: Organization[] = [];
          for (const org of orgs) {
            const { data: projects } = await supabase
              .from("task_relations")
              .select("child_id")
              .eq("parent_id", org.id);

            const projectCount = projects?.length || 0;

            let taskCount = 0;
            if (projects && projects.length > 0) {
              const projectIds = projects.map((p) => p.child_id);
              const { count } = await supabase
                .from("task_relations")
                .select("*", { count: "exact", head: true })
                .in("parent_id", projectIds);
              taskCount = count || 0;
            }

            result.push({
              id: org.id,
              title: org.title,
              projectCount,
              taskCount,
            });
          }
          return result;
        };

        const myOrgsWithCounts = await getOrgCounts(myOrgsData);
        const allOrgsWithCounts = isSystemAdmin ? await getOrgCounts(allOrgsData) : [];

        setMyOrganizations(myOrgsWithCounts);
        setAllOrganizations(allOrgsWithCounts);
        setStats((prev) => ({ 
          ...prev, 
          myOrgs: myOrgsWithCounts.length,
          allOrgs: allOrgsWithCounts.length 
        }));

        // Fetch recently modified tasks by user (via task_logs)
        const { data: recentLogs } = await supabase
          .from("task_logs")
          .select("task_id, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        const recentTaskIds = [...new Set(recentLogs?.map((l) => l.task_id) || [])].slice(0, 8);

        if (recentTaskIds.length > 0) {
          const { data: tasksData } = await supabase
            .from("tasks")
            .select("id, title, updated_at, column_id")
            .in("id", recentTaskIds);

          // Get parent info for recent tasks
          const { data: parentRelations } = await supabase
            .from("task_relations")
            .select("child_id, parent_id")
            .in("child_id", recentTaskIds);

          const parentIds = parentRelations?.map((r) => r.parent_id) || [];
          const { data: parentTasks } = await supabase
            .from("tasks")
            .select("id, title")
            .in("id", parentIds);

          const parentMap = new Map(parentTasks?.map((p) => [p.id, p.title]) || []);
          const relationMap = new Map(parentRelations?.map((r) => [r.child_id, r.parent_id]) || []);

          const orderedTasks = recentTaskIds
            .map((id) => tasksData?.find((t) => t.id === id))
            .filter(Boolean)
            .map((t) => ({
              ...t!,
              parent_id: relationMap.get(t!.id),
              parent_title: parentMap.get(relationMap.get(t!.id) || ""),
            }));

          setRecentTasks(orderedTasks);
        }

        // Get stats
        const { count: totalCount } = await supabase
          .from("task_assignments")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count: weekCount } = await supabase
          .from("task_logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", weekAgo.toISOString());

        setStats((prev) => ({
          ...prev,
          total: totalCount || 0,
          thisWeek: weekCount || 0,
        }));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userId, isSystemAdmin]);

  const TaskCard = ({ task }: { task: RecentTask }) => (
    <button
      onClick={() => onNavigateToTask(task.id)}
      className="w-full text-left p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors group border border-border/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {task.title}
          </p>
          {task.parent_title && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              в {task.parent_title}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true, locale: ru })}
      </p>
    </button>
  );

  const OrganizationCard = ({ org }: { org: Organization }) => (
    <button
      onClick={() => onNavigateToTask(org.id)}
      className="w-full text-left p-4 rounded-xl bg-card hover:bg-card/80 transition-all group border border-border hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {org.title}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FolderOpen className="h-3 w-3" />
                {org.projectCount} проектов
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {org.taskCount} задач
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>
    </button>
  );

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Card className="bg-card">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Главная
          </h2>
          <p className="text-muted-foreground mt-1">
            Выберите организацию для начала работы
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {stats.myOrgs} {isSystemAdmin && stats.allOrgs > 0 ? `(+${stats.allOrgs})` : ''} организаций
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 border border-accent/20">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">{stats.thisWeek} действий за неделю</span>
          </div>
        </div>
      </div>

      {/* Organizations */}
      {isSystemAdmin ? (
        <Tabs defaultValue="my" className="space-y-4">
          <TabsList>
            <TabsTrigger value="my" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Мои организации
              {myOrganizations.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                  {myOrganizations.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Все организации
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                {allOrganizations.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my" className="space-y-4">
            {myOrganizations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myOrganizations.map((org) => (
                  <OrganizationCard key={org.id} org={org} />
                ))}
              </div>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-8 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    Вы не состоите ни в одной организации
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Перейдите во вкладку "Все организации" для просмотра
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allOrganizations.map((org) => (
                <OrganizationCard key={org.id} org={org} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Мои организации
            </h3>
          </div>
          
          {myOrganizations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myOrganizations.map((org) => (
                <OrganizationCard key={org.id} org={org} />
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-8 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  У вас пока нет организаций
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Создайте организацию или получите приглашение
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Activity */}
      {recentTasks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Недавняя активность
          </h3>
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {recentTasks.slice(0, 8).map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={() => navigate("/agents")}>
          <User className="h-4 w-4 mr-2" />
          Агенты
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/agents/graph")}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Граф агентов
        </Button>
      </div>
    </div>
  );
};
