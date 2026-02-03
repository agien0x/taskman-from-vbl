import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type TemplateMemberRole = 'owner' | 'contributor';

export interface TemplateAssignment {
  id: string;
  template_id: string;
  user_id: string;
  role: TemplateMemberRole;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useTemplateAssignments = (templateId: string, ownerId?: string | null) => {
  const [assignments, setAssignments] = useState<TemplateAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadAssignments = async () => {
    if (!templateId) return;
    
    setIsLoading(true);
    try {
      // Загружаем назначения из таблицы
      const { data, error } = await supabase
        .from('task_type_template_assignments')
        .select(`
          id,
          template_id,
          user_id,
          created_at
        `)
        .eq('template_id', templateId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const contributorAssignments = data || [];
      const allUserIds = [...contributorAssignments.map(a => a.user_id)];
      
      // Добавляем владельца в список пользователей, если он есть
      if (ownerId && !allUserIds.includes(ownerId)) {
        allUserIds.push(ownerId);
      }

      // Загружаем профили всех пользователей
      if (allUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', allUserIds);

        if (profilesError) throw profilesError;

        const profilesMap = (profiles || []).reduce((acc, profile) => {
          acc[profile.user_id] = {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          };
          return acc;
        }, {} as Record<string, { full_name: string | null; avatar_url: string | null }>);

        // Создаем массив назначений с профилями
        const assignmentsWithProfiles: TemplateAssignment[] = contributorAssignments.map(assignment => ({
          ...assignment,
          template_id: templateId,
          role: 'contributor' as TemplateMemberRole,
          profile: profilesMap[assignment.user_id],
        }));

        // Добавляем владельца как отдельное назначение, если он есть
        if (ownerId) {
          assignmentsWithProfiles.unshift({
            id: `owner-${ownerId}`,
            template_id: templateId,
            user_id: ownerId,
            role: 'owner' as TemplateMemberRole,
            created_at: new Date().toISOString(),
            profile: profilesMap[ownerId],
          });
        }

        setAssignments(assignmentsWithProfiles);
      } else {
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error loading template assignments:', error);
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addAssignment = async (userId: string, role: TemplateMemberRole = 'contributor') => {
    try {
      // Если пытаемся сделать кого-то владельцем, обновляем owner_id в шаблоне
      if (role === 'owner') {
        const { error } = await supabase
          .from('task_type_templates')
          .update({ owner_id: userId })
          .eq('id', templateId);

        if (error) throw error;
      } else {
        // Иначе добавляем как contributor
        const { error } = await supabase
          .from('task_type_template_assignments')
          .insert({ template_id: templateId, user_id: userId });

        if (error) throw error;
      }

      await loadAssignments();
      
      toast({
        title: 'Успешно',
        description: 'Пользователь добавлен',
      });
    } catch (error: any) {
      console.error('Error adding assignment:', error);
      toast({
        title: 'Ошибка',
        description: error.message?.includes('duplicate') 
          ? 'Пользователь уже назначен' 
          : 'Не удалось добавить пользователя',
        variant: 'destructive',
      });
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      // Если это владелец (id начинается с owner-), не удаляем
      if (assignmentId.startsWith('owner-')) {
        toast({
          title: 'Ошибка',
          description: 'Нельзя удалить владельца шаблона',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('task_type_template_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      await loadAssignments();
      
      toast({
        title: 'Успешно',
        description: 'Пользователь удален',
      });
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить пользователя',
        variant: 'destructive',
      });
    }
  };

  const updateRole = async (assignmentId: string, role: TemplateMemberRole) => {
    try {
      const assignment = assignments.find(a => a.id === assignmentId);
      if (!assignment) return;

      if (role === 'owner') {
        // Делаем пользователя владельцем
        const { error: updateError } = await supabase
          .from('task_type_templates')
          .update({ owner_id: assignment.user_id })
          .eq('id', templateId);

        if (updateError) throw updateError;

        // Если это был contributor, удаляем из назначений
        if (!assignmentId.startsWith('owner-')) {
          await supabase
            .from('task_type_template_assignments')
            .delete()
            .eq('id', assignmentId);
        }
      } else {
        // Делаем contributor - добавляем в назначения и убираем владельца
        const { error: insertError } = await supabase
          .from('task_type_template_assignments')
          .insert({ template_id: templateId, user_id: assignment.user_id });

        if (insertError && !insertError.message?.includes('duplicate')) {
          throw insertError;
        }

        // Убираем как владельца, только если это текущий владелец
        if (assignment.user_id === ownerId) {
          const { error: updateError } = await supabase
            .from('task_type_templates')
            .update({ owner_id: null })
            .eq('id', templateId);

          if (updateError) throw updateError;
        }
      }

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
    if (templateId) {
      loadAssignments();
    }
  }, [templateId, ownerId]);

  return {
    assignments,
    isLoading,
    loadAssignments,
    addAssignment,
    removeAssignment,
    updateRole,
  };
};
