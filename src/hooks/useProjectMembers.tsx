import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: "owner" | "member";
  created_at: string;
  granted_by: string | null;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useProjectMembers = (projectId: string | null) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<"owner" | "member" | null>(null);

  const loadMembers = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles for all members
      const userIds = (data || []).map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]));

      const membersWithProfiles: ProjectMember[] = (data || []).map(member => ({
        ...member,
        role: member.role as "owner" | "member",
        profile: profilesMap.get(member.user_id) || undefined
      }));

      setMembers(membersWithProfiles);

      // Check current user's role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const currentMember = membersWithProfiles.find(m => m.user_id === user.id);
        setCurrentUserRole(currentMember?.role || null);
      }
    } catch (error) {
      console.error("Error loading project members:", error);
      toast.error("Ошибка загрузки участников проекта");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const addMember = async (userId: string, role: "owner" | "member" = "member") => {
    if (!projectId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("project_members")
        .insert({
          project_id: projectId,
          user_id: userId,
          role,
          granted_by: user?.id
        });

      if (error) throw error;

      toast.success("Участник добавлен в проект");
      await loadMembers();
      return true;
    } catch (error: any) {
      console.error("Error adding project member:", error);
      if (error.code === "23505") {
        toast.error("Пользователь уже является участником проекта");
      } else {
        toast.error("Ошибка добавления участника");
      }
      return false;
    }
  };

  const updateMemberRole = async (memberId: string, newRole: "owner" | "member") => {
    try {
      const { error } = await supabase
        .from("project_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Роль обновлена");
      await loadMembers();
      return true;
    } catch (error) {
      console.error("Error updating project member role:", error);
      toast.error("Ошибка обновления роли");
      return false;
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Участник удалён из проекта");
      await loadMembers();
      return true;
    } catch (error) {
      console.error("Error removing project member:", error);
      toast.error("Ошибка удаления участника");
      return false;
    }
  };

  return {
    members,
    loading,
    currentUserRole,
    addMember,
    updateMemberRole,
    removeMember,
    refresh: loadMembers
  };
};
