import { memo, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppBackground } from '@/src/components/AppBackground';
import { GlassCard } from '@/src/components/GlassCard';
import { TeamLogo } from '@/src/components/TeamLogo';
import { PlayerHeadshot } from '@/src/components/PlayerHeadshot';
import { TEAM_DISPLAY_ABBR } from '@/src/utils/mlbImages';
import { fetchGamesForDate } from '@/src/api/mlb';
import type { Game } from '@/src/api/mlb';
import { localDateString } from '@/src/utils/formatters';
import { useTabBarScroll } from '@/src/hooks/useTabBarScroll';
import { TAB_BAR_HEIGHT } from '@/src/components/LiquidGlassTabBar';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return localDateString(d);
}

function formatDisplayDate(dateStr: string): string {
  const todayStr = localDateString();
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yesterdayStr = localDateString(yest);
  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

// Build a small window of selectable dates: 7 days back → today
function buildDateWindow(today: string): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today + 'T12:00:00');
    d.setDate(d.getDate() - i);
    dates.push(toDateString(d));
  }
  return dates;
}

function chipLabel(dateStr: string, today: string): string {
  const yest = new Date(today + 'T12:00:00');
  yest.setDate(yest.getDate() - 1);
  const yesterdayStr = toDateString(yest);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterdayStr) return 'Yest';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getGameStatus(game: Game) {
  const s = game.status.detailedState;
  const isFinal = s === 'Final' || s === 'Game Over' || s === 'Completed Early';
  const isLive = s === 'In Progress' || s === 'Manager Challenge';
  const isDelayed = s.includes('Delay') || s.includes('Suspended');
  if (isFinal) return { kind: 'final' as const, label: 'FINAL', color: '#50C882' };
  if (isLive) {
    const inning = game.linescore?.currentInningOrdinal ?? '';
    const half = game.linescore?.inningState ?? '';
    return { kind: 'live' as const, label: `${half} ${inning}`.trim() || 'LIVE', color: '#EB505A' };
  }
  if (isDelayed) return { kind: 'delayed' as const, label: 'DELAYED', color: '#FF7828' };
  return { kind: 'scheduled' as const, label: '', color: 'rgba(255,255,255,0.35)' };
}

// ─── Compact Score Card ────────────────────────────────────────────────────────

const ScoreCard = memo(function ScoreCard({ game }: { game: Game }) {
  const { kind, label, color } = getGameStatus(game);
  const showScore = kind === 'final' || kind === 'live';

  const awayAbbr = TEAM_DISPLAY_ABBR[game.teams.away.team.id] ?? game.teams.away.team.name.split(' ').pop()!;
  const homeAbbr = TEAM_DISPLAY_ABBR[game.teams.home.team.id] ?? game.teams.home.team.name.split(' ').pop()!;

  const awayPitcher = game.teams.away.probablePitcher;
  const homePitcher = game.teams.home.probablePitcher;

  const awayRuns = game.linescore?.teams?.away?.runs ?? 0;
  const homeRuns = game.linescore?.teams?.home?.runs ?? 0;
  const awayHits = game.linescore?.teams?.away?.hits ?? 0;
  const homeHits = game.linescore?.teams?.home?.hits ?? 0;
  const awayErrors = game.linescore?.teams?.away?.errors ?? 0;
  const homeErrors = game.linescore?.teams?.home?.errors ?? 0;

  const awayWins = showScore && awayRuns > homeRuns;
  const homeWins = showScore && homeRuns > awayRuns;

  const gameTime = new Date(game.gameDate).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  // Pitcher last name only — clean & compact
  const pitcherLastName = (full?: string) => full?.split(' ').pop() ?? 'TBD';

  return (
    <TouchableOpacity
      onPress={() => router.push(`/game/${game.gamePk}`)}
      activeOpacity={0.78}
      style={{ marginBottom: 10 }}
    >
      <GlassCard
        cornerRadius={20}
        style={[
          { padding: 0, overflow: 'hidden' },
          kind === 'final' && { borderColor: 'rgba(80,200,130,0.18)' },
          kind === 'live' && { borderColor: 'rgba(235,80,90,0.30)' },
        ]}
      >
        {/* ── Status bar ── */}
        <LinearGradient
          colors={
            kind === 'live'
              ? ['rgba(235,80,90,0.15)', 'rgba(235,80,90,0.02)']
              : kind === 'final'
              ? ['rgba(80,200,130,0.08)', 'transparent']
              : ['rgba(255,255,255,0.04)', 'transparent']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.05)',
          }}
        >
          {/* Status pill */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {kind === 'live' && (
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#EB505A' }} />
            )}
            {kind === 'final' && (
              <Ionicons name="checkmark-circle" size={11} color="#50C882" />
            )}
            {kind === 'scheduled' && (
              <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.25)" />
            )}
            <Text style={{ color, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }}>
              {label || gameTime}
            </Text>
          </View>

          <View style={{ flex: 1 }} />

          {/* Venue */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.20)" />
            <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10 }} numberOfLines={1}>
              {game.venue.name}
            </Text>
          </View>
        </LinearGradient>

        {/* ── Main score row ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 }}>

          {/* Away team */}
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TeamLogo teamId={game.teams.away.team.id} teamName={game.teams.away.team.name} size={36} />
              <View>
                <Text style={{
                  color: showScore ? (awayWins ? '#FFFFFF' : 'rgba(255,255,255,0.38)') : 'rgba(255,255,255,0.72)',
                  fontSize: 18, fontWeight: '900', letterSpacing: -0.3,
                }}>
                  {awayAbbr}
                </Text>
                {/* Pitcher info row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  {awayPitcher && (
                    <PlayerHeadshot
                      playerId={awayPitcher.id}
                      playerName={awayPitcher.fullName}
                      size={16}
                    />
                  )}
                  <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
                    {pitcherLastName(awayPitcher?.fullName)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Score center */}
          <View style={{ alignItems: 'center', paddingHorizontal: 12, minWidth: 90 }}>
            {showScore ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{
                  color: awayWins ? '#FFFFFF' : 'rgba(255,255,255,0.28)',
                  fontSize: 32, fontWeight: '900',
                }}>
                  {awayRuns}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.18)', fontSize: 20, fontWeight: '300' }}>–</Text>
                <Text style={{
                  color: homeWins ? '#FFFFFF' : 'rgba(255,255,255,0.28)',
                  fontSize: 32, fontWeight: '900',
                }}>
                  {homeRuns}
                </Text>
              </View>
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 }}>
                {gameTime}
              </Text>
            )}
          </View>

          {/* Home team — mirrored */}
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{
                  color: showScore ? (homeWins ? '#FFFFFF' : 'rgba(255,255,255,0.38)') : '#FFFFFF',
                  fontSize: 18, fontWeight: '900', letterSpacing: -0.3,
                }}>
                  {homeAbbr}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
                    {pitcherLastName(homePitcher?.fullName)}
                  </Text>
                  {homePitcher && (
                    <PlayerHeadshot
                      playerId={homePitcher.id}
                      playerName={homePitcher.fullName}
                      size={16}
                    />
                  )}
                </View>
              </View>
              <TeamLogo teamId={game.teams.home.team.id} teamName={game.teams.home.team.name} size={36} />
            </View>
          </View>
        </View>

        {/* ── Stats footer ── */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.05)',
          gap: 6,
        }}>
          {/* R / H / E — only when we have score data */}
          {showScore ? (
            <>
              <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                {/* Runs */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 }}>R</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700' }}>
                    {awayRuns}–{homeRuns}
                  </Text>
                </View>
                {/* Hits */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 }}>H</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700' }}>
                    {awayHits}–{homeHits}
                  </Text>
                </View>
                {/* Errors */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 }}>E</Text>
                  <Text style={{ color: (awayErrors + homeErrors) > 0 ? '#EB505A' : 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700' }}>
                    {awayErrors}–{homeErrors}
                  </Text>
                </View>
              </View>
              {/* Analyze CTA */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,120,40,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,120,40,0.20)' }}>
                <Text style={{ color: '#FF7828', fontSize: 10, fontWeight: '800' }}>Deep Analysis</Text>
                <Ionicons name="arrow-forward" size={10} color="#FF7828" />
              </View>
            </>
          ) : (
            <>
              {/* Pre-game: show probable pitcher matchup label */}
              <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.22)" />
              <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 11, flex: 1 }}>
                {awayPitcher && homePitcher
                  ? `${pitcherLastName(awayPitcher.fullName)} vs ${pitcherLastName(homePitcher.fullName)}`
                  : awayPitcher
                  ? `${pitcherLastName(awayPitcher.fullName)} starting`
                  : 'Pitchers TBD'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: 10, fontWeight: '800' }}>Preview</Text>
                <Ionicons name="arrow-forward" size={10} color="rgba(255,255,255,0.40)" />
              </View>
            </>
          )}
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
});

// ─── Date Chip ────────────────────────────────────────────────────────────────

function DateChip({
  dateStr,
  today,
  selected,
  onPress,
}: {
  dateStr: string;
  today: string;
  selected: boolean;
  onPress: () => void;
}) {
  const label = chipLabel(dateStr, today);
  const isToday = dateStr === today;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      {selected ? (
        <LinearGradient
          colors={['#FFA550', '#FF7828']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, alignItems: 'center', minWidth: 52 }}
        >
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: isToday ? 'rgba(255,120,40,0.25)' : 'rgba(255,255,255,0.08)', alignItems: 'center', minWidth: 52 }}>
          <Text style={{ color: isToday ? 'rgba(255,120,40,0.8)' : 'rgba(255,255,255,0.38)', fontSize: 12, fontWeight: '700' }}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const renderCard = ({ item }: { item: Game }) => <ScoreCard game={item} />;
const keyExtractor = (g: Game) => g.gamePk.toString();

export default function ScoresScreen() {
  const today = toDateString(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const { scrollHandler, scrollEventThrottle } = useTabBarScroll();

  const { data: games, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['games-scores', selectedDate],
    queryFn: () => fetchGamesForDate(selectedDate),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const dateWindow = buildDateWindow(today);

  const finalCount = games?.filter(g => {
    const s = g.status.detailedState;
    return s === 'Final' || s === 'Game Over';
  }).length ?? 0;
  const liveCount = games?.filter(g => g.status.detailedState === 'In Progress').length ?? 0;
  const totalGames = games?.length ?? 0;

  const ListHeader = useCallback(() => (
    <View>
      {/* Title row */}
      <View style={{ paddingTop: 60, paddingHorizontal: 18, paddingBottom: 14 }}>
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 3 }}>
          MLB
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>Scores</Text>
          {/* Live pulse */}
          {liveCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(235,80,90,0.12)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(235,80,90,0.28)' }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#EB505A' }} />
              <Text style={{ color: '#EB505A', fontSize: 11, fontWeight: '800' }}>{liveCount} Live</Text>
            </View>
          )}
          {finalCount > 0 && liveCount === 0 && (
            <Text style={{ color: '#50C882', fontSize: 13, fontWeight: '700' }}>{finalCount} Final</Text>
          )}
        </View>
      </View>

      {/* Date chips */}
      <View style={{ flexDirection: 'row', gap: 7, paddingHorizontal: 18, marginBottom: 18 }}>
        {dateWindow.map((d) => (
          <DateChip
            key={d}
            dateStr={d}
            today={today}
            selected={d === selectedDate}
            onPress={() => setSelectedDate(d)}
          />
        ))}
      </View>

      {/* Summary strip */}
      {totalGames > 0 && (
        <View style={{ paddingHorizontal: 18, marginBottom: 14 }}>
          <GlassCard style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Ionicons name="baseball-outline" size={13} color="rgba(255,255,255,0.35)" />
              <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: 12 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{totalGames}</Text> games
                {finalCount > 0 && (
                  <Text style={{ color: '#50C882' }}>  ·  {finalCount} final</Text>
                )}
                {liveCount > 0 && (
                  <Text style={{ color: '#EB505A' }}>  ·  {liveCount} live</Text>
                )}
              </Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 11 }}>
              {formatDisplayDate(selectedDate)}
            </Text>
          </GlassCard>
        </View>
      )}
    </View>
  ), [selectedDate, today, liveCount, finalCount, totalGames]);

  return (
    <AppBackground>
      {isLoading ? (
        <>
          <ListHeader />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 }}>
            <ActivityIndicator color="#FF7828" size="large" />
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 12 }}>Loading…</Text>
          </View>
        </>
      ) : !games || games.length === 0 ? (
        <>
          <ListHeader />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 120 }}>
            <Ionicons name="calendar-outline" size={44} color="rgba(255,255,255,0.10)" style={{ marginBottom: 14 }} />
            <Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 15 }}>No games on this date</Text>
          </View>
        </>
      ) : (
        <Animated.FlatList
          data={games}
          keyExtractor={keyExtractor}
          renderItem={renderCard}
          ListHeaderComponent={ListHeader}
          onScroll={scrollHandler}
          scrollEventThrottle={scrollEventThrottle}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF7828" />
          }
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: TAB_BAR_HEIGHT + 48 }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={6}
          windowSize={5}
          initialNumToRender={5}
        />
      )}
    </AppBackground>
  );
}
