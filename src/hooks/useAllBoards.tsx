import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BoardItem {
  id: string;
  title: string;
  updatedAt: string;
  role: "admin" | "executor" | "viewer";
  isRoot: boolean;
  isPersonal?: boolean;
}

export const useAllBoards = () => {
  const [personalBoard, setPersonalBoard] = useState<BoardItem | null>(null);
  const [rootBoards, setRootBoards] = useState<BoardItem[]>([]);
  const [recentBoards, setRecentBoards] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBoards = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPersonalBoard(null);
        setRootBoards([]);
        setRecentBoards([]);
        setLoading(false);
        return;
      }

      // Get user's personal board
      const { data: personalBoardData, error: personalError } = await supabase
        .from("tasks")
        .select("id, title, updated_at, is_root, task_type")
        .eq("owner_id", user.id)
        .eq("task_type", "personal_board")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (personalError) throw personalError;

      if (personalBoardData) {
        setPersonalBoard({
          id: personalBoardData.id,
          title: user.email || personalBoardData.title,
          updatedAt: personalBoardData.updated_at,
          role: "admin",
          isRoot: personalBoardData.is_root,
          isPersonal: true,
        });
      } else {
        setPersonalBoard(null);
      }

      // Get root boards where user is owner (exclude personal_board)
      const { data: ownedRootBoards, error: ownedRootError } = await supabase
        .from("tasks")
        .select("id, title, updated_at, is_root, task_type")
        .eq("owner_id", user.id)
        .eq("is_root", true)
        .neq("task_type", "personal_board")
        .order("title", { ascending: true });

      if (ownedRootError) throw ownedRootError;

      // Get root boards via organization_members
      const { data: orgMemberships, error: orgError } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id);

      if (orgError) throw orgError;

      const orgIds = orgMemberships?.map(m => m.organization_id) || [];
      const orgRoleMap = new Map(orgMemberships?.map(m => [m.organization_id, m.role]) || []);

      let orgBoards: any[] = [];
      if (orgIds.length > 0) {
        const ownedIds = (ownedRootBoards || []).map(b => b.id);
        const filteredOrgIds = orgIds.filter(id => !ownedIds.includes(id));

        if (filteredOrgIds.length > 0) {
          const { data, error } = await supabase
            .from("tasks")
            .select("id, title, updated_at, is_root")
            .in("id", filteredOrgIds)
            .order("title", { ascending: true });

          if (error) throw error;
          orgBoards = data || [];
        }
      }

      // Get task assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from("task_assignments")
        .select("task_id, board_role")
        .eq("user_id", user.id);

      if (assignmentsError) throw assignmentsError;

      const assignedTaskIds = assignments?.map(a => a.task_id) || [];
      const roleMap = new Map(assignments?.map(a => [a.task_id, a.board_role]) || []);

      // Get assigned root boards (not already covered)
      const coveredIds = [...(ownedRootBoards || []).map(b => b.id), ...orgBoards.map(b => b.id)];
      const remainingRootIds = assignedTaskIds.filter(id => !coveredIds.includes(id));

      let assignedRootBoards: any[] = [];
      if (remainingRootIds.length > 0) {
        const { data, error } = await supabase
          .from("tasks")
          .select("id, title, updated_at, is_root")
          .in("id", remainingRootIds)
          .eq("is_root", true)
          .order("title", { ascending: true });

        if (error) throw error;
        assignedRootBoards = data || [];
      }

      // Combine all root boards
      const allRootBoards: BoardItem[] = [
        ...(ownedRootBoards || []).map(b => ({
          id: b.id,
          title: b.title,
          updatedAt: b.updated_at,
          role: "admin" as const,
          isRoot: true,
        })),
        ...orgBoards.map(b => ({
          id: b.id,
          title: b.title,
          updatedAt: b.updated_at,
          role: orgRoleMap.get(b.id) === "admin" ? "admin" as const : "executor" as const,
          isRoot: true,
        })),
        ...assignedRootBoards.map(b => ({
          id: b.id,
          title: b.title,
          updatedAt: b.updated_at,
          role: (roleMap.get(b.id) || "executor") as "admin" | "executor" | "viewer",
          isRoot: true,
        })),
      ].sort((a, b) => a.title.localeCompare(b.title));

      // Remove duplicates from root boards
      const uniqueRootBoards = allRootBoards.filter((board, index, self) =>
        index === self.findIndex(b => b.id === board.id)
      );

      // Get recent non-root boards
      const { data: recentOwnedBoards, error: recentOwnedError } = await supabase
        .from("tasks")
        .select("id, title, updated_at, is_root")
        .eq("owner_id", user.id)
        .eq("is_root", false)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (recentOwnedError) throw recentOwnedError;

      // Get recent assigned non-root boards
      let recentAssignedBoards: any[] = [];
      if (assignedTaskIds.length > 0) {
        const ownedIds = (recentOwnedBoards || []).map(b => b.id);
        const filteredIds = assignedTaskIds.filter(id => !ownedIds.includes(id));

        if (filteredIds.length > 0) {
          const { data, error } = await supabase
            .from("tasks")
            .select("id, title, updated_at, is_root")
            .in("id", filteredIds)
            .eq("is_root", false)
            .order("updated_at", { ascending: false })
            .limit(10);

          if (error) throw error;
          recentAssignedBoards = data || [];
        }
      }

      // Combine recent boards
      const allRecentBoards: BoardItem[] = [
        ...(recentOwnedBoards || []).map(b => ({
          id: b.id,
          title: b.title,
          updatedAt: b.updated_at,
          role: "admin" as const,
          isRoot: false,
        })),
        ...recentAssignedBoards.map(b => ({
          id: b.id,
          title: b.title,
          updatedAt: b.updated_at,
          role: (roleMap.get(b.id) || "executor") as "admin" | "executor" | "viewer",
          isRoot: false,
        })),
      ]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

      // Remove duplicates and exclude personal board
      const personalId = personalBoardData?.id;
      const rootIds = new Set(uniqueRootBoards.map(b => b.id));
      if (personalId) rootIds.add(personalId);
      const filteredRecent = allRecentBoards.filter(b => !rootIds.has(b.id));

      setRootBoards(uniqueRootBoards);
      setRecentBoards(filteredRecent);
    } catch (error) {
      console.error("Error loading boards:", error);
      setPersonalBoard(null);
      setRootBoards([]);
      setRecentBoards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoards();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadBoards();
    });

    return () => subscription.unsubscribe();
  }, [loadBoards]);

  return { personalBoard, rootBoards, recentBoards, loading, refresh: loadBoards };
};
