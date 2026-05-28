import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  cornerRadius?: number;
  /** Blur intensity 0–100 (iOS BlurView fallback only) */
  intensity?: number;
}

const hasNativeGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable();

/**
 * Glass card with three rendering tiers:
 *   iOS 26+ (liquid glass available) → native GlassView
 *   iOS 25 and below                 → BlurView + gradient shimmer
 *   Android                          → semi-transparent dark gradient
 */
export function GlassCard({ children, style, cornerRadius = 20, intensity = 22 }: GlassCardProps) {
  if (hasNativeGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        style={[
          styles.cardNativeGlass,
          { borderRadius: cornerRadius },
          style,
        ]}
      >
        {/* Inner border */}
        <View
          style={[styles.innerBorder, { borderRadius: cornerRadius }]}
          pointerEvents="none"
        />
        {children}
      </GlassView>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint="dark"
        style={[styles.cardIOS, { borderRadius: cornerRadius }, style]}
      >
        {/* Gradient shimmer overlay */}
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: cornerRadius }]}
          pointerEvents="none"
        />
        {/* Inner border */}
        <View style={[styles.innerBorder, { borderRadius: cornerRadius }]} pointerEvents="none" />
        {children}
      </BlurView>
    );
  }

  // Android fallback
  return (
    <LinearGradient
      colors={['rgba(255,255,255,0.06)', 'rgba(0,0,0,0)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.cardAndroid, { borderRadius: cornerRadius }, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  cardNativeGlass: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  cardIOS: {
    backgroundColor: 'rgba(14,18,28,0.60)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
  },
  innerBorder: {
    position: 'absolute',
    inset: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardAndroid: {
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    elevation: 10,
  },
});
