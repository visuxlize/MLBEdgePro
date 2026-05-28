import { useTabScroll } from "@/src/contexts/TabScrollContext";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  GlassContainer,
  GlassView,
  isGlassEffectAPIAvailable,
} from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { useEffect } from "react";
import { Dimensions, Platform, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_MARGIN_H = 20;

const SPRING_INDICATOR = { damping: 22, stiffness: 280, mass: 0.9 };
const SPRING_HIDE = { damping: 20, stiffness: 180, mass: 1.0 };

const ICONS: Record<string, { focused: string; unfocused: string }> = {
  games: { focused: "baseball", unfocused: "baseball-outline" },
  scores: { focused: "trophy", unfocused: "trophy-outline" },
  matchups: { focused: "stats-chart", unfocused: "stats-chart-outline" },
  props: { focused: "layers", unfocused: "layers-outline" },
  "settings-tab": {
    focused: "person-circle",
    unfocused: "person-circle-outline",
  },
};

const LABELS: Record<string, string> = {
  games: "Today",
  scores: "Scores",
  matchups: "Analysis",
  props: "Builder",
  "settings-tab": "Settings",
};

const hasNativeGlass = Platform.OS === "ios" && isGlassEffectAPIAvailable();

// ─── Glass bar background ─────────────────────────────────────────────────────

function GlassBarBackground({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const baseStyle = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width,
    height,
    borderRadius: 32,
    overflow: "hidden" as const,
  };

  if (hasNativeGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        style={baseStyle}
      />
    );
  }

  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={78} tint="dark" style={baseStyle}>
        <LinearGradient
          colors={["rgba(255,255,255,0.09)", "rgba(255,255,255,0.02)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: "absolute", inset: 0 }}
          pointerEvents="none"
        />
      </BlurView>
    );
  }

  return (
    <View style={[baseStyle, { backgroundColor: "rgba(10,14,20,0.93)" }]}>
      <LinearGradient
        colors={["rgba(255,255,255,0.07)", "rgba(0,0,0,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
        pointerEvents="none"
      />
    </View>
  );
}

// ─── Active dot indicator ─────────────────────────────────────────────────────
// A small glowing dot that slides under the active icon — integrates with the
// glass without fighting it.

function ActiveDotIndicator({
  x,
  tabWidth,
}: {
  x: SharedValue<number>;
  tabWidth: number;
}) {
  const DOT_W = 20;

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value + tabWidth / 2 - DOT_W / 2 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          bottom: 8,
          left: 0,
          width: DOT_W,
          height: 3,
          borderRadius: 2,
        },
        style,
      ]}
    >
      <View
        style={{
          flex: 1,
          borderRadius: 2,
          backgroundColor: "#FF7828",
          shadowColor: "#FF7828",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 6,
        }}
      />
    </Animated.View>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  route,
  isFocused,
  tabWidth,
  navigation,
  descriptors,
}: {
  route: any;
  isFocused: boolean;
  tabWidth: number;
  navigation: any;
  descriptors: any;
}) {
  const scale = useSharedValue(1);
  const icons = ICONS[route.name] ?? {
    focused: "ellipse",
    unfocused: "ellipse-outline",
  };
  const label = LABELS[route.name] ?? route.name;

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(isFocused ? 1 : 0.4, { duration: 180 }),
  }));

  const onPress = () => {
    scale.value = withSpring(0.82, { damping: 10, stiffness: 500 }, () => {
      scale.value = withSpring(1.0, { damping: 14, stiffness: 300 });
    });
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate({ name: route.name, merge: true });
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() =>
        navigation.emit({ type: "tabLongPress", target: route.key })
      }
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={
        descriptors[route.key]?.options.tabBarAccessibilityLabel
      }
      style={{
        width: tabWidth,
        height: TAB_BAR_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 6,
      }}
    >
      <Animated.View
        style={[{ alignItems: "center", gap: 3 }, scaleStyle, iconOpacity]}
      >
        <Ionicons
          name={(isFocused ? icons.focused : icons.unfocused) as any}
          size={21}
          color={isFocused ? "#FFFFFF" : "rgba(255,255,255,0.55)"}
        />
        <Text
          style={{
            color: isFocused ? "#FFFFFF" : "rgba(255,255,255,0.38)",
            fontSize: 10,
            fontWeight: isFocused ? "700" : "500",
            letterSpacing: 0.1,
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Main tab bar ─────────────────────────────────────────────────────────────

export function LiquidGlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { scrollY } = useTabScroll();

  const screenWidth = Dimensions.get("window").width;
  const barWidth = screenWidth - TAB_BAR_MARGIN_H * 2;

  const HIDDEN_ROUTES = new Set(['insights', 'weather']);
  const visibleRoutes = state.routes.filter(
    (r: any) => !HIDDEN_ROUTES.has(r.name),
  );
  const tabWidth = barWidth / visibleRoutes.length;

  const visibleIndex = Math.max(
    0,
    visibleRoutes.findIndex(
      (r: any) => r.key === state.routes[state.index]?.key,
    ),
  );

  const indicatorX = useSharedValue(visibleIndex * tabWidth);
  const barOffsetY = useSharedValue(0);
  const prevScrollY = useSharedValue(0);

  useEffect(() => {
    indicatorX.value = withSpring(visibleIndex * tabWidth, SPRING_INDICATOR);
  }, [visibleIndex, tabWidth]);

  useAnimatedReaction(
    () => scrollY.value,
    (current) => {
      const delta = current - prevScrollY.value;
      prevScrollY.value = current;

      if (current < 60) {
        barOffsetY.value = withSpring(0, SPRING_HIDE);
      } else if (delta > 4) {
        barOffsetY.value = withSpring(TAB_BAR_HEIGHT + 40, SPRING_HIDE);
      } else if (delta < -4) {
        barOffsetY.value = withSpring(0, SPRING_HIDE);
      }
    },
  );

  const barAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: barOffsetY.value }],
    opacity: withTiming(barOffsetY.value > 20 ? 0 : 1, { duration: 140 }),
  }));

  const BOTTOM_POS = insets.bottom > 0 ? insets.bottom + 6 : 18;

  const TabButtons = (
    <View style={{ flexDirection: "row", height: TAB_BAR_HEIGHT }}>
      {visibleRoutes.map((route: any) => (
        <TabButton
          key={route.key}
          route={route}
          isFocused={route.key === state.routes[state.index]?.key}
          tabWidth={tabWidth}
          navigation={navigation}
          descriptors={descriptors}
        />
      ))}
    </View>
  );

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: BOTTOM_POS,
          left: TAB_BAR_MARGIN_H,
          right: TAB_BAR_MARGIN_H,
          height: TAB_BAR_HEIGHT,
          zIndex: 100,
        },
        barAnimStyle,
      ]}
    >
      {hasNativeGlass ? (
        <GlassContainer spacing={0} style={{ flex: 1 }}>
          <GlassBarBackground width={barWidth} height={TAB_BAR_HEIGHT} />
          {/* Border ring */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 32,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.13)",
            }}
          />
          {TabButtons}
          <ActiveDotIndicator x={indicatorX} tabWidth={tabWidth} />
        </GlassContainer>
      ) : (
        <View style={{ flex: 1 }}>
          <GlassBarBackground width={barWidth} height={TAB_BAR_HEIGHT} />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 32,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.13)",
            }}
          />
          {TabButtons}
          <ActiveDotIndicator x={indicatorX} tabWidth={tabWidth} />
        </View>
      )}
    </Animated.View>
  );
}

// ─── Helper export: total bottom space tabs consume ───────────────────────────
// Use this for contentContainerStyle paddingBottom on scrollable screens.
export function useTabBarBottomPadding() {
  const insets = useSafeAreaInsets();
  const BOTTOM_POS = insets.bottom > 0 ? insets.bottom + 6 : 18;
  return BOTTOM_POS + TAB_BAR_HEIGHT + 16;
}
