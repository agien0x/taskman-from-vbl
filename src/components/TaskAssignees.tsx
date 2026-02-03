import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown } from 'lucide-react';
import { TaskAssignment } from '@/hooks/useTaskAssignments';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskAssigneesProps {
  assignments: TaskAssignment[];
  maxVisible?: number;
}

export const TaskAssignees = ({ assignments, maxVisible = 3 }: TaskAssigneesProps) => {
  const visibleAssignments = assignments.slice(0, maxVisible);
  const remainingCount = Math.max(0, assignments.length - maxVisible);

  if (assignments.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center">
      {visibleAssignments.map((assignment, index) => {
        const initials = assignment.profile?.full_name
          ?.split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase() || '?';
        
        const isOwner = assignment.role === 'owner';

        return (
          <Tooltip key={assignment.id}>
            <TooltipTrigger asChild>
              <div 
                className="relative"
                style={{ 
                  marginLeft: index > 0 ? '-8px' : '0',
                  zIndex: assignments.length - index 
                }}
              >
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={assignment.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                {isOwner && (
                  <div className="absolute -top-1 -right-1 bg-primary rounded-full p-0.5">
                    <Crown className="h-2.5 w-2.5 text-primary-foreground fill-primary-foreground" />
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex items-center gap-1">
                {assignment.profile?.full_name || 'Неизвестный пользователь'}
                {isOwner && <Crown className="h-3 w-3 ml-1" />}
              </div>
              <div className="text-xs text-muted-foreground">
                {isOwner ? 'Владелец' : 'Участник'}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
      
      {remainingCount > 0 && (
        <div 
          className="relative flex items-center justify-center h-8 w-8 rounded-full bg-muted border-2 border-background text-xs font-medium"
          style={{ marginLeft: '-8px', zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};
