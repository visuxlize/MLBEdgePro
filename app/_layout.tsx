import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useAuth } from '@/src/hooks/useAuth';
import { SavedSlipsProvider } from '@/src/contexts/SavedSlipsContext';

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

// Shared screen options for legal pages (push from right, dark bg)
const legalScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  contentStyle: { backgroundColor: '#0A0E14' },
};

function RootNavigator() {
  const { isLoaded, isAuthenticated } = useAuth();

  if (!isLoaded) return null;

  if (!isAuthenticated) {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0E14' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="auth/signup" options={{ headerShown: false, animation: 'slide_from_right' }} />
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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="game/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="player/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="settings"
        options={{ headerShown: false, animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="bet-history" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="terms" options={legalScreenOptions} />
      <Stack.Screen name="privacy-policy" options={legalScreenOptions} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SavedSlipsProvider>
        <RootNavigator />
      </SavedSlipsProvider>
    </QueryClientProvider>
  );
}
