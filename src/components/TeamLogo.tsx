import { useState } from 'react';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { TEAM_COLORS } from '@/src/utils/mlbImages';

interface TeamLogoProps {
  teamId: number;
  teamName: string;
  size?: number;
}

export function TeamLogo({ teamId, teamName, size = 40 }: TeamLogoProps) {
  const color = TEAM_COLORS[teamId] ?? '#1a1f2e';
  const [imgError, setImgError] = useState(false);
  const initials = teamName
    .split(' ')
    .slice(-1)[0]
    .substring(0, 3)
    .toUpperCase();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        overflow: 'hidden',
      }}
    >
      {imgError ? (
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: size * 0.3,
            fontWeight: '900',
            letterSpacing: -0.5,
          }}
        >
          {initials}
        </Text>
      ) : (
        <Image
          source={{ uri: `https://www.mlbstatic.com/team-logos/team-cap-on-dark/${teamId}.svg` }}
          style={{ width: size * 0.7, height: size * 0.7 }}
          contentFit="contain"
          onError={() => setImgError(true)}
          cachePolicy="memory-disk"
        />
      )}
    </View>
  );
}

// Larger team emblem for hero sections
export function TeamEmblem({ teamId, teamName, size = 60 }: TeamLogoProps) {
  const color = TEAM_COLORS[teamId] ?? '#1a1f2e';
  const [imgError, setImgError] = useState(false);
  const abbr = teamName.split(' ').pop()?.substring(0, 3).toUpperCase() ?? '???';

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        overflow: 'hidden',
      }}
    >
      {imgError ? (
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: size * 0.28,
            fontWeight: '900',
            letterSpacing: -0.5,
          }}
        >
          {abbr}
        </Text>
      ) : (
        <Image
          source={{ uri: `https://www.mlbstatic.com/team-logos/team-cap-on-dark/${teamId}.svg` }}
          style={{ width: size * 0.72, height: size * 0.72 }}
          contentFit="contain"
          onError={() => setImgError(true)}
          cachePolicy="memory-disk"
        />
      )}
    </View>
  );
}
