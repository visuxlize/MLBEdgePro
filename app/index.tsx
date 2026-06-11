import { Redirect } from 'expo-router';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { useOnboardingState } from '@/src/hooks/useOnboardingState';

export default function Index() {
  const { isLoaded: authLoaded, isSignedIn } = useClerkAuth();
  const { hasSeenOnboarding, isLoaded: onboardingLoaded } = useOnboardingState();

  if (!authLoaded || !onboardingLoaded) return null;

  if (!hasSeenOnboarding) return <Redirect href={'/onboarding' as any} />;
  if (!isSignedIn) return <Redirect href={'/auth/login' as any} />;
  return <Redirect href="/(tabs)/games" />;
}
