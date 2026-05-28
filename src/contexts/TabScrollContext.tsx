import { createContext, useContext, type ReactNode } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

interface TabScrollContextValue {
  scrollY: SharedValue<number>;
  prevScrollY: SharedValue<number>;
}

const TabScrollContext = createContext<TabScrollContextValue | null>(null);

export function TabScrollProvider({ children }: { children: ReactNode }) {
  const scrollY = useSharedValue(0);
  const prevScrollY = useSharedValue(0);
  return (
    <TabScrollContext.Provider value={{ scrollY, prevScrollY }}>
      {children}
    </TabScrollContext.Provider>
  );
}

export function useTabScroll(): TabScrollContextValue {
  const ctx = useContext(TabScrollContext);
  if (!ctx) throw new Error('useTabScroll must be inside TabScrollProvider');
  return ctx;
}
