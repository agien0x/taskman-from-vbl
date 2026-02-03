import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSystemAdmin = () => {
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsSystemAdmin(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("Error checking admin role:", error);
          setIsSystemAdmin(false);
        } else {
          setIsSystemAdmin(!!data);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsSystemAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isSystemAdmin, loading };
};
