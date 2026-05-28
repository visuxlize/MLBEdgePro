import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

interface EdgeScoreProps {
  score: number;
}

export function EdgeScore({ score }: EdgeScoreProps) {
  const isHigh = score >= 70;
  const color = score >= 70 ? '#50C882' : score >= 55 ? '#FF7828' : score >= 40 ? 'rgba(255,255,255,0.5)' : '#EB505A';

  if (isHigh) {
    return (
      <LinearGradient
        colors={['#FFA550', '#FF7828', '#C85014']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' }}
      >
        <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>{score}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }}>EDGE</Text>
      </LinearGradient>
    );
  }

  return (
    <View
      style={{
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
      }}
    >
      <Text style={{ color, fontSize: 22, fontWeight: '900' }}>{score}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }}>EDGE</Text>
    </View>
  );
}
