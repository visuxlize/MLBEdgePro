import { ClerkProvider, useAuth as useClerkAuth, useUser } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SavedSlipsProvider } from '@/src/contexts/SavedSlipsContext';
import { useOnboardingState } from '@/src/hooks/useOnboardingState';
import { configurePurchases, identifyUser, logOutPurchases } from '@/src/services/purchases';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
  },
});

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

// Configure RevenueCat once at startup (no-op if keys aren't set yet)
configurePurchases();

// ── Secure token cache for Clerk sessions ─────────────────────────────────────
const tokenCache = {
  async getToken(key: string) {
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  async saveToken(key: string, value: string) {
    try { await SecureStore.setItemAsync(key, value); } catch {}
  },
  async clearToken(key: string) {
    try { await SecureStore.deleteItemAsync(key); } catch {}
  },
};

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

const legalScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  contentStyle: { backgroundColor: '#0A0E14' },
};

// ── Inner component — has access to Clerk hooks ───────────────────────────────
function RootNavigator() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { user } = useUser();
  const { hasSeenOnboarding, isLoaded: onboardingLoaded } = useOnboardingState();

  // When user signs in → identify them to RevenueCat so purchases are linked
  useEffect(() => {
    if (isSignedIn && user?.id) {
      identifyUser(user.id);
    }
    if (!isSignedIn) {
      logOutPurchases();
    }
  }, [isSignedIn, user?.id]);

  if (!isLoaded || !onboardingLoaded) return null;

  if (!isSignedIn) {
    return (
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0E14' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth/login" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth/signup" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="terms" options={legalScreenOptions} />
        <Stack.Screen name="privacy-policy" options={legalScreenOptions} />
      </Stack>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0E14' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="game/[id]" />
      <Stack.Screen name="player/[id]" />
      <Stack.Screen name="settings"    options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="upgrade"     options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="modal"       options={{ presentation: 'modal' }} />
      <Stack.Screen name="bet-history" />
      <Stack.Screen name="terms"          options={legalScreenOptions} />
      <Stack.Screen name="privacy-policy" options={legalScreenOptions} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => { if (error) throw error; }, [error]);
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);

  if (!loaded) return null;

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <SavedSlipsProvider>
          <RootNavigator />
        </SavedSlipsProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
