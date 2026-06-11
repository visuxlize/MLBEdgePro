import { useCallback, useState } from 'react';
import { PaywallGate } from '@/src/components/PaywallGate';
import { useSubscription } from '@/src/hooks/useSubscription';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppBackground } from '@/src/components/AppBackground';
import { LoadingState } from '@/src/components/LoadingState';
import { GlassCard } from '@/src/components/GlassCard';
import { TeamLogo } from '@/src/components/TeamLogo';
import MatchupCard from '@/src/components/MatchupCard';
import { InsightCard } from '@/src/components/InsightCard';
import { PropAnalysisCard } from '@/src/components/PropAnalysisCard';
import { useGames } from '@/src/hooks/useGames';
import { useTabBarScroll } from '@/src/hooks/useTabBarScroll';
import { TAB_BAR_HEIGHT } from '@/src/components/LiquidGlassTabBar';
import type { Game } from '@/src/api/mlb';

interface PropItem {
  key: string;
  gamePk: number;
  pitcher: { id: number; fullName: string };
  pitcherTeam: string;
  opposingTeam: string;
}

type Tab = 'matchups' | 'edge' | 'props';

const TABS: { id: Tab; label: string; icon: string; pro?: boolean }[] = [
  { id: 'matchups', label: 'Matchups', icon: 'stats-chart-outline' },
  { id: 'edge', label: 'Edge Report', icon: 'flash-outline', pro: true },
  { id: 'props', label: 'Props', icon: 'person-outline', pro: true },
];

// ─── Stable renderItem callbacks (module-level, never recreated) ──────────────

const renderMatchupItem = ({ item }: { item: Game }) => <MatchupCard game={item} />;
const renderInsightItem = ({ item }: { item: Game }) => <InsightCard game={item} />;
const renderPropItem = ({ item }: { item: PropItem }) => (
  <PropAnalysisCard
    pitcher={item.pitcher}
    pitcherTeam={item.pitcherTeam}
    opposingTeam={item.opposingTeam}
  />
);
const gameKeyExtractor = (item: Game) => item.gamePk.toString();
const propKeyExtractor = (item: PropItem) => item.key;

// ─── Empty state components (stable references) ───────────────────────────────

const MatchupsEmpty = (
  <View style={{ alignItems: 'center', paddingTop: 60 }}>
    <Ionicons name="stats-chart-outline" size={44} color="rgba(255,255,255,0.12)" style={{ marginBottom: 12 }} />
    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, textAlign: 'center' }}>
      No pitching matchups confirmed yet
    </Text>
  </View>
);

const EdgeEmpty = (
  <View style={{ alignItems: 'center', paddingTop: 60 }}>
    <Ionicons name="flash-outline" size={44} color="rgba(255,255,255,0.12)" style={{ marginBottom: 12 }} />
    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>
      Edge data requires confirmed pitchers
    </Text>
  </View>
);

const PropsEmpty = (
  <View style={{ alignItems: 'center', paddingTop: 60 }}>
    <Ionicons name="person-outline" size={44} color="rgba(255,255,255,0.12)" style={{ marginBottom: 12 }} />
    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>No prop data available yet</Text>
  </View>
);

export default function AnalysisScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('matchups');
  const { data: games, isLoading, refetch, isRefetching } = useGames();
  const { isPro } = useSubscription();

  if (isLoading) return <LoadingState message="Loading analysis..." />;

  const gamesWithPitchers = games?.filter(
    (g) => g.teams.home.probablePitcher && g.teams.away.probablePitcher,
  ) ?? [];

  const allWithPitchers = games?.filter(
    (g) => g.teams.away.probablePitcher || g.teams.home.probablePitcher,
  ) ?? [];

  // Flatten games into per-pitcher prop items
  const propItems: PropItem[] = [];
  for (const g of allWithPitchers) {
    if (g.teams.away.probablePitcher) {
      propItems.push({
        key: `${g.gamePk}-away`,
        gamePk: g.gamePk,
        pitcher: g.teams.away.probablePitcher,
        pitcherTeam: g.teams.away.team.name,
        opposingTeam: g.teams.home.team.name,
      });
    }
    if (g.teams.home.probablePitcher) {
      propItems.push({
        key: `${g.gamePk}-home`,
        gamePk: g.gamePk,
        pitcher: g.teams.home.probablePitcher,
        pitcherTeam: g.teams.home.team.name,
        opposingTeam: g.teams.away.team.name,
      });
    }
  }

  const { scrollHandler, scrollEventThrottle } = useTabBarScroll();
  const refreshControl = <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF7828" />;
  const listStyle = { paddingHorizontal: 18, paddingBottom: TAB_BAR_HEIGHT + 48 };

  const renderContent = () => {
    if (activeTab === 'matchups') {
      return (
        <Animated.FlatList
          data={gamesWithPitchers}
          keyExtractor={gameKeyExtractor}
          renderItem={renderMatchupItem}
          onScroll={scrollHandler}
          scrollEventThrottle={scrollEventThrottle}
          refreshControl={refreshControl}
          ListEmptyComponent={MatchupsEmpty}
          contentContainerStyle={listStyle}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={5}
          initialNumToRender={6}
        />
      );
    }

    if (activeTab === 'edge') {
      return (
        <PaywallGate
          feature="Edge Report"
          benefits={[
            'Value bets ranked by edge score',
            'Pitcher vs lineup matchup grades',
            'Weather & ballpark factor analysis',
            'AI-powered game insights',
          ]}
          minHeight={440}
        >
          <Animated.FlatList
            data={gamesWithPitchers}
            keyExtractor={gameKeyExtractor}
            renderItem={renderInsightItem}
            onScroll={scrollHandler}
            scrollEventThrottle={scrollEventThrottle}
            refreshControl={refreshControl}
            ListEmptyComponent={EdgeEmpty}
            contentContainerStyle={listStyle}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            maxToRenderPerBatch={8}
            windowSize={5}
            initialNumToRender={6}
          />
        </PaywallGate>
      );
    }

    // Props tab — gated
    return (
      <PaywallGate
        feature="Pitcher Prop Analysis"
        benefits={[
          'Strikeout projections with over/under',
          'K/9, ERA & WHIP breakdown',
          'Matchup-adjusted projections',
          'Add pitcher props to your slip',
        ]}
        minHeight={440}
      >
        <Animated.FlatList
          data={propItems}
          keyExtractor={propKeyExtractor}
          renderItem={renderPropItem}
          onScroll={scrollHandler}
          scrollEventThrottle={scrollEventThrottle}
          refreshControl={refreshControl}
          ListEmptyComponent={PropsEmpty}
          contentContainerStyle={listStyle}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={5}
          initialNumToRender={6}
        />
      </PaywallGate>
    );
  };

  return (
    <AppBackground>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 18, paddingBottom: 16 }}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 }}>
          TODAY'S
        </Text>
        <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>Analysis</Text>
      </View>

      {/* Tab switcher */}
      <View style={{ paddingHorizontal: 18, marginBottom: 16 }}>
        <GlassCard style={{ padding: 4, flexDirection: 'row' }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
                style={{ flex: 1, borderRadius: 14 }}
              >
                {active ? (
                  <LinearGradient
                    colors={['#FFA550', '#FF7828']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 14, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 }}
                  >
                    <Ionicons name={tab.icon as any} size={14} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{tab.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={{ paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
                    <Ionicons name={tab.icon as any} size={14} color="rgba(255,255,255,0.35)" />
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '600' }}>{tab.label}</Text>
                    {tab.pro && !isPro && (
                      <Ionicons name="lock-closed" size={10} color="rgba(255,120,40,0.60)" />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </GlassCard>
      </View>

      {/* Count badge */}
      <View style={{ paddingHorizontal: 18, marginBottom: 12 }}>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
          {activeTab === 'matchups' && `${gamesWithPitchers.length} GAMES WITH CONFIRMED PITCHERS`}
          {activeTab === 'edge' && `${gamesWithPitchers.length} GAMES RANKED BY EDGE SCORE`}
          {activeTab === 'props' && `${propItems.length} PITCHERS WITH PROP DATA`}
        </Text>
      </View>

      {renderContent()}
    </AppBackground>
  );
}
