import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

interface AppBackgroundProps {
  children: React.ReactNode;
}

// Layered radial gradient backdrop:
// bgBase (#0A0E14) + warm amber glow top-right + brownish warm glow bottom-center
export function AppBackground({ children }: AppBackgroundProps) {
  return (
    <View style={styles.root}>
      {/* Base background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0A0E14' }]} />
      {/* Warm amber glow — top right */}
      <LinearGradient
        colors={['rgba(255,120,40,0.13)', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.4, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Deep warm glow — bottom center */}
      <LinearGradient
        colors={['transparent', 'rgba(40,16,8,0.65)']}
        start={{ x: 0.5, y: 0.45 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Very subtle mid-screen cool tint for depth */}
      <LinearGradient
        colors={['transparent', 'rgba(8,12,26,0.25)', 'transparent']}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 1, y: 0.7 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
