import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
}

interface TaskOwnerSelectorProps {
  taskId: string;
  currentOwnerId: string | null;
  onOwnerChange?: () => void;
  compact?: boolean;
}

export const TaskOwnerSelector = ({ taskId, currentOwnerId, onOwnerChange, compact = false }: TaskOwnerSelectorProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error loading profiles:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список пользователей",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerChange = async (newOwnerId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ owner_id: newOwnerId })
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Владелец задачи изменен",
      });

      if (onOwnerChange) {
        onOwnerChange();
      }
    } catch (error) {
      console.error("Error updating owner:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить владельца",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Загрузка...</div>;
  }

  if (compact) {
    const currentOwner = profiles.find(p => p.user_id === currentOwnerId);
    
    return (
      <Select
        value={currentOwnerId || undefined}
        onValueChange={handleOwnerChange}
      >
        <SelectTrigger className="h-7 w-7 p-0 border-0">
          {currentOwner ? (
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
              {(currentOwner.full_name || "?").charAt(0).toUpperCase()}
            </div>
          ) : (
            <User className="h-4 w-4 text-muted-foreground" />
          )}
        </SelectTrigger>
        <SelectContent>
          {profiles.map((profile) => (
            <SelectItem key={profile.user_id} value={profile.user_id}>
              {profile.full_name || "Без имени"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentOwnerId || undefined}
        onValueChange={handleOwnerChange}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Выберите владельца" />
        </SelectTrigger>
        <SelectContent>
          {profiles.map((profile) => (
            <SelectItem key={profile.user_id} value={profile.user_id}>
              {profile.full_name || "Без имени"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
