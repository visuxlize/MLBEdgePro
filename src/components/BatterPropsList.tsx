import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { GlassCard } from './GlassCard';
import { PlayerHeadshot } from './PlayerHeadshot';
import { useTeamBatters } from '@/src/hooks/useTeamBatters';
import type { PitcherStats, RosterBatter } from '@/src/api/mlb';
import {
  hitProbability,
  twoHitsProbability,
  hrProbability,
  strikeoutProbability,
} from '@/src/utils/predictions';
import { ActivityIndicator } from 'react-native';

type PropTab = 'HR' | 'Hit' | '2+ Hits' | 'K';

interface BatterRowProps {
  rank: number;
  batter: RosterBatter;
  pct: number;
  subStats: string;
}

function BatterRow({ rank, batter, pct, subStats }: BatterRowProps) {
  const label = pct >= 40 ? 'Possible' : pct >= 20 ? 'Unlikely' : 'Long shot';
  const pctColor = pct >= 40 ? '#50C882' : pct >= 20 ? '#FF7828' : 'rgba(255,255,255,0.35)';

  return (
    <TouchableOpacity
      onPress={() => router.push(`/player/${batter.id}` as any)}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
      }}
    >
      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '700', width: 22 }}>
        {rank}
      </Text>
      <PlayerHeadshot playerId={batter.id} playerName={batter.fullName} size={36} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{batter.fullName}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 }}>{subStats}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: pctColor, fontSize: 15, fontWeight: '900' }}>{pct}%</Text>
        <Text style={{ color: pctColor, fontSize: 10, fontWeight: '700', opacity: 0.8 }}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

interface Props {
  homeTeamId: number;
  awayTeamId: number;
  homePitcher: PitcherStats;
  awayPitcher: PitcherStats;
  homePitcherName: string;
  awayPitcherName: string;
}

const TABS: PropTab[] = ['HR', 'Hit', '2+ Hits', 'K'];

export function BatterPropsList({
  homeTeamId,
  awayTeamId,
  homePitcher,
  awayPitcher,
  homePitcherName,
  awayPitcherName,
}: Props) {
  const [activeTab, setActiveTab] = useState<PropTab>('HR');
  const { data: homeBatters, isLoading: homeLoading } = useTeamBatters(homeTeamId);
  const { data: awayBatters, isLoading: awayLoading } = useTeamBatters(awayTeamId);

  const isLoading = homeLoading || awayLoading;

  const homeIp = parseFloat(homePitcher.inningsPitched) || 1;
  const awayIp = parseFloat(awayPitcher.inningsPitched) || 1;
  const homeK9 = homePitcher.strikeOuts / (homeIp / 9);
  const awayK9 = awayPitcher.strikeOuts / (awayIp / 9);

  function rowsForGroup(batters: RosterBatter[], pitcher: PitcherStats, pitcherK9: number, tab: PropTab) {
    return batters.map((b) => {
      const ab = Math.max(b.stats.atBats ?? 1, 1);
      const pa = Math.max(b.stats.plateAppearances ?? ab, 1);
      const avg = parseFloat(b.stats.avg);
      const avgStr = `.${b.stats.avg.replace('0.', '')}`;

      switch (tab) {
        case 'HR':
          return {
            batter: b,
            pct: Math.round(hrProbability(b.stats.homeRuns / ab, parseFloat(pitcher.era)) * 100),
            subStats: `${avgStr} AVG · ${b.stats.homeRuns} HR · ${b.stats.ops} OPS`,
          };
        case 'Hit':
          return {
            batter: b,
            pct: hitProbability(avg, parseFloat(pitcher.whip)),
            subStats: `${avgStr} AVG · ${b.stats.homeRuns} HR · ${b.stats.ops} OPS`,
          };
        case '2+ Hits':
          return {
            batter: b,
            pct: twoHitsProbability(avg, parseFloat(pitcher.whip)),
            subStats: `${avgStr} AVG · ${b.stats.rbi} RBI · ${b.stats.ops} OPS`,
          };
        case 'K':
          return {
            batter: b,
            pct: strikeoutProbability(b.stats.strikeOuts / pa, pitcherK9),
            subStats: `${b.stats.strikeOuts} K · ${avgStr} AVG · ${b.stats.ops} OPS`,
          };
      }
    });
  }

  function computeRows(tab: PropTab) {
    // Away batters face home pitcher; home batters face away pitcher
    const away = rowsForGroup(awayBatters ?? [], homePitcher, homeK9, tab);
    const home = rowsForGroup(homeBatters ?? [], awayPitcher, awayK9, tab);
    return [...away, ...home].sort((a, b) => b.pct - a.pct).slice(0, 16);
  }

  const rows = computeRows(activeTab);

  return (
    <View>
      {/* Tab chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 8,
                backgroundColor: active ? '#FF7828' : 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: active ? '#FF7828' : 'rgba(255,255,255,0.10)',
              }}
            >
              <Text style={{ color: active ? '#FFFFFF' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' }}>
                {tab === 'HR' ? 'HR Report' : tab === 'Hit' ? 'Most Likely Hit' : tab === '2+ Hits' ? '2+ Hits' : 'Strikeouts'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <GlassCard style={{ padding: 16 }}>
        {isLoading ? (
          <View style={{ alignItems: 'center', padding: 24 }}>
            <ActivityIndicator color="#FF7828" />
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 10 }}>
              Loading batter data...
            </Text>
          </View>
        ) : rows.length === 0 ? (
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', padding: 16 }}>
            No batter data available
          </Text>
        ) : (
          rows.map((row, i) => (
            <BatterRow
              key={row.batter.id}
              rank={i + 1}
              batter={row.batter}
              pct={row.pct}
              subStats={row.subStats}
            />
          ))
        )}
      </GlassCard>
    </View>
  );
}
