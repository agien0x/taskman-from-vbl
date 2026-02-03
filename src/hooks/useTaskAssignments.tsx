import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfiles } from '@/hooks/useProfiles';

export type TaskMemberRole = 'owner' | 'contributor';

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  role: TaskMemberRole;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useTaskAssignments = (taskId: string) => {
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { profiles } = useProfiles(userIds);

  const loadAssignments = useCallback(async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    try {
      // Load task owner_id
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('owner_id')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          id,
          task_id,
          user_id,
          role,
          created_at
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // If task has owner_id but no owner assignment, create it
      if (taskData?.owner_id) {
        const hasOwnerAssignment = data?.some(a => a.user_id === taskData.owner_id && a.role === 'owner');
        
        if (!hasOwnerAssignment) {
          await supabase
            .from('task_assignments')
            .insert({
              task_id: taskId,
              user_id: taskData.owner_id,
              role: 'owner',
            });
          
          // Reload assignments after adding owner
          const { data: updatedData } = await supabase
            .from('task_assignments')
            .select(`
              id,
              task_id,
              user_id,
              role,
              created_at
            `)
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });
          
          if (updatedData) {
            data.length = 0;
            data.push(...updatedData);
          }
        }
      }

      // Сохраняем user_ids для загрузки профилей через кеш
      if (data && data.length > 0) {
        setUserIds(data.map(a => a.user_id));
        setAssignments(data.map(a => ({ ...a, profile: undefined })));
      } else {
        setUserIds([]);
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  // Обновляем профили когда они загружены
  useEffect(() => {
    if (profiles.length > 0) {
      const profilesMap = profiles.reduce((acc, profile) => {
        acc[profile.user_id] = {
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        };
        return acc;
      }, {} as Record<string, { full_name: string | null; avatar_url: string | null }>);

      setAssignments(prev => {
        // Проверяем, нужно ли обновление
        const needsUpdate = prev.some(a => !a.profile && profilesMap[a.user_id]);
        if (!needsUpdate && prev.every(a => a.profile)) return prev;
        
        return prev.map(assignment => ({
          ...assignment,
          profile: profilesMap[assignment.user_id] || assignment.profile,
        }));
      });
    }
  }, [profiles, assignments.length]);

  const addAssignment = async (userId: string, role: TaskMemberRole = 'contributor') => {
    try {
      const { error } = await supabase
        .from('task_assignments')
        .insert({ task_id: taskId, user_id: userId, role });

      if (error) throw error;

      await loadAssignments();
      
      toast({
        title: 'Успешно',
        description: 'Участник добавлен',
      });
    } catch (error) {
      console.error('Error adding assignment:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить участника',
        variant: 'destructive',
      });
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('task_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      await loadAssignments();
      
      toast({
        title: 'Успешно',
        description: 'Участник удален',
      });
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить участника',
        variant: 'destructive',
      });
    }
  };

  const updateRole = async (assignmentId: string, role: TaskMemberRole) => {
    try {
      const { error } = await supabase
        .from('task_assignments')
        .update({ role })
        .eq('id', assignmentId);

      if (error) throw error;

      await loadAssignments();
      
      toast({
        title: 'Успешно',
        description: 'Роль обновлена',
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить роль',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (taskId) {
      loadAssignments();
    }
  }, [taskId]);

  return {
    assignments,
    isLoading,
    loadAssignments,
    addAssignment,
    removeAssignment,
    updateRole,
  };
};
