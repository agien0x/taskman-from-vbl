import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MyOrganization {
  id: string;
  title: string;
  role: "admin" | "member";
}

export const useMyOrganizations = () => {
  const [organizations, setOrganizations] = useState<MyOrganization[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrganizations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setOrganizations([]);
        setLoading(false);
        return;
      }

      // Get organization memberships for current user
      const { data: memberships, error: membershipsError } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id);

      if (membershipsError) throw membershipsError;

      if (!memberships || memberships.length === 0) {
        setOrganizations([]);
        setLoading(false);
        return;
      }

      // Get organization details (tasks with is_root = true)
      const orgIds = memberships.map(m => m.organization_id);
      const { data: orgs, error: orgsError } = await supabase
        .from("tasks")
        .select("id, title")
        .in("id", orgIds)
        .eq("is_root", true)
        .order("title", { ascending: true });

      if (orgsError) throw orgsError;

      const roleMap = new Map(memberships.map(m => [m.organization_id, m.role]));

      const result: MyOrganization[] = (orgs || []).map(org => ({
        id: org.id,
        title: org.title,
        role: roleMap.get(org.id) as "admin" | "member"
      }));

      setOrganizations(result);
    } catch (error) {
      console.error("Error loading organizations:", error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrganizations();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadOrganizations();
    });

    return () => subscription.unsubscribe();
  }, [loadOrganizations]);

  return { organizations, loading, refresh: loadOrganizations };
};
