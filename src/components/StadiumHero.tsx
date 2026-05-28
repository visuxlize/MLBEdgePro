import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { getStadiumImageUrl } from '@/src/utils/mlbImages';

interface StadiumHeroProps {
  venueId: number;
  height?: number;
}

export function StadiumHero({ venueId, height = 200 }: StadiumHeroProps) {
  const uri = getStadiumImageUrl(venueId);

  return (
    <View style={{ height, overflow: 'hidden' }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={300}
        />
      ) : (
        <LinearGradient colors={['#1a1f2e', '#0A0E14']} style={StyleSheet.absoluteFill} />
      )}

      {/* Gradient overlay — darkens top and bottom edges */}
      <LinearGradient
        colors={['rgba(10,14,20,0.85)', 'transparent', 'rgba(10,14,20,0.92)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </View>
  );
}
