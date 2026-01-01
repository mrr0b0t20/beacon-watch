import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Theme = 'dark' | 'light';

// Track if we've already synced from profile globally (persists across re-mounts)
let hasInitializedFromProfile = false;

export function useTheme() {
  const { user, profile } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return 'dark';
  });

  // Sync with profile theme only ONCE per session (first time profile loads)
  useEffect(() => {
    if (!hasInitializedFromProfile && profile?.theme && (profile.theme === 'light' || profile.theme === 'dark')) {
      const storedTheme = localStorage.getItem('theme');
      // Only sync from DB if localStorage doesn't have a theme yet
      if (!storedTheme) {
        setThemeState(profile.theme as Theme);
        localStorage.setItem('theme', profile.theme);
      }
      hasInitializedFromProfile = true;
    }
  }, [profile?.theme]);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);

    // Persist to database if logged in
    if (user) {
      await supabase
        .from('profiles')
        .update({ theme: newTheme })
        .eq('id', user.id);
    }
  }, [user]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
}
