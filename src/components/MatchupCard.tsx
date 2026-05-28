import { memo } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard } from './GlassCard';
import { StatBadge } from './StatBadge';
import { TeamLogo } from './TeamLogo';
import { PlayerHeadshot } from './PlayerHeadshot';
import { useMatchup } from '../hooks/useMatchup';
import type { Game } from '../api/mlb';

interface Props {
  game: Game;
}

function eraColor(era: string): string {
  const v = parseFloat(era);
  return v < 3.0 ? '#EB505A' : v < 4.0 ? '#FF7828' : '#50C882';
}

function whipColor(whip: string): string {
  const v = parseFloat(whip);
  return v < 1.1 ? '#EB505A' : v < 1.3 ? '#FF7828' : '#50C882';
}

const MatchupCard = memo(function MatchupCard({ game }: Props) {
  const awayPitcherId = game.teams.away.probablePitcher?.id ?? 0;
  const homePitcherId = game.teams.home.probablePitcher?.id ?? 0;

  const { pitcher: awayStats, isLoading } = useMatchup(awayPitcherId, homePitcherId);

  const awayPitcher = game.teams.away.probablePitcher;
  const homePitcher = game.teams.home.probablePitcher;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/game/${game.gamePk}`)}
      activeOpacity={0.75}
      style={{ marginBottom: 12 }}
    >
      <GlassCard style={{ padding: 16 }}>
        {/* Team header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TeamLogo teamId={game.teams.away.team.id} teamName={game.teams.away.team.name} size={28} />
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', marginLeft: 8 }}>
              {game.teams.away.team.name}
            </Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '700' }}>@</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginRight: 8 }}>
              {game.teams.home.team.name}
            </Text>
            <TeamLogo teamId={game.teams.home.team.id} teamName={game.teams.home.team.name} size={28} />
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 14 }} />

        {/* Pitchers row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Away pitcher */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              {awayPitcher && (
                <PlayerHeadshot
                  playerId={awayPitcher.id}
                  playerName={awayPitcher.fullName}
                  size={42}
                />
              )}
              <View style={{ marginLeft: 10 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                  {awayPitcher?.fullName ?? 'TBD'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 }}>
                  {game.teams.away.team.name}
                </Text>
              </View>
            </View>
            {isLoading ? (
              <ActivityIndicator color="#FF7828" size="small" style={{ alignSelf: 'flex-start' }} />
            ) : awayStats ? (
              <View style={{ flexDirection: 'row' }}>
                <StatBadge label="ERA" value={awayStats.era} color={eraColor(awayStats.era)} />
                <StatBadge label="WHIP" value={awayStats.whip} color={whipColor(awayStats.whip)} />
                <StatBadge label="W-L" value={`${awayStats.wins}-${awayStats.losses}`} />
              </View>
            ) : null}
          </View>

          <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.06)', alignSelf: 'stretch', marginHorizontal: 14 }} />

          {/* Home pitcher */}
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 8 }}>
              {homePitcher && (
                <PlayerHeadshot
                  playerId={homePitcher.id}
                  playerName={homePitcher.fullName}
                  size={42}
                />
              )}
              <View style={{ marginRight: 10, alignItems: 'flex-end' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', textAlign: 'right' }}>
                  {homePitcher?.fullName ?? 'TBD'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 }}>
                  {game.teams.home.team.name}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
});

export default MatchupCard;
