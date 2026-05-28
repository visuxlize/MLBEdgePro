import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';

export interface UserSettings {
  favoriteTeamId: number | null;
  favoriteTeamName: string | null;
}

const STORAGE_KEY = '@mlbedgepro_settings';

const DEFAULT_SETTINGS: UserSettings = {
  favoriteTeamId: null,
  favoriteTeamName: null,
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setSettings(JSON.parse(raw));
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [settings]);

  return { settings, updateSettings, loaded };
}
