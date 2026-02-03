import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TaskLog {
  id: string;
  task_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user_id: string | null;
  user_name?: string;
}

export const useTaskLogs = (taskId: string) => {
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('task_logs')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Загружаем информацию о пользователях
      const userIds = [...new Set(logsData?.map(log => log.user_id).filter(Boolean) || [])];
      
      let usersMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        if (profiles) {
          usersMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = p.full_name || 'Неизвестный пользователь';
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const logsWithUsers = (logsData || []).map(log => ({
        ...log,
        user_name: log.user_id ? usersMap[log.user_id] || 'Неизвестный пользователь' : 'Система'
      }));

      setLogs(logsWithUsers);
    } catch (error) {
      console.error('Error loading task logs:', error);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      loadLogs();
    }
  }, [taskId]);

  return {
    logs,
    isLoading,
    loadLogs,
  };
};
