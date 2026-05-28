import { memo } from 'react';
import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from './GlassCard';
import { TeamLogo } from './TeamLogo';
import { TEAM_DISPLAY_ABBR } from '@/src/utils/mlbImages';
import { useWeather } from '@/src/hooks/useWeather';
import type { Game } from '../api/mlb';

interface Props {
  game: Game;
  featured?: boolean;
}

// Convert wind degrees → 8-point compass
function windCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

const GameCard = memo(function GameCard({ game, featured = false }: Props) {
  const state = game.status.detailedState;
  const isLive = state === 'In Progress';
  const isFinal = state === 'Final' || state === 'Game Over';
  const showScore = isLive || isFinal;

  const gameTime = new Date(game.gameDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const awayAbbr = TEAM_DISPLAY_ABBR[game.teams.away.team.id] ?? game.teams.away.team.name.split(' ').pop()!;
  const homeAbbr = TEAM_DISPLAY_ABBR[game.teams.home.team.id] ?? game.teams.home.team.name.split(' ').pop()!;
  const awayPitcher = game.teams.away.probablePitcher?.fullName;
  const homePitcher = game.teams.home.probablePitcher?.fullName;

  const awayRuns = game.linescore?.teams?.away?.runs ?? 0;
  const homeRuns = game.linescore?.teams?.home?.runs ?? 0;
  const awayWins = showScore && awayRuns > homeRuns;
  const homeWins = showScore && homeRuns > awayRuns;

  const { data: weather } = useWeather(game.venue.id, game.venue.name);

  // Status label
  let statusRight: string;
  if (isLive) {
    const inning = game.linescore?.currentInningOrdinal ?? '';
    const half = game.linescore?.inningState ?? '';
    statusRight = `${half} ${inning}`.trim() || 'LIVE';
  } else if (isFinal) {
    statusRight = 'Final';
  } else {
    statusRight = gameTime;
  }

  // Wind arrow — points in direction wind is blowing TOWARD (windDeg is "from" convention)
  const windTowardDeg = weather ? (weather.windDeg + 180) % 360 : 0;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/game/${game.gamePk}`)}
      activeOpacity={0.75}
      style={{ marginBottom: 12 }}
    >
      <GlassCard
        cornerRadius={22}
        style={[
          { padding: 0, overflow: 'hidden' },
          featured && { borderColor: 'rgba(255,120,40,0.35)' },
          isLive && { borderColor: 'rgba(235,80,90,0.30)' },
          isFinal && { borderColor: 'rgba(80,200,130,0.15)' },
        ]}
      >
        {/* ── Header bar: venue left, status/time right ── */}
        <LinearGradient
          colors={
            isLive
              ? ['rgba(235,80,90,0.18)', 'rgba(235,80,90,0.04)']
              : featured
              ? ['rgba(255,120,40,0.18)', 'rgba(255,120,40,0.04)']
              : ['rgba(255,255,255,0.05)', 'transparent']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.05)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, marginRight: 8 }}>
            {isLive ? (
              <>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EB505A' }} />
                <Text style={{ color: '#EB505A', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }}>LIVE</Text>
              </>
            ) : featured ? (
              <>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF7828' }} />
                <Text style={{ color: '#FF7828', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }}>YOUR TEAM</Text>
              </>
            ) : (
              <>
                <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.28)" />
                <Text
                  style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '500' }}
                  numberOfLines={1}
                >
                  {game.venue.name}
                </Text>
              </>
            )}
          </View>

          <Text
            style={{
              color: isLive ? '#EB505A' : isFinal ? '#50C882' : 'rgba(255,255,255,0.55)',
              fontSize: 13,
              fontWeight: '700',
            }}
          >
            {statusRight}
          </Text>
        </LinearGradient>

        {/* ── Teams ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: weather ? 10 : 14 }}>
          {/* Away */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <TeamLogo teamId={game.teams.away.team.id} teamName={game.teams.away.team.name} size={44} />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text
                style={{
                  color: showScore ? (awayWins ? '#FFFFFF' : 'rgba(255,255,255,0.38)') : 'rgba(255,255,255,0.75)',
                  fontSize: 21,
                  fontWeight: '900',
                  letterSpacing: -0.3,
                }}
              >
                {awayAbbr}
              </Text>
              {!showScore && awayPitcher && (
                <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                  {awayPitcher}
                </Text>
              )}
            </View>
            {showScore ? (
              <Text
                style={{
                  color: awayWins ? '#FFFFFF' : 'rgba(255,255,255,0.30)',
                  fontSize: 28,
                  fontWeight: '900',
                  minWidth: 36,
                  textAlign: 'right',
                }}
              >
                {awayRuns}
              </Text>
            ) : (
              <Text style={{ color: 'rgba(255,255,255,0.14)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
                AWAY
              </Text>
            )}
          </View>

          {/* @ divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' }} />
            <Text style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, fontWeight: '700' }}>@</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' }} />
          </View>

          {/* Home */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TeamLogo teamId={game.teams.home.team.id} teamName={game.teams.home.team.name} size={44} />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text
                style={{
                  color: showScore ? (homeWins ? '#FFFFFF' : 'rgba(255,255,255,0.38)') : '#FFFFFF',
                  fontSize: 21,
                  fontWeight: '900',
                  letterSpacing: -0.3,
                }}
              >
                {homeAbbr}
              </Text>
              {!showScore && homePitcher && (
                <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                  {homePitcher}
                </Text>
              )}
            </View>
            {showScore ? (
              <Text
                style={{
                  color: homeWins ? '#FFFFFF' : 'rgba(255,255,255,0.30)',
                  fontSize: 28,
                  fontWeight: '900',
                  minWidth: 36,
                  textAlign: 'right',
                }}
              >
                {homeRuns}
              </Text>
            ) : (
              <Text style={{ color: 'rgba(255,255,255,0.14)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
                HOME
              </Text>
            )}
          </View>
        </View>

        {/* ── Weather strip ── */}
        {weather && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.05)',
              gap: 6,
            }}
          >
            {/* Weather icon + temp */}
            <Ionicons name={weather.icon as any} size={13} color="rgba(255,255,255,0.45)" />
            <Text style={{ color: 'rgba(255,255,255,0.50)', fontSize: 12, fontWeight: '700' }}>
              {weather.temp}°F
            </Text>

            {/* Separator */}
            <View style={{ width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.10)', marginHorizontal: 2 }} />

            {/* Wind: two arrows + speed + cardinal */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              {/* Arrow pair indicating wind direction */}
              <View style={{ transform: [{ rotate: `${windTowardDeg}deg` }] }}>
                <Ionicons name="arrow-up" size={11} color="rgba(255,200,80,0.65)" />
              </View>
              <View style={{ transform: [{ rotate: `${windTowardDeg}deg` }] }}>
                <Ionicons name="arrow-up" size={9} color="rgba(255,200,80,0.35)" />
              </View>
              <Text style={{ color: 'rgba(255,200,80,0.65)', fontSize: 11, fontWeight: '700', marginLeft: 2 }}>
                {weather.windSpeed} mph {windCardinal(weather.windDeg)}
              </Text>
            </View>

            <View style={{ flex: 1 }} />

            {/* Tap hint */}
            <Ionicons name="chevron-forward" size={12} color="rgba(255,120,40,0.45)" />
          </View>
        )}

        {/* Footer for featured/live when no weather yet */}
        {!weather && (featured || isLive) && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.05)',
            }}
          >
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.22)" style={{ marginRight: 5 }} />
            <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 11, flex: 1 }}>{game.venue.name}</Text>
            <Ionicons name="arrow-forward" size={13} color="rgba(255,120,40,0.5)" />
          </View>
        )}
      </GlassCard>
    </TouchableOpacity>
  );
});

export default GameCard;
