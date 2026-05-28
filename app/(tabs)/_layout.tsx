import { Tabs } from 'expo-router';
import { TabScrollProvider } from '@/src/contexts/TabScrollContext';
import { LiquidGlassTabBar } from '@/src/components/LiquidGlassTabBar';

export default function TabLayout() {
  return (
    <TabScrollProvider>
      <Tabs
        tabBar={(props) => <LiquidGlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="games" />
        <Tabs.Screen name="scores" />
        <Tabs.Screen name="matchups" />
        <Tabs.Screen name="props" />
        <Tabs.Screen name="settings-tab" />
        {/* Content merged into Analysis — keep in navigator so routes don't 404 */}
        <Tabs.Screen name="insights" options={{ href: null }} />
        <Tabs.Screen name="weather" options={{ href: null }} />
      </Tabs>
    </TabScrollProvider>
  );
}
