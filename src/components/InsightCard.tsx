import { memo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from './GlassCard';
import type { BatterStats, Game, PitcherStats } from '../api/mlb';
import { fetchPitcherStats } from '../api/mlb';
import { calculateBatterEdge, type EdgeScore } from '../utils/edgeScore';

const LEAGUE_AVG_BATTER: BatterStats = {
  avg: '0.248',
  homeRuns: 22,
  rbi: 72,
  strikeOuts: 135,
  baseOnBalls: 55,
  ops: '0.720',
};

interface Props {
  game: Game;
}

function combineEdge(homeEdge: EdgeScore, awayEdge: EdgeScore): EdgeScore {
  const score = Math.round((homeEdge.score + awayEdge.score) / 2);
  const label = score >= 70 ? 'Strong Edge' : score >= 55 ? 'Slight Edge' : score >= 40 ? 'Neutral' : 'Avoid';
  const color = score >= 70 ? '#50C882' : score >= 55 ? '#FF7828' : score >= 40 ? 'rgba(255,255,255,0.5)' : '#EB505A';
  return { score, label, color, factors: [...homeEdge.factors, ...awayEdge.factors].slice(0, 3) };
}

export const InsightCard = memo(function InsightCard({ game }: Props) {
  const awayPitcherId = game.teams.away.probablePitcher?.id;
  const homePitcherId = game.teams.home.probablePitcher?.id;

  const pitcherQueries = useQueries({
    queries: [
      {
        queryKey: ['pitcher', awayPitcherId, 'stats'],
        queryFn: () => fetchPitcherStats(awayPitcherId!),
        enabled: !!awayPitcherId,
      },
      {
        queryKey: ['pitcher', homePitcherId, 'stats'],
        queryFn: () => fetchPitcherStats(homePitcherId!),
        enabled: !!homePitcherId,
      },
    ],
  });

  const isLoading = pitcherQueries.some((q) => q.isLoading);

  if (isLoading) {
    return (
      <GlassCard style={{ padding: 16, marginBottom: 12, alignItems: 'center' }}>
        <ActivityIndicator color="#FF7828" />
      </GlassCard>
    );
  }

  const awayStats = pitcherQueries[0].data as PitcherStats | undefined;
  const homeStats = pitcherQueries[1].data as PitcherStats | undefined;

  if (!awayStats || !homeStats) return null;

  const homeEdge = calculateBatterEdge(LEAGUE_AVG_BATTER, awayStats);
  const awayEdge = calculateBatterEdge(LEAGUE_AVG_BATTER, homeStats);
  const edge = combineEdge(homeEdge, awayEdge);

  const isHighEdge = edge.score >= 70;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/game/${game.gamePk}`)}
      activeOpacity={0.75}
      style={{ marginBottom: 12 }}
    >
      <GlassCard style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
              {game.teams.away.team.name} @ {game.teams.home.team.name}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 3 }}>
              {game.teams.away.probablePitcher?.fullName} vs{' '}
              {game.teams.home.probablePitcher?.fullName}
            </Text>
          </View>

          {/* Edge Score Badge */}
          {isHighEdge ? (
            <LinearGradient
              colors={['#FFA550', '#FF7828', '#C85014']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
                alignItems: 'center',
                minWidth: 52,
                shadowColor: '#FF7828',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.45,
                shadowRadius: 8,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }}>{edge.score}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 1 }}>
                EDGE
              </Text>
            </LinearGradient>
          ) : (
            <View
              style={{
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
                alignItems: 'center',
                minWidth: 52,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)',
              }}
            >
              <Text style={{ color: edge.color, fontSize: 16, fontWeight: '900' }}>{edge.score}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 1 }}>
                EDGE
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 12, marginBottom: 8 }} />

        <Text style={{ color: edge.color, fontSize: 13, fontWeight: '700' }}>{edge.label}</Text>
      </GlassCard>
    </TouchableOpacity>
  );
});
