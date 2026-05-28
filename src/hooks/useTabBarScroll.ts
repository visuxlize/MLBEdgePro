import { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useTabScroll } from '@/src/contexts/TabScrollContext';

/**
 * Returns an onScroll handler + scrollEventThrottle that any tab screen
 * can attach to its FlatList / ScrollView / Animated.ScrollView.
 * This drives the liquid glass tab bar hide/show animation.
 */
export function useTabBarScroll() {
  const { scrollY } = useTabScroll();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll(event) {
      scrollY.value = event.contentOffset.y;
    },
  });

  return { scrollHandler, scrollEventThrottle: 16 };
}
