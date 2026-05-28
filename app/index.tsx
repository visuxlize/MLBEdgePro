import { Redirect } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';

export default function Index() {
  const { isAuthenticated, isLoaded, hasSeenOnboarding } = useAuth();

  // Wait for both auth and onboarding state to resolve
  if (!isLoaded) return null;

  if (!hasSeenOnboarding) return <Redirect href={'/onboarding' as any} />;
  if (!isAuthenticated) return <Redirect href={'/auth/login' as any} />;
  return <Redirect href="/(tabs)/games" />;
}
