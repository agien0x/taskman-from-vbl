import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";

export type BoardSortOption = "owner_first" | "priority" | "end_date" | "owner" | "updated_at" | null;
export type BoardSortDirection = "asc" | "desc";
export type BoardViewMode = "board" | "table" | "graph";

export interface BoardUserSettings {
  id?: string;
  user_id: string;
  board_id: string;
  view_mode: BoardViewMode;
  sort_by: BoardSortOption;
  sort_direction: BoardSortDirection;
  filter_by_owner: string | null;
  hide_completed: boolean;
  search_query: string;
  card_positions: Record<string, number>;
  collapsed_columns: string[];
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_SETTINGS: Omit<BoardUserSettings, 'user_id' | 'board_id'> = {
  view_mode: 'board',
  sort_by: 'owner_first',
  sort_direction: 'desc',
  filter_by_owner: null,
  hide_completed: true,
  search_query: '',
  card_positions: {},
  collapsed_columns: [],
};

export const useBoardUserSettings = (boardId: string | null) => {
  const { userId } = useCurrentUser();
  const [settings, setSettings] = useState<BoardUserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Partial<BoardUserSettings>>({});

  // Load settings on mount
  useEffect(() => {
    if (!boardId || !userId) {
      setIsLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        // Using 'any' cast until types are regenerated
        const { data, error } = await (supabase
          .from('board_user_settings' as any)
          .select('*')
          .eq('board_id', boardId)
          .eq('user_id', userId)
          .maybeSingle()) as { data: any; error: any };

        if (error) throw error;

        if (data) {
          setSettings({
            id: data.id,
            user_id: data.user_id,
            board_id: data.board_id,
            view_mode: data.view_mode as BoardViewMode,
            sort_by: data.sort_by as BoardSortOption,
            sort_direction: data.sort_direction as BoardSortDirection,
            filter_by_owner: data.filter_by_owner,
            hide_completed: data.hide_completed ?? true,
            search_query: data.search_query ?? '',
            card_positions: (data.card_positions as Record<string, number>) || {},
            collapsed_columns: (data.collapsed_columns as string[]) || [],
            created_at: data.created_at,
            updated_at: data.updated_at,
          });
        } else {
          // Return defaults if no settings exist
          setSettings({
            ...DEFAULT_SETTINGS,
            user_id: userId,
            board_id: boardId,
          });
        }
      } catch (error) {
        console.error('Error loading board user settings:', error);
        // Return defaults on error
        if (userId && boardId) {
          setSettings({
            ...DEFAULT_SETTINGS,
            user_id: userId,
            board_id: boardId,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [boardId, userId]);

  // Debounced save function
  const saveSettings = useCallback(async (updates: Partial<BoardUserSettings>) => {
    if (!boardId || !userId) return;

    // Merge with pending updates
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 500ms
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const updatesToSave = pendingUpdatesRef.current;
        pendingUpdatesRef.current = {};

        // Using 'any' cast until types are regenerated
        const { error } = await (supabase
          .from('board_user_settings' as any)
          .upsert({
            user_id: userId,
            board_id: boardId,
            ...updatesToSave,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,board_id',
          })) as { error: any };

        if (error) throw error;
      } catch (error) {
        console.error('Error saving board user settings:', error);
      }
    }, 500);
  }, [boardId, userId]);

  // Update settings locally and save
  const updateSettings = useCallback((updates: Partial<BoardUserSettings>) => {
    setSettings(prev => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
    saveSettings(updates);
  }, [saveSettings]);

  // Save card position
  const saveCardPosition = useCallback((taskId: string, position: number) => {
    setSettings(prev => {
      if (!prev) return prev;
      const newPositions = { ...prev.card_positions, [taskId]: position };
      saveSettings({ card_positions: newPositions });
      return { ...prev, card_positions: newPositions };
    });
  }, [saveSettings]);

  // Toggle collapsed column
  const toggleCollapsedColumn = useCallback((columnId: string) => {
    setSettings(prev => {
      if (!prev) return prev;
      const isCollapsed = prev.collapsed_columns.includes(columnId);
      const newCollapsed = isCollapsed
        ? prev.collapsed_columns.filter(id => id !== columnId)
        : [...prev.collapsed_columns, columnId];
      saveSettings({ collapsed_columns: newCollapsed });
      return { ...prev, collapsed_columns: newCollapsed };
    });
  }, [saveSettings]);

  // Get card position (with fallback)
  const getCardPosition = useCallback((taskId: string, fallbackPosition: number): number => {
    if (!settings) return fallbackPosition;
    return settings.card_positions[taskId] ?? fallbackPosition;
  }, [settings]);

  // Reset settings to default
  const resetSettings = useCallback(() => {
    if (!userId || !boardId) return;
    const newSettings: BoardUserSettings = {
      ...DEFAULT_SETTINGS,
      user_id: userId,
      board_id: boardId,
    };
    setSettings(newSettings);
    saveSettings(newSettings);
  }, [userId, boardId, saveSettings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    settings,
    isLoading,
    updateSettings,
    saveCardPosition,
    toggleCollapsedColumn,
    getCardPosition,
    resetSettings,
  };
};
