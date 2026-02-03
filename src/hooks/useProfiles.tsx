import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

// Глобальный кеш профилей
const profilesCache = new Map<string, Profile>();
let allProfilesLoaded = false;
let allProfilesPromise: Promise<void> | null = null;

export const useProfiles = (userIds: string[] = []) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadProfiles = useCallback(async () => {
    if (userIds.length === 0) {
      setProfiles([]);
      return;
    }

    // Фильтруем уже закешированные
    const uncachedIds = userIds.filter(id => !profilesCache.has(id));
    const cachedProfiles = userIds
      .map(id => profilesCache.get(id))
      .filter((p): p is Profile => p !== undefined);

    // Если все уже в кеше
    if (uncachedIds.length === 0) {
      setProfiles(cachedProfiles);
      return;
    }

    setLoading(true);

    try {
      // Загружаем только отсутствующие
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', uncachedIds);

      if (!error && data) {
        data.forEach(profile => {
          profilesCache.set(profile.user_id, profile);
        });
      }

      // Собираем результат
      const result = userIds
        .map(id => profilesCache.get(id))
        .filter((p): p is Profile => p !== undefined);
      
      setProfiles(result);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  }, [userIds.join(',')]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  return { profiles, loading };
};

// Загрузить все профили один раз
export const useAllProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(!allProfilesLoaded);

  useEffect(() => {
    const loadAll = async () => {
      if (allProfilesLoaded) {
        setProfiles(Array.from(profilesCache.values()));
        setLoading(false);
        return;
      }

      // Предотвращаем параллельные запросы
      if (!allProfilesPromise) {
        allProfilesPromise = (async (): Promise<void> => {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('user_id, full_name, avatar_url')
              .order('full_name', { ascending: true });

            if (!error && data) {
              data.forEach(profile => {
                profilesCache.set(profile.user_id, profile);
              });
              allProfilesLoaded = true;
            }
          } finally {
            allProfilesPromise = null;
          }
        })();
      }

      await allProfilesPromise;
      setProfiles(Array.from(profilesCache.values()));
      setLoading(false);
    };

    loadAll();
  }, []);

  return { profiles, loading };
};

// Получить профиль по ID (синхронно из кеша)
export const getProfileFromCache = (userId: string): Profile | undefined => {
  return profilesCache.get(userId);
};

// Инвалидировать кеш
export const invalidateProfilesCache = () => {
  profilesCache.clear();
  allProfilesLoaded = false;
};
