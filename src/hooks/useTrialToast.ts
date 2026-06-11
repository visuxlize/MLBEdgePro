import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useRef } from 'react';

// Bump this key any time you want to reset the "already shown" flag for all users
const TRIAL_TOAST_KEY = '@mlbedgepro_trial_toast_v2';
const DELAY_MS = 5_000;

export function useTrialToast(isPro: boolean, isLoaded: boolean) {
  const [visible, setVisible] = useState(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduledRef = useRef(false); // prevent double-scheduling across re-renders

  useEffect(() => {
    // Wait until Clerk has loaded the user's subscription status
    if (!isLoaded) return;
    // Don't show to paying users
    if (isPro) return;
    // Only schedule once per app session
    if (scheduledRef.current) return;

    scheduledRef.current = true;

    AsyncStorage.getItem(TRIAL_TOAST_KEY).then((val) => {
      // Already dismissed before — don't show again
      if (val === 'true') return;

      timerRef.current = setTimeout(() => setVisible(true), DELAY_MS);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]); // only re-run when isLoaded flips true — not on every isPro change

  const dismiss = async () => {
    setVisible(false);
    await AsyncStorage.setItem(TRIAL_TOAST_KEY, 'true');
  };

  return { visible, dismiss };
}
