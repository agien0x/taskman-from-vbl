import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSystemAdmin } from "@/hooks/useSystemAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Users, Building2, FolderKanban, CheckSquare, Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  isAdmin: boolean;
}

interface Metrics {
  usersCount: number;
  organizationsCount: number;
  projectsCount: number;
  tasksCount: number;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    usersCount: 0,
    organizationsCount: 0,
    projectsCount: 0,
    tasksCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isSystemAdmin) {
      navigate("/");
      return;
    }

    if (isSystemAdmin) {
      loadData();
    }
  }, [isSystemAdmin, adminLoading, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, avatar_url")
        .order("full_name", { ascending: true });

      // Load admin roles
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      const usersWithRoles: UserWithRole[] = (profiles || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        isAdmin: adminUserIds.has(p.user_id)
      }));

      setUsers(usersWithRoles);

      // Load metrics
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: organizationsCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("is_root", true);

      // Projects are direct children of organizations
      const { data: orgs } = await supabase
        .from("tasks")
        .select("id")
        .eq("is_root", true);

      const orgIds = orgs?.map(o => o.id) || [];
      
      const { count: projectsCount } = await supabase
        .from("task_relations")
        .select("*", { count: "exact", head: true })
        .in("parent_id", orgIds);

      const { count: tasksCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true });

      setMetrics({
        usersCount: usersCount || 0,
        organizationsCount: organizationsCount || 0,
        projectsCount: projectsCount || 0,
        tasksCount: tasksCount || 0
      });
    } catch (error) {
      console.error("Error loading admin data:", error);
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, currentlyAdmin: boolean) => {
    try {
      if (currentlyAdmin) {
        // Remove admin role
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        toast.success("Роль администратора снята");
      } else {
        // Add admin role
        await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        toast.success("Назначен администратором");
      }

      // Refresh users list
      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, isAdmin: !currentlyAdmin } : u
      ));
    } catch (error) {
      console.error("Error toggling admin role:", error);
      toast.error("Ошибка изменения роли");
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-accent">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  if (!isSystemAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-accent p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Админ-панель
            </h1>
            <p className="text-white/70 text-sm">Управление системой</p>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-white/70" />
                <div>
                  <p className="text-2xl font-bold text-white">{metrics.usersCount}</p>
                  <p className="text-sm text-white/70">Пользователей</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-white/70" />
                <div>
                  <p className="text-2xl font-bold text-white">{metrics.organizationsCount}</p>
                  <p className="text-sm text-white/70">Организаций</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FolderKanban className="h-8 w-8 text-white/70" />
                <div>
                  <p className="text-2xl font-bold text-white">{metrics.projectsCount}</p>
                  <p className="text-sm text-white/70">Проектов</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-8 w-8 text-white/70" />
                <div>
                  <p className="text-2xl font-bold text-white">{metrics.tasksCount}</p>
                  <p className="text-sm text-white/70">Задач</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users table */}
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Пользователи
            </CardTitle>
            <CardDescription className="text-white/60">
              Управление ролями пользователей
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/20 hover:bg-white/5">
                  <TableHead className="text-white/70">Пользователь</TableHead>
                  <TableHead className="text-white/70">Статус</TableHead>
                  <TableHead className="text-white/70 text-right">Системный админ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt="" 
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm">
                            {user.full_name?.[0] || "?"}
                          </div>
                        )}
                        <span>{user.full_name || "Без имени"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Администратор
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-white/60 border-white/30">
                          Пользователь
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={user.isAdmin}
                        onCheckedChange={() => toggleAdminRole(user.user_id, user.isAdmin)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
