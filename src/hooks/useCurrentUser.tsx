import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

// Глобальный кеш для пользователя
let cachedUser: User | null = null;
let userPromise: Promise<User | null> | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 60000; // 1 минута

export const useCurrentUser = () => {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  useEffect(() => {
    const fetchUser = async () => {
      const now = Date.now();
      
      // Используем кеш если он свежий
      if (cachedUser && now - lastFetchTime < CACHE_TTL) {
        setUser(cachedUser);
        setLoading(false);
        return;
      }

      // Предотвращаем параллельные запросы
      if (!userPromise) {
        userPromise = supabase.auth.getUser().then(({ data }) => {
          cachedUser = data.user;
          lastFetchTime = Date.now();
          userPromise = null;
          return data.user;
        }).catch(() => {
          userPromise = null;
          return null;
        });
      }

      const fetchedUser = await userPromise;
      setUser(fetchedUser);
      setLoading(false);
    };

    fetchUser();

    // Слушаем изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      cachedUser = session?.user ?? null;
      lastFetchTime = Date.now();
      setUser(cachedUser);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, userId: user?.id ?? null };
};

// Синхронный геттер для использования вне React
export const getCurrentUserId = (): string | null => {
  return cachedUser?.id ?? null;
};

// Принудительное обновление кеша
export const invalidateUserCache = () => {
  cachedUser = null;
  lastFetchTime = 0;
  userPromise = null;
};
