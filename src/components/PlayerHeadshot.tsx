import { useState } from 'react';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';

interface PlayerHeadshotProps {
  playerId: number;
  playerName: string;
  size?: number;
}

export function PlayerHeadshot({ playerId, playerName, size = 48 }: PlayerHeadshotProps) {
  const [imgError, setImgError] = useState(false);
  const initials = playerName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#1a1f2e',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {imgError ? (
        <Text
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: size * 0.32,
            fontWeight: '700',
            letterSpacing: -0.5,
          }}
        >
          {initials}
        </Text>
      ) : (
        <Image
          source={{
            uri: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`,
          }}
          style={{ width: size, height: size }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
          onError={() => setImgError(true)}
        />
      )}
    </View>
  );
}
