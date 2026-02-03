import { useState, useEffect } from "react";

interface PinnedTask {
  id: string;
  title: string;
  emoji?: string;
}

const STORAGE_KEY = "pinnedTasks";

export const usePinnedTasks = () => {
  const [pinnedTasks, setPinnedTasks] = useState<PinnedTask[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedTasks));
  }, [pinnedTasks]);

  const pinTask = (task: PinnedTask) => {
    setPinnedTasks((prev) => {
      if (prev.some((t) => t.id === task.id)) return prev;
      return [...prev, task];
    });
  };

  const unpinTask = (taskId: string) => {
    setPinnedTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const isPinned = (taskId: string) => {
    return pinnedTasks.some((t) => t.id === taskId);
  };

  return { pinnedTasks, pinTask, unpinTask, isPinned };
};
