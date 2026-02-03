import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Crown, UserPlus, X } from 'lucide-react';
import { useTaskAssignments, TaskAssignment } from '@/hooks/useTaskAssignments';
import { TaskAssignees } from '@/components/TaskAssignees';
import { cn } from '@/lib/utils';

interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface TaskAssignmentSelectorProps {
  taskId: string;
  compact?: boolean;
}

export const TaskAssignmentSelector = ({ taskId, compact = false }: TaskAssignmentSelectorProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { assignments, addAssignment, removeAssignment, updateRole } = useTaskAssignments(taskId);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .order('full_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const isAssigned = (userId: string) => {
    return assignments.some(a => a.user_id === userId);
  };

  const getAssignment = (userId: string) => {
    return assignments.find(a => a.user_id === userId);
  };

  const handleToggleAssignment = async (userId: string) => {
    const assignment = getAssignment(userId);
    if (assignment) {
      await removeAssignment(assignment.id);
    } else {
      await addAssignment(userId, 'contributor');
    }
  };

  const handleToggleRole = async (userId: string) => {
    const assignment = getAssignment(userId);
    if (assignment) {
      const newRole = assignment.role === 'owner' ? 'contributor' : 'owner';
      await updateRole(assignment.id, newRole);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {assignments.length > 0 ? (
          <Button variant="ghost" size="sm" className={cn("h-auto px-1", compact && "h-7")}>
            <TaskAssignees assignments={assignments} maxVisible={3} />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className={cn("gap-1", compact && "h-7")}>
            <UserPlus className="h-3.5 w-3.5" />
            {!compact && <span className="text-xs">Назначить</span>}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск пользователей..." />
          <CommandList>
            <CommandEmpty>Пользователи не найдены</CommandEmpty>
            <CommandGroup heading="Участники">
              {profiles.map((profile) => {
                const assignment = getAssignment(profile.user_id);
                const assigned = !!assignment;
                const isOwner = assignment?.role === 'owner';
                const initials = profile.full_name
                  ?.split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase() || '?';

                return (
                  <CommandItem
                    key={profile.user_id}
                    onSelect={() => handleToggleAssignment(profile.user_id)}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        {isOwner && (
                          <div className="absolute -top-0.5 -right-0.5 bg-primary rounded-full p-0.5">
                            <Crown className="h-2 w-2 text-primary-foreground fill-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="flex-1">{profile.full_name || 'Неизвестный пользователь'}</span>
                      {assigned && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRole(profile.user_id);
                          }}
                        >
                          <Crown className={cn(
                            "h-3.5 w-3.5",
                            isOwner && "text-primary fill-primary"
                          )} />
                        </Button>
                      )}
                      {assigned && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        {assignments.length > 0 && (
          <div className="border-t p-2">
            <div className="text-xs text-muted-foreground px-2 py-1">
              Нажмите на <Crown className="h-3 w-3 inline" /> чтобы сделать владельцем
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
