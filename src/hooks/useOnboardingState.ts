import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

const ONBOARDING_KEY = '@mlbedgepro_onboarding_seen';

export function useOnboardingState() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((val) => {
        setHasSeenOnboarding(val === 'true');
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(true));
  }, []);

  const markOnboardingComplete = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setHasSeenOnboarding(true);
  }, []);

  return { hasSeenOnboarding, isLoaded, markOnboardingComplete };
}
