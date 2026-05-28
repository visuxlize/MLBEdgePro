import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { Dimensions, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppBackground } from '@/src/components/AppBackground';
import { LoadingState } from '@/src/components/LoadingState';
import { GlassCard } from '@/src/components/GlassCard';
import { TeamLogo } from '@/src/components/TeamLogo';
import GameCard from '@/src/components/GameCard';
import { useGames } from '@/src/hooks/useGames';
import { useSettings } from '@/src/hooks/useSettings';
import { useAuth } from '@/src/hooks/useAuth';
import { useWeather } from '@/src/hooks/useWeather';
import { getStadiumImageUrl, TEAM_DISPLAY_ABBR } from '@/src/utils/mlbImages';
import { useTabBarScroll } from '@/src/hooks/useTabBarScroll';
import { useSavedSlips } from '@/src/hooks/useSavedSlips';
import { TAB_BAR_HEIGHT } from '@/src/components/LiquidGlassTabBar';
import type { Game } from '@/src/api/mlb';

const { width: SW } = Dimensions.get('window');

// Convert wind degrees → cardinal
function windCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// ─── Featured game card with stadium image ────────────────────────────────────

function FeaturedGameCard({ game, onPress }: { game: any; onPress: () => void }) {
  const gameTime = new Date(game.gameDate).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
  const stadiumUrl = getStadiumImageUrl(game.venue.id);
  const awayAbbr = TEAM_DISPLAY_ABBR[game.teams.away.team.id] ?? game.teams.away.team.name.split(' ').pop();
  const homeAbbr = TEAM_DISPLAY_ABBR[game.teams.home.team.id] ?? game.teams.home.team.name.split(' ').pop();
  const awayPitcher = game.teams.away.probablePitcher?.fullName;
  const homePitcher = game.teams.home.probablePitcher?.fullName;
  const [imgError, setImgError] = useState(false);
  const showImage = !!stadiumUrl && !imgError;
  const { data: weather } = useWeather(game.venue.id, game.venue.name);

  const windTowardDeg = weather ? (weather.windDeg + 180) % 360 : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        marginBottom: 20,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.55,
        shadowRadius: 24,
      }}
    >
      {/* Stadium photo or gradient fallback */}
      {showImage ? (
        <Image
          source={{ uri: stadiumUrl }}
          style={{ width: '100%', height: 210 }}
          contentFit="cover"
          transition={400}
          onError={() => setImgError(true)}
        />
      ) : (
        <LinearGradient
          colors={['#0D2340', '#1A3A6B', '#0A1628']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: '100%', height: 210 }}
        />
      )}

      {/* Gradient overlay — stronger dark bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.20)', 'rgba(10,14,20,0.92)']}
        locations={[0, 0.45, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* YOUR TEAM label + weather badge — top row */}
      <View style={{ position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.50)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,120,40,0.30)' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF7828' }} />
          <Text style={{ color: '#FF7828', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }}>YOUR TEAM</Text>
        </View>

        <View style={{ flex: 1 }} />

        {/* Weather badge */}
        {weather && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.50)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
            <Ionicons name={weather.icon as any} size={13} color="rgba(255,255,255,0.75)" />
            <Text style={{ color: 'rgba(255,255,255,0.80)', fontSize: 11, fontWeight: '700' }}>{weather.temp}°F</Text>
            <View style={{ width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.20)' }} />
            {/* Two wind direction arrows */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
              <View style={{ transform: [{ rotate: `${windTowardDeg}deg` }] }}>
                <Ionicons name="arrow-up" size={11} color="rgba(255,200,80,0.85)" />
              </View>
              <View style={{ transform: [{ rotate: `${windTowardDeg}deg` }] }}>
                <Ionicons name="arrow-up" size={9} color="rgba(255,200,80,0.45)" />
              </View>
            </View>
            <Text style={{ color: 'rgba(255,200,80,0.85)', fontSize: 11, fontWeight: '700' }}>
              {weather.windSpeed} {windCardinal(weather.windDeg)}
            </Text>
          </View>
        )}
      </View>

      {/* Teams bottom row */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18 }}>
        {/* Venue name */}
        <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textAlign: 'center', marginBottom: 12 }}>
          {game.venue.name}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {/* Away */}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <TeamLogo teamId={game.teams.away.team.id} teamName={game.teams.away.team.name} size={52} />
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.5, marginTop: 6 }}>
              {awayAbbr}
            </Text>
            {awayPitcher && (
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 }} numberOfLines={1}>
                {awayPitcher.split(' ').pop()}
              </Text>
            )}
          </View>

          {/* Centre info */}
          <View style={{ alignItems: 'center', paddingHorizontal: 16 }}>
            <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: '600', marginBottom: 4 }}>Today</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>{gameTime}</Text>
          </View>

          {/* Home */}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <TeamLogo teamId={game.teams.home.team.id} teamName={game.teams.home.team.name} size={52} />
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.5, marginTop: 6 }}>
              {homeAbbr}
            </Text>
            {homePitcher && (
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 }} numberOfLines={1}>
                {homePitcher.split(' ').pop()}
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Quick stats bar ──────────────────────────────────────────────────────────

function QuickStat({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Ionicons name={icon as any} size={15} color="#FF7828" style={{ marginBottom: 4 }} />
      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }}>{value}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const keyExtractor = (item: { gamePk: number }) => item.gamePk.toString();

export default function GamesScreen() {
  const { data: games, isLoading, isError, error, refetch, isRefetching } = useGames();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { scrollHandler, scrollEventThrottle } = useTabBarScroll();
  const { pending, pendingCheckIn } = useSavedSlips();
  const [checkInDismissed, setCheckInDismissed] = useState(false);

  const renderGameCard = useCallback(
    ({ item }: { item: Game }) => <GameCard game={item} />,
    [],
  );

  if (isLoading) return <LoadingState message="Loading today's slate..." />;

  if (isError) {
    return (
      <AppBackground>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="warning-outline" size={40} color="#EB505A" style={{ marginBottom: 16 }} />
          <Text style={{ color: '#EB505A', textAlign: 'center', fontSize: 15, fontWeight: '600' }}>
            {(error as Error)?.message ?? 'Failed to load games'}
          </Text>
          <TouchableOpacity onPress={() => refetch()} activeOpacity={0.8} style={{ marginTop: 20 }}>
            <LinearGradient
              colors={['#FFA550', '#FF7828', '#C85014']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13 }}
            >
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </AppBackground>
    );
  }

  const favTeamGame = settings.favoriteTeamId
    ? games?.find(
        (g) =>
          g.teams.home.team.id === settings.favoriteTeamId ||
          g.teams.away.team.id === settings.favoriteTeamId,
      )
    : null;

  const otherGames = games?.filter((g) => g.gamePk !== favTeamGame?.gamePk) ?? [];
  const liveCount = games?.filter((g) => g.status.detailedState === 'In Progress').length ?? 0;
  const gamesWithPitchers = games?.filter((g) => g.teams.home.probablePitcher && g.teams.away.probablePitcher).length ?? 0;

  return (
    <AppBackground>
      <Animated.FlatList
        data={otherGames}
        keyExtractor={keyExtractor}
        renderItem={renderGameCard}
        onScroll={scrollHandler}
        scrollEventThrottle={scrollEventThrottle}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF7828" />
        }
        removeClippedSubviews
        maxToRenderPerBatch={8}
        windowSize={5}
        initialNumToRender={6}
        ListHeaderComponent={
          <View>
            {/* Check-in banner — shown when saved slips are likely done */}
            {pendingCheckIn.length > 0 && !checkInDismissed && (
              <TouchableOpacity
                onPress={() => { router.push('/(tabs)/settings-tab' as any); }}
                activeOpacity={0.85}
                style={{ marginHorizontal: 18, marginTop: 56, marginBottom: -20 }}
              >
                <LinearGradient
                  colors={['rgba(255,120,40,0.18)', 'rgba(255,120,40,0.10)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: 'rgba(255,120,40,0.35)',
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,120,40,0.20)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="notifications" size={18} color="#FF7828" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                      {pendingCheckIn.length === 1 ? '1 slip ready to check in' : `${pendingCheckIn.length} slips ready to check in`}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 1 }}>
                      Did your slips win? Tap to record outcomes →
                    </Text>
                  </View>
                  <TouchableOpacity onPress={(e) => { e.stopPropagation(); setCheckInDismissed(true); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={16} color="rgba(255,255,255,0.35)" />
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Top bar */}
            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 60,
                paddingBottom: 20,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
              }}
            >
              <View>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: 12,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                  }}
                >
                  {user ? `Hey, ${user.name.split(' ')[0]}` : 'Welcome back'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>
                    Today
                  </Text>
                  {(games?.length ?? 0) > 0 && (
                    <Text style={{ color: '#FF7828', fontSize: 22, fontWeight: '900' }}>
                      {games?.length}
                    </Text>
                  )}
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
              </View>

              <View style={{ width: 40 }} />
            </View>

            {/* Quick stats + bet slips */}
            {(games?.length ?? 0) > 0 && (
              <View style={{ paddingHorizontal: 18, marginBottom: 20 }}>
                <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Games / Live / Analyzed row */}
                  <View style={{ flexDirection: 'row', padding: 16 }}>
                    <QuickStat icon="baseball-outline" label="Games" value={games?.length ?? 0} />
                    <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
                    <QuickStat icon="radio-button-on-outline" label="Live" value={liveCount} />
                    <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
                    <QuickStat icon="stats-chart-outline" label="Analyzed" value={gamesWithPitchers} />
                  </View>

                  {/* Bet Slips divider row */}
                  <TouchableOpacity
                    onPress={() => router.push('/bet-history' as any)}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 11,
                      borderTopWidth: 1,
                      borderTopColor: 'rgba(255,255,255,0.06)',
                      gap: 8,
                    }}
                  >
                    <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: 'rgba(255,120,40,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="layers-outline" size={14} color="#FF7828" />
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, flex: 1 }}>
                      Bet Slips:{' '}
                      <Text style={{ color: pending.length > 0 ? '#FF7828' : 'rgba(255,255,255,0.30)', fontWeight: '800' }}>
                        {pending.length} active
                      </Text>
                    </Text>
                    <Text style={{ color: '#FF7828', fontSize: 12, fontWeight: '700' }}>View my slips →</Text>
                  </TouchableOpacity>
                </GlassCard>
              </View>
            )}

            {/* Featured game */}
            {favTeamGame && (
              <View style={{ paddingHorizontal: 18 }}>
                <FeaturedGameCard
                  game={favTeamGame}
                  onPress={() => router.push(`/game/${favTeamGame.gamePk}`)}
                />
              </View>
            )}

            {/* All games header */}
            {otherGames.length > 0 && (
              <View style={{ paddingHorizontal: 18, marginBottom: 12 }}>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>
                  {favTeamGame ? 'OTHER GAMES' : 'ALL GAMES'}
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !favTeamGame ? (
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <Ionicons name="baseball-outline" size={48} color="rgba(255,255,255,0.12)" />
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, marginTop: 14 }}>
                No games scheduled today
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: TAB_BAR_HEIGHT + 48 }}
        showsVerticalScrollIndicator={false}
      />
    </AppBackground>
  );
}
