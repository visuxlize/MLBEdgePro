import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/src/components/GlassCard';
import { LoadingState } from '@/src/components/LoadingState';
import { StatBadge } from '@/src/components/StatBadge';
import { TeamLogo } from '@/src/components/TeamLogo';
import { PlayerHeadshot } from '@/src/components/PlayerHeadshot';
import { WinPredictionCard } from '@/src/components/WinPredictionCard';
import { BatterPropsList } from '@/src/components/BatterPropsList';
import { useMatchup } from '@/src/hooks/useMatchup';
import { useWeather } from '@/src/hooks/useWeather';
import { fetchGameDetails, fetchGameScheduleByPk, type BatterStats } from '@/src/api/mlb';
import { queryKeys } from '@/src/constants/queryKeys';
import { buildGamePrediction } from '@/src/utils/predictions';
import { calculateBatterEdge } from '@/src/utils/edgeScore';
import { getWeatherPenalty, getWindDirection } from '@/src/utils/weatherimpact';
import { getStadiumInfo } from '@/src/constants/stadiums';
import { getStadiumImageUrl, TEAM_DISPLAY_ABBR } from '@/src/utils/mlbImages';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 320;

const LEAGUE_AVG_BATTER: BatterStats = {
  avg: '0.248', homeRuns: 22, rbi: 72, strikeOuts: 135, baseOnBalls: 55, ops: '0.720',
};

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ title, icon }: { title: string; icon?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
      {icon && <Ionicons name={icon as any} size={13} color="rgba(255,255,255,0.35)" style={{ marginRight: 6 }} />}
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>
        {title}
      </Text>
    </View>
  );
}

// ─── Weather card ─────────────────────────────────────────────────────────────

function WeatherRow({ venueId, venueName }: { venueId: number; venueName: string }) {
  const stadiumInfo = getStadiumInfo(venueId, venueName);
  const { data: weather } = useWeather(venueId, venueName);

  const weatherPenalty = weather ? getWeatherPenalty(weather) : 0;
  const impactColor = weatherPenalty <= 4 ? '#50C882' : weatherPenalty <= 12 ? '#FF7828' : '#EB505A';
  const impactLabel = weatherPenalty <= 4 ? 'Good' : weatherPenalty <= 12 ? 'Caution' : 'Avoid';

  if (stadiumInfo?.indoor) {
    return (
      <GlassCard style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="home-outline" size={15} color="rgba(255,255,255,0.35)" />
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Fixed-dome — weather not a factor</Text>
      </GlassCard>
    );
  }

  if (!weather) {
    return (
      <GlassCard style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="cloud-offline-outline" size={15} color="rgba(255,255,255,0.35)" />
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          {stadiumInfo ? 'Fetching weather…' : 'Weather unavailable for this venue'}
        </Text>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={{ padding: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Left: conditions */}
        <View style={{ gap: 8, flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name={weather.icon as any} size={16} color="#FF7828" />
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{weather.temp}°F</Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textTransform: 'capitalize' }}>
              {weather.description}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="flag-outline" size={13} color="rgba(255,255,255,0.4)" />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              {weather.windSpeed} mph {getWindDirection(weather.windDeg)}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>·</Text>
            <Ionicons name="water-outline" size={13} color="rgba(255,255,255,0.4)" />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{weather.humidity}%</Text>
          </View>
        </View>

        {/* Right: impact badge */}
        <View style={{
          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
          backgroundColor: `${impactColor}22`, borderWidth: 1, borderColor: `${impactColor}44`,
          marginLeft: 12,
        }}>
          <Text style={{ color: impactColor, fontSize: 13, fontWeight: '900', textAlign: 'center' }}>{impactLabel}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Fetch linescore detail (innings-by-innings box score)
  useQuery({
    queryKey: queryKeys.games.detail(id ?? ''),
    queryFn: () => fetchGameDetails(Number(id)),
    enabled: !!id,
  });

  // Fetch the game directly by gamePk so this screen works for any date,
  // not just today's games (e.g. tapping from the Scores tab on a past date).
  const { data: game, isLoading: gamesLoading } = useQuery({
    queryKey: ['game-schedule', id],
    queryFn: () => fetchGameScheduleByPk(Number(id)),
    enabled: !!id,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000, // keep live scores refreshed
  });

  const awayPitcherId = game?.teams.away.probablePitcher?.id ?? 0;
  const homePitcherId = game?.teams.home.probablePitcher?.id ?? 0;

  const { pitcher: awayPitcherStats, isLoading: pitcherLoading } = useMatchup(awayPitcherId, homePitcherId);
  const { pitcher: homePitcherStats } = useMatchup(homePitcherId, awayPitcherId);

  if (gamesLoading) return <LoadingState message="Loading game details..." />;

  if (!game) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0E14', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="baseball-outline" size={44} color="rgba(255,255,255,0.12)" style={{ marginBottom: 12 }} />
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>Game not found</Text>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/scores' as any))} style={{ marginTop: 20 }} activeOpacity={0.7}>
          <Text style={{ color: '#FF7828', fontWeight: '700', fontSize: 15 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const awayTeam = game.teams.away.team;
  const homeTeam = game.teams.home.team;
  const awayPitcher = game.teams.away.probablePitcher;
  const homePitcher = game.teams.home.probablePitcher;

  const state = game.status.detailedState;
  const isLive = state === 'In Progress';
  const isFinal = state === 'Final' || state === 'Game Over';
  const showScore = isLive || isFinal;

  const gameTime = new Date(game.gameDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const stadiumImageUrl = getStadiumImageUrl(game.venue.id);

  const awayScore = game.linescore?.teams?.away?.runs;
  const homeScore = game.linescore?.teams?.home?.runs;
  const awayWins = showScore && (awayScore ?? 0) > (homeScore ?? 0);
  const homeWins = showScore && (homeScore ?? 0) > (awayScore ?? 0);

  const edge = awayPitcherStats ? calculateBatterEdge(LEAGUE_AVG_BATTER, awayPitcherStats) : null;
  const prediction = awayPitcherStats && homePitcherStats
    ? buildGamePrediction(homePitcherStats, awayPitcherStats, homeTeam.name, awayTeam.name, 0)
    : null;

  const eraColor = (era: string) => { const v = parseFloat(era); return v < 3.0 ? '#50C882' : v < 4.0 ? '#FF7828' : '#EB505A'; };
  const whipColor = (w: string) => { const v = parseFloat(w); return v < 1.1 ? '#50C882' : v < 1.3 ? '#FF7828' : '#EB505A'; };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0E14' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── STADIUM HERO ─────────────────────────────────────────── */}
        <View style={{ height: HERO_HEIGHT, width: SCREEN_WIDTH, overflow: 'hidden' }}>
          {stadiumImageUrl ? (
            <Image
              source={{ uri: stadiumImageUrl }}
              style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT }}
              contentFit="cover"
              transition={400}
            />
          ) : (
            <LinearGradient
              colors={['#1a1f2e', '#0A0E14']}
              style={{ flex: 1 }}
            />
          )}

          {/* Dark cinematic overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.40)', 'rgba(10,14,20,0.90)', '#0A0E14']}
            locations={[0, 0.4, 0.78, 1]}
            style={{ position: 'absolute', inset: 0 }}
          />

          {/* Floating nav bar */}
          <View style={{
            position: 'absolute', top: 54, left: 0, right: 0,
            paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/scores' as any))}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: 'rgba(0,0,0,0.50)', borderRadius: 22,
                paddingHorizontal: 14, paddingVertical: 9,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <Ionicons name="chevron-back" size={16} color="#FF7828" />
              <Text style={{ color: '#FF7828', fontSize: 14, fontWeight: '800' }}>Back</Text>
            </TouchableOpacity>

            {isLive ? (
              <View style={{
                backgroundColor: '#EB505A', borderRadius: 22,
                paddingHorizontal: 16, paddingVertical: 8,
                flexDirection: 'row', alignItems: 'center', gap: 6,
                shadowColor: '#EB505A', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.6, shadowRadius: 12,
              }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' }} />
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 }}>LIVE</Text>
              </View>
            ) : (
              <View style={{
                backgroundColor: 'rgba(0,0,0,0.50)', borderRadius: 22,
                paddingHorizontal: 14, paddingVertical: 8,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
              }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' }}>
                  {isFinal ? 'Final' : gameTime}
                </Text>
              </View>
            )}
          </View>

          {/* Teams matchup — bottom of hero */}
          <View style={{
            position: 'absolute', bottom: 20, left: 0, right: 0,
            paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {/* Away */}
            <View style={{ alignItems: 'center', flex: 1 }}>
              <TeamLogo teamId={awayTeam.id} teamName={awayTeam.name} size={56} />
              <Text style={{ color: showScore ? (awayWins ? '#FFFFFF' : 'rgba(255,255,255,0.45)') : '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginTop: 8 }}>
                {TEAM_DISPLAY_ABBR[awayTeam.id] ?? awayTeam.name.split(' ').pop()}
              </Text>
              {showScore && (
                <Text style={{ color: awayWins ? '#FFFFFF' : 'rgba(255,255,255,0.4)', fontSize: 36, fontWeight: '900', marginTop: 2 }}>
                  {awayScore}
                </Text>
              )}
            </View>

            {/* Centre */}
            <View style={{ alignItems: 'center', paddingHorizontal: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: showScore ? 18 : 20, fontWeight: '900' }}>
                {showScore ? '—' : '@'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600', marginTop: 4, textAlign: 'center', maxWidth: 90 }} numberOfLines={2}>
                {game.venue.name}
              </Text>
            </View>

            {/* Home */}
            <View style={{ alignItems: 'center', flex: 1 }}>
              <TeamLogo teamId={homeTeam.id} teamName={homeTeam.name} size={56} />
              <Text style={{ color: showScore ? (homeWins ? '#FFFFFF' : 'rgba(255,255,255,0.45)') : '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginTop: 8 }}>
                {TEAM_DISPLAY_ABBR[homeTeam.id] ?? homeTeam.name.split(' ').pop()}
              </Text>
              {showScore && (
                <Text style={{ color: homeWins ? '#FFFFFF' : 'rgba(255,255,255,0.4)', fontSize: 36, fontWeight: '900', marginTop: 2 }}>
                  {homeScore}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* ── CONTENT ──────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 18, paddingTop: 20, gap: 24 }}>

          {/* Weather — right under the teams */}
          <View>
            <SectionLabel title="WEATHER" icon="cloud-outline" />
            <WeatherRow venueId={game.venue.id} venueName={game.venue.name} />
          </View>

          {/* Starting Pitchers */}
          <View>
            <SectionLabel title="STARTING PITCHERS" icon="person-outline" />
            <GlassCard style={{ padding: 20 }}>
              {pitcherLoading ? (
                <LoadingState message="Loading pitcher stats..." />
              ) : (
                <View style={{ flexDirection: 'row' }}>
                  {/* Away pitcher */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                      {awayPitcher && (
                        <PlayerHeadshot playerId={awayPitcher.id} playerName={awayPitcher.fullName} size={48} />
                      )}
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }} numberOfLines={1}>
                          {awayPitcher?.fullName ?? 'TBD'}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>
                          {awayTeam.name}
                        </Text>
                      </View>
                    </View>
                    {awayPitcherStats && (
                      <View style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <StatBadge label="ERA" value={awayPitcherStats.era} color={eraColor(awayPitcherStats.era)} />
                          <StatBadge label="WHIP" value={awayPitcherStats.whip} color={whipColor(awayPitcherStats.whip)} />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <StatBadge label="W-L" value={`${awayPitcherStats.wins}-${awayPitcherStats.losses}`} />
                          <StatBadge label="K" value={awayPitcherStats.strikeOuts} color="#FF7828" />
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 16, alignSelf: 'stretch' }} />

                  {/* Home pitcher */}
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 14 }}>
                      {homePitcher && (
                        <PlayerHeadshot playerId={homePitcher.id} playerName={homePitcher.fullName} size={48} />
                      )}
                      <View style={{ marginRight: 10, flex: 1, alignItems: 'flex-end' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800', textAlign: 'right' }} numberOfLines={1}>
                          {homePitcher?.fullName ?? 'TBD'}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2, textAlign: 'right' }}>
                          {homeTeam.name}
                        </Text>
                      </View>
                    </View>
                    {homePitcherStats && (
                      <View style={{ gap: 6, alignItems: 'flex-end' }}>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <StatBadge label="ERA" value={homePitcherStats.era} color={eraColor(homePitcherStats.era)} />
                          <StatBadge label="WHIP" value={homePitcherStats.whip} color={whipColor(homePitcherStats.whip)} />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <StatBadge label="W-L" value={`${homePitcherStats.wins}-${homePitcherStats.losses}`} />
                          <StatBadge label="K" value={homePitcherStats.strikeOuts} color="#FF7828" />
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </GlassCard>
          </View>

          {/* Game Prediction */}
          {prediction && (
            <View>
              <SectionLabel title="GAME PREDICTION" icon="stats-chart-outline" />
              <WinPredictionCard
                prediction={prediction}
                homeTeamName={homeTeam.name}
                awayTeamName={awayTeam.name}
              />
            </View>
          )}

          {/* Edge Score */}
          {edge && (
            <View>
              <SectionLabel title="EDGE ANALYSIS" icon="flash-outline" />
              <GlassCard style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  {edge.score >= 70 ? (
                    <LinearGradient
                      colors={['#FFA550', '#FF7828', '#C85014']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={{ borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10, marginRight: 14 }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '900' }}>{edge.score}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={{ borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10, marginRight: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
                      <Text style={{ color: edge.color, fontSize: 28, fontWeight: '900' }}>{edge.score}</Text>
                    </View>
                  )}
                  <Text style={{ color: edge.color, fontSize: 18, fontWeight: '800' }}>{edge.label}</Text>
                </View>
                {edge.factors.length > 0 && (
                  <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10, gap: 8 }}>
                    {edge.factors.map((f, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', marginRight: 8, color: f.impact === 'positive' ? '#50C882' : '#EB505A' }}>
                          {f.impact === 'positive' ? '+' : '−'}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{f.label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </GlassCard>
            </View>
          )}

          {/* Batter Props */}
          {awayPitcherStats && homePitcherStats && (
            <View>
              <SectionLabel title="BATTER PROPS" icon="person-circle-outline" />
              <BatterPropsList
                homeTeamId={homeTeam.id}
                awayTeamId={awayTeam.id}
                homePitcher={homePitcherStats}
                awayPitcher={awayPitcherStats}
                homePitcherName={homePitcher?.fullName ?? ''}
                awayPitcherName={awayPitcher?.fullName ?? ''}
              />
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}
