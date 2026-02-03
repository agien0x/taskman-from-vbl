import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type TaskType = "task" | "personal_board" | "standup" | "function" | "organization";

export interface TaskTypeTemplate {
  id: string;
  task_type: TaskType;
  name: string;
  template: string | null;
  quality_criteria: string | null;
  is_global: boolean;
  is_active: boolean;
  owner_id: string | null;
  recurrence_type: string | null;
  recurrence_days: number[];
  recurrence_time: string | null;
  recurrence_timezone: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateAssignment {
  id: string;
  template_id: string;
  user_id: string;
  created_at: string;
}

export const useTaskTypeTemplates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Загрузка всех доступных шаблонов (свои + глобальные + назначенные)
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["task-type-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_type_templates" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as TaskTypeTemplate[];
    },
  });

  // Создание нового шаблона
  const createTemplate = useMutation({
    mutationFn: async (template: Omit<TaskTypeTemplate, "id" | "created_at" | "updated_at" | "owner_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("task_type_templates" as any)
        .insert({
          task_type: template.task_type,
          name: template.name,
          template: template.template,
          quality_criteria: template.quality_criteria,
          is_global: template.is_global,
          is_active: template.is_active,
          recurrence_type: template.recurrence_type,
          recurrence_days: template.recurrence_days,
          recurrence_time: template.recurrence_time,
          recurrence_timezone: template.recurrence_timezone,
          owner_id: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-type-templates"] });
      toast({
        title: "Шаблон создан",
        description: "Новый шаблон успешно сохранен",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось создать шаблон: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Обновление шаблона
  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TaskTypeTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("task_type_templates" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-type-templates"] });
      toast({
        title: "Шаблон обновлен",
        description: "Изменения успешно сохранены",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось обновить шаблон: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Удаление шаблона
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("task_type_templates" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-type-templates"] });
      toast({
        title: "Шаблон удален",
        description: "Шаблон успешно удален",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось удалить шаблон: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createTemplate.mutate,
    updateTemplate: updateTemplate.mutate,
    deleteTemplate: deleteTemplate.mutate,
  };
};

// Хук для работы с назначениями шаблонов
export const useTemplateAssignments = (templateId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Загрузка назначений для шаблона
  const { data: assignments = [] } = useQuery({
    queryKey: ["template-assignments", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_type_template_assignments" as any)
        .select("*, profiles(full_name, avatar_url)")
        .eq("template_id", templateId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!templateId,
  });

  // Добавление пользователя к шаблону
  const addAssignment = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase
        .from("task_type_template_assignments" as any)
        .insert({
          template_id: templateId,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-assignments", templateId] });
      toast({
        title: "Пользователь добавлен",
        description: "Пользователь получил доступ к шаблону",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось добавить пользователя: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Удаление пользователя из шаблона
  const removeAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("task_type_template_assignments" as any)
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-assignments", templateId] });
      toast({
        title: "Пользователь удален",
        description: "Пользователь больше не имеет доступа к шаблону",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось удалить пользователя: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    assignments,
    addAssignment: addAssignment.mutate,
    removeAssignment: removeAssignment.mutate,
  };
};
