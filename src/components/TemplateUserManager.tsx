import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTemplateAssignments } from "@/hooks/useTaskTypeTemplates";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface TemplateUserManagerProps {
  templateId: string;
  isOwner: boolean;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const TemplateUserManager = ({ templateId, isOwner }: TemplateUserManagerProps) => {
  const { assignments, addAssignment, removeAssignment } = useTemplateAssignments(templateId);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Загрузка всех пользователей для выбора
  const { data: allProfiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });

      if (error) throw error;
      return data as Profile[];
    },
    enabled: isOwner,
  });

  // Фильтруем пользователей, которые еще не назначены
  const assignedUserIds = new Set(assignments.map((a: any) => a.user_id));
  const availableProfiles = allProfiles.filter(
    (p) => !assignedUserIds.has(p.user_id) && 
           p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleAddSelectedUsers = async () => {
    for (const userId of selectedUsers) {
      await addAssignment(userId);
    }
    setSelectedUsers(new Set());
    setSearchQuery("");
    setIsPopoverOpen(false);
  };

  const handleRemoveUser = (assignmentId: string) => {
    if (confirm("Удалить пользователя из шаблона?")) {
      removeAssignment(assignmentId);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isOwner) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Назначенные пользователи</span>
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs gap-1"
            >
              <UserPlus className="h-3 w-3" />
              Добавить
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="end">
            <div className="space-y-3">
              <Input
                placeholder="Поиск пользователей..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-sm"
              />
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {availableProfiles.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      {searchQuery ? "Пользователи не найдены" : "Все пользователи назначены"}
                    </div>
                  ) : (
                    availableProfiles.map((profile) => (
                      <div
                        key={profile.id}
                        onClick={() => toggleUserSelection(profile.user_id)}
                        className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedUsers.has(profile.user_id)}
                          onCheckedChange={() => toggleUserSelection(profile.user_id)}
                        />
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm flex-1">
                          {profile.full_name || "Без имени"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              {selectedUsers.size > 0 && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Выбрано: {selectedUsers.size}
                  </span>
                  <Button
                    size="sm"
                    onClick={handleAddSelectedUsers}
                    className="h-7 text-xs"
                  >
                    Добавить
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {assignments.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-2 border rounded-md border-dashed">
          Нет назначенных пользователей
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {assignments.map((assignment: any) => (
            <Badge
              key={assignment.id}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
            >
              <Avatar className="h-4 w-4">
                <AvatarImage src={assignment.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">
                  {getInitials(assignment.profiles?.full_name)}
                </AvatarFallback>
              </Avatar>
              <span>{assignment.profiles?.full_name || "Без имени"}</span>
              <button
                onClick={() => handleRemoveUser(assignment.id)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
