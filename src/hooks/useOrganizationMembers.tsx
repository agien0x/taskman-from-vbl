import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "admin" | "member";
  created_at: string;
  invited_by: string | null;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useOrganizationMembers = (organizationId: string | null) => {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<"admin" | "member" | null>(null);

  const loadMembers = useCallback(async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles for all members
      const userIds = (data || []).map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]));

      const membersWithProfiles: OrganizationMember[] = (data || []).map(member => ({
        ...member,
        role: member.role as "admin" | "member",
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
      console.error("Error loading organization members:", error);
      toast.error("Ошибка загрузки участников");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const addMember = async (userId: string, role: "admin" | "member" = "member") => {
    if (!organizationId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("organization_members")
        .insert({
          organization_id: organizationId,
          user_id: userId,
          role,
          invited_by: user?.id
        });

      if (error) throw error;

      toast.success("Участник добавлен");
      await loadMembers();
      return true;
    } catch (error: any) {
      console.error("Error adding member:", error);
      if (error.code === "23505") {
        toast.error("Пользователь уже является участником");
      } else {
        toast.error("Ошибка добавления участника");
      }
      return false;
    }
  };

  const updateMemberRole = async (memberId: string, newRole: "admin" | "member") => {
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Роль обновлена");
      await loadMembers();
      return true;
    } catch (error) {
      console.error("Error updating member role:", error);
      toast.error("Ошибка обновления роли");
      return false;
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Участник удалён");
      await loadMembers();
      return true;
    } catch (error) {
      console.error("Error removing member:", error);
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
