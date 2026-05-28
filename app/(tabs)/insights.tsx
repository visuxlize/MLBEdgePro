import { FlatList, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppBackground } from '@/src/components/AppBackground';
import { LoadingState } from '@/src/components/LoadingState';
import { InsightCard } from '@/src/components/InsightCard';
import { useGames } from '@/src/hooks/useGames';

export default function InsightsScreen() {
  const { data: games, isLoading } = useGames();

  if (isLoading) return <LoadingState message="Building edge report..." />;

  if (!games || games.length === 0) {
    return (
      <AppBackground>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="baseball-outline" size={48} color="rgba(255,255,255,0.15)" style={{ marginBottom: 12 }} />
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>No games today</Text>
        </View>
      </AppBackground>
    );
  }

  const analyzableGames = games.filter(
    (g) => g.teams.home.probablePitcher && g.teams.away.probablePitcher,
  );

  return (
    <AppBackground>
      <FlatList
        data={analyzableGames}
        keyExtractor={(g) => g.gamePk.toString()}
        renderItem={({ item }) => <InsightCard game={item} />}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 18, paddingTop: 60, paddingBottom: 16 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 }}>
              TODAY'S TOP
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900' }}>Edge Report</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
              Ranked by edge score
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
      />
    </AppBackground>
  );
}
