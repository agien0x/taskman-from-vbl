import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskOwnerAvatarProps {
  ownerId?: string | null;
  size?: "sm" | "md";
}

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

export const TaskOwnerAvatar = ({ ownerId, size = "md" }: TaskOwnerAvatarProps) => {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!ownerId) return;

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("user_id", ownerId)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    loadProfile();
  }, [ownerId]);

  if (!ownerId || !profile) {
    return null;
  }

  const sizeClass = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const initials = profile.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar className={`${sizeClass} rounded-full`}>
          <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || "User"} />
          <AvatarFallback className="text-xs rounded-full">{initials}</AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>
        <p>{profile.full_name || "Без имени"}</p>
      </TooltipContent>
    </Tooltip>
  );
};
