import { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/src/components/AppBackground';
import { GlassCard } from '@/src/components/GlassCard';
import { PlayerHeadshot } from '@/src/components/PlayerHeadshot';
import { TeamLogo } from '@/src/components/TeamLogo';
import { useGames } from '@/src/hooks/useGames';
import { useTeamBatters } from '@/src/hooks/useTeamBatters';
import { useTabBarScroll } from '@/src/hooks/useTabBarScroll';
import { useSavedSlips } from '@/src/hooks/useSavedSlips';
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN_H } from '@/src/components/LiquidGlassTabBar';
import { fetchPitcherStats, type Game, type PitcherStats, type RosterBatter } from '@/src/api/mlb';
import { queryKeys } from '@/src/constants/queryKeys';
import { TEAM_DISPLAY_ABBR } from '@/src/utils/mlbImages';
import { impliedAmericanOdds, formatCombinedPct } from '@/src/storage/slipStorage';
import {
  hitProbability,
  twoHitsProbability,
  hrProbability,
  pitcherKLineProp,
} from '@/src/utils/predictions';

const { width: SW } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type PropType = 'HR' | 'Hit' | '2+ Hits' | "Pitcher K's";

interface SlipEntry {
  id: string;
  playerName: string;
  propType: string;
  description: string;
  probability: number;
}

interface BatterRow {
  batter: RosterBatter;
  pct: number;
  subStats: string;
  pitcherName: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PROP_TYPES: { id: PropType; icon: string; label: string; desc: string }[] = [
  {
    id: 'HR',
    icon: 'flame-outline',
    label: 'Home Run',
    desc: 'HR probability vs opposing pitcher',
  },
  {
    id: 'Hit',
    icon: 'baseball-outline',
    label: '1+ Hit',
    desc: 'Probability of recording at least 1 hit',
  },
  {
    id: '2+ Hits',
    icon: 'layers-outline',
    label: '2+ Hits',
    desc: 'Probability of recording 2 or more hits',
  },
  {
    id: "Pitcher K's",
    icon: 'flash-outline',
    label: "Pitcher K's",
    desc: 'Projected strikeout line with over/under',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function propColor(pct: number): string {
  if (pct >= 65) return '#50C882';
  if (pct >= 40) return '#FF7828';
  return '#EB505A';
}

function propLabel(pct: number): string {
  if (pct >= 70) return 'Strong';
  if (pct >= 55) return 'Good Value';
  if (pct >= 40) return 'Possible';
  if (pct >= 25) return 'Risky';
  return 'Long Shot';
}

/** Returns combined probability as a true percentage (0–100). */
function combinedProbability(entries: SlipEntry[]): number {
  if (entries.length === 0) return 0;
  if (entries.length === 1) return entries[0].probability;
  return entries.reduce((acc, e) => acc * (e.probability / 100), 1) * 100;
}

function formatAvg(avg: string): string {
  if (!avg || avg.startsWith('-')) return avg;
  return avg.replace('0.', '.');
}

function gameTimeLabel(game: Game): string {
  const state = game.status.detailedState;
  if (state === 'Final' || state === 'Game Over') return 'Final';
  if (state === 'In Progress') {
    const half = game.linescore?.inningState ?? '';
    const inn = game.linescore?.currentInningOrdinal ?? '';
    return `${half} ${inn}`.trim() || 'Live';
  }
  return new Date(game.gameDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ─── Prob bar ─────────────────────────────────────────────────────────────────

function ProbBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 2, backgroundColor: color }} />
    </View>
  );
}

// ─── Game dropdown ────────────────────────────────────────────────────────────

function GameDropdown({
  games,
  selectedGame,
  onSelect,
}: {
  games: Game[];
  selectedGame: Game | undefined;
  onSelect: (pk: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const awayAbbr = selectedGame
    ? TEAM_DISPLAY_ABBR[selectedGame.teams.away.team.id] ?? selectedGame.teams.away.team.name.split(' ').pop()!
    : '—';
  const homeAbbr = selectedGame
    ? TEAM_DISPLAY_ABBR[selectedGame.teams.home.team.id] ?? selectedGame.teams.home.team.name.split(' ').pop()!
    : '—';
  const isLive = selectedGame?.status.detailedState === 'In Progress';

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.8}>
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 }}>
            {/* Live dot */}
            {isLive && (
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#EB505A', marginRight: 10 }} />
            )}
            {selectedGame ? (
              <>
                <TeamLogo teamId={selectedGame.teams.away.team.id} teamName={selectedGame.teams.away.team.name} size={28} />
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }} numberOfLines={1}>
                    {awayAbbr} <Text style={{ color: 'rgba(255,255,255,0.38)', fontWeight: '400' }}>@</Text> {homeAbbr}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                    {selectedGame.teams.away.probablePitcher?.fullName ?? 'TBD'} vs {selectedGame.teams.home.probablePitcher?.fullName ?? 'TBD'}
                  </Text>
                </View>
                <TeamLogo teamId={selectedGame.teams.home.team.id} teamName={selectedGame.teams.home.team.name} size={28} />
              </>
            ) : (
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, flex: 1 }}>Select a game…</Text>
            )}
            <View style={{ marginLeft: 10 }}>
              <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.35)" />
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>

      {/* Dropdown modal */}
      <Modal visible={open} transparent animationType="fade" statusBarTranslucent>
        {/* Backdrop */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />

        {/* Sheet */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#111622',
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            paddingBottom: insets.bottom + 12,
            maxHeight: '75%',
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 6 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)' }} />
          </View>

          {/* Title */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>Select Game</Text>
            <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={0.7} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Game list */}
          <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}>
            {games.map((g) => {
              const isSelected = g.gamePk === selectedGame?.gamePk;
              const aAbbr = TEAM_DISPLAY_ABBR[g.teams.away.team.id] ?? g.teams.away.team.name.split(' ').pop()!;
              const hAbbr = TEAM_DISPLAY_ABBR[g.teams.home.team.id] ?? g.teams.home.team.name.split(' ').pop()!;
              const live = g.status.detailedState === 'In Progress';
              const timeStr = gameTimeLabel(g);

              return (
                <TouchableOpacity
                  key={g.gamePk}
                  onPress={() => { onSelect(g.gamePk); setOpen(false); }}
                  activeOpacity={0.75}
                  style={{ marginBottom: 8 }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isSelected ? 'rgba(255,120,40,0.40)' : 'rgba(255,255,255,0.08)',
                      backgroundColor: isSelected ? 'rgba(255,120,40,0.10)' : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <TeamLogo teamId={g.teams.away.team.id} teamName={g.teams.away.team.name} size={32} />

                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {live && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EB505A' }} />}
                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                          {aAbbr} <Text style={{ color: 'rgba(255,255,255,0.35)', fontWeight: '400' }}>@</Text> {hAbbr}
                        </Text>
                        <Text style={{ color: live ? '#EB505A' : 'rgba(255,255,255,0.35)', fontSize: 11, marginLeft: 'auto' as any }}>
                          {timeStr}
                        </Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 3 }} numberOfLines={1}>
                        {g.teams.away.probablePitcher?.fullName ?? 'TBD'} vs {g.teams.home.probablePitcher?.fullName ?? 'TBD'}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10, marginTop: 2 }}>{g.venue.name}</Text>
                    </View>

                    <TeamLogo teamId={g.teams.home.team.id} teamName={g.teams.home.team.name} size={32} />

                    {isSelected && (
                      <View style={{ marginLeft: 10 }}>
                        <Ionicons name="checkmark-circle" size={18} color="#FF7828" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </Animated.ScrollView>
        </View>
      </Modal>
    </>
  );
}

// ─── Prop type pill row ───────────────────────────────────────────────────────

function PropTypePills({
  activeProp,
  onChange,
}: {
  activeProp: PropType;
  onChange: (p: PropType) => void;
}) {
  // Split 4 items into two rows of 2 for a clean 2×2 grid
  const rows = [PROP_TYPES.slice(0, 2), PROP_TYPES.slice(2, 4)];
  return (
    <View style={{ paddingHorizontal: 18, gap: 8, marginBottom: 16 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((pt) => {
            const active = activeProp === pt.id;
            return (
              <TouchableOpacity
                key={pt.id}
                onPress={() => onChange(pt.id)}
                activeOpacity={0.75}
                style={{ flex: 1 }}
              >
                {active ? (
                  <LinearGradient
                    colors={['#FFA550', '#FF7828']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      paddingVertical: 12,
                      borderRadius: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Ionicons name={pt.icon as any} size={14} color="#FFF" />
                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>{pt.label}</Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={{
                      paddingVertical: 12,
                      borderRadius: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.09)',
                    }}
                  >
                    <Ionicons name={pt.icon as any} size={14} color="rgba(255,255,255,0.35)" />
                    <Text style={{ color: 'rgba(255,255,255,0.50)', fontSize: 13, fontWeight: '600' }}>{pt.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Batter prop row ──────────────────────────────────────────────────────────

const BatterPropRow = memo(function BatterPropRow({
  rank,
  row,
  propType,
  inSlip,
  onAdd,
}: {
  rank: number;
  row: BatterRow;
  propType: PropType;
  inSlip: boolean;
  onAdd: (entry: SlipEntry) => void;
}) {
  const color = propColor(row.pct);
  const label = propLabel(row.pct);

  const handleAdd = useCallback(() => {
    onAdd({
      id: `${row.batter.id}-${propType}`,
      playerName: row.batter.fullName,
      propType,
      description: `${row.batter.fullName} ${propType} vs ${row.pitcherName}`,
      probability: row.pct,
    });
  }, [row, propType, onAdd]);

  return (
    <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.20)', fontSize: 11, fontWeight: '700', width: 22 }}>{rank}</Text>

        <PlayerHeadshot playerId={row.batter.id} playerName={row.batter.fullName} size={40} />

        <View style={{ flex: 1, marginLeft: 11 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }} numberOfLines={1}>{row.batter.fullName}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, fontWeight: '600' }}>{row.batter.position}</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.36)', fontSize: 11, marginTop: 1 }} numberOfLines={1}>{row.subStats}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.20)', fontSize: 10, marginTop: 1 }} numberOfLines={1}>vs {row.pitcherName}</Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 5, marginLeft: 8 }}>
          <View style={{ backgroundColor: `${color}1E`, borderRadius: 8, borderWidth: 1, borderColor: `${color}44`, paddingHorizontal: 10, paddingVertical: 4, minWidth: 56, alignItems: 'center' }}>
            <Text style={{ color, fontSize: 15, fontWeight: '900' }}>{row.pct}%</Text>
            <Text style={{ color, fontSize: 9, fontWeight: '700', opacity: 0.75 }}>{label}</Text>
          </View>

          <TouchableOpacity
            onPress={handleAdd}
            disabled={inSlip}
            activeOpacity={0.7}
            style={{ backgroundColor: inSlip ? 'rgba(80,200,130,0.12)' : 'rgba(255,120,40,0.10)', borderRadius: 8, borderWidth: 1, borderColor: inSlip ? 'rgba(80,200,130,0.35)' : 'rgba(255,120,40,0.30)', paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 3 }}
          >
            <Ionicons name={inSlip ? 'checkmark' : 'add'} size={12} color={inSlip ? '#50C882' : '#FF7828'} />
            <Text style={{ color: inSlip ? '#50C882' : '#FF7828', fontSize: 11, fontWeight: '800' }}>{inSlip ? 'Added' : 'Slip'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingLeft: 22 }}>
        <ProbBar pct={row.pct} color={color} />
      </View>
    </View>
  );
});

// ─── Pitcher K card ───────────────────────────────────────────────────────────

function PitcherKCard({
  pitcherId,
  pitcherName,
  pitcherTeam,
  opposingTeam,
  slip,
  onAdd,
}: {
  pitcherId: number;
  pitcherName: string;
  pitcherTeam: string;
  opposingTeam: string;
  slip: SlipEntry[];
  onAdd: (entry: SlipEntry) => void;
}) {
  const { data: stats, isLoading } = useQuery({
    queryKey: queryKeys.pitcher.stats(pitcherId),
    queryFn: () => fetchPitcherStats(pitcherId),
    enabled: !!pitcherId,
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <GlassCard style={{ padding: 20, marginBottom: 12, alignItems: 'center' }}>
        <ActivityIndicator color="#FF7828" />
      </GlassCard>
    );
  }
  if (!stats) return null;

  const ip = parseFloat(stats.inningsPitched) || 1;
  const k9 = (stats.strikeOuts / (ip / 9)).toFixed(1);
  const kProp = pitcherKLineProp(stats);
  const overKey = `${pitcherId}-p-k-over`;
  const underKey = `${pitcherId}-p-k-under`;
  const overInSlip = slip.some((s) => s.id === overKey);
  const underInSlip = slip.some((s) => s.id === underKey);

  return (
    <GlassCard style={{ padding: 18, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{pitcherName}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>{pitcherTeam} vs {opposingTeam}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {[
            { val: k9, lbl: 'K/9' },
            { val: stats.era, lbl: 'ERA' },
            { val: `${stats.wins}-${stats.losses}`, lbl: 'W-L' },
          ].map((item, i, arr) => (
            <View key={item.lbl} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#FF7828', fontSize: 14, fontWeight: '900' }}>{item.val}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 }}>{item.lbl}</Text>
              </View>
              {i < arr.length - 1 && <View style={{ width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.08)' }} />}
            </View>
          ))}
        </View>
      </View>

      {/* Projected line */}
      <View style={{ backgroundColor: 'rgba(255,120,40,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,120,40,0.20)', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View>
          <Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>PROJECTED LINE</Text>
          <Text style={{ color: '#FF7828', fontSize: 26, fontWeight: '900', marginTop: 2 }}>{kProp.line} Ks</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>AVG / START</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 2 }}>{kProp.projectedKs}</Text>
        </View>
      </View>

      {/* Over */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="arrow-up-circle" size={16} color="#50C882" />
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Over {kProp.line} Ks</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: '#50C882', fontSize: 16, fontWeight: '900' }}>{kProp.overPct}%</Text>
            <TouchableOpacity
              onPress={() => onAdd({ id: overKey, playerName: pitcherName, propType: "Pitcher K's", description: `${pitcherName} Over ${kProp.line} K's`, probability: kProp.overPct })}
              disabled={overInSlip}
              activeOpacity={0.7}
              style={{ backgroundColor: overInSlip ? 'rgba(80,200,130,0.15)' : 'rgba(80,200,130,0.08)', borderRadius: 8, borderWidth: 1, borderColor: overInSlip ? 'rgba(80,200,130,0.45)' : 'rgba(80,200,130,0.22)', paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 3 }}
            >
              <Ionicons name={overInSlip ? 'checkmark' : 'add'} size={12} color="#50C882" />
              <Text style={{ color: '#50C882', fontSize: 11, fontWeight: '800' }}>{overInSlip ? 'Added' : 'Over'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ProbBar pct={kProp.overPct} color="#50C882" />
      </View>

      {/* Under */}
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="arrow-down-circle" size={16} color="#EB505A" />
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Under {kProp.line} Ks</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: '#EB505A', fontSize: 16, fontWeight: '900' }}>{kProp.underPct}%</Text>
            <TouchableOpacity
              onPress={() => onAdd({ id: underKey, playerName: pitcherName, propType: "Pitcher K's", description: `${pitcherName} Under ${kProp.line} K's`, probability: kProp.underPct })}
              disabled={underInSlip}
              activeOpacity={0.7}
              style={{ backgroundColor: underInSlip ? 'rgba(235,80,90,0.15)' : 'rgba(235,80,90,0.07)', borderRadius: 8, borderWidth: 1, borderColor: underInSlip ? 'rgba(235,80,90,0.45)' : 'rgba(235,80,90,0.20)', paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 3 }}
            >
              <Ionicons name={underInSlip ? 'checkmark' : 'add'} size={12} color="#EB505A" />
              <Text style={{ color: '#EB505A', fontSize: 11, fontWeight: '800' }}>{underInSlip ? 'Added' : 'Under'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ProbBar pct={kProp.underPct} color="#EB505A" />
      </View>
    </GlassCard>
  );
}

// ─── Batter props content ─────────────────────────────────────────────────────

function BatterPropsContent({
  game,
  propType,
  slip,
  onAdd,
}: {
  game: Game;
  propType: PropType;
  slip: SlipEntry[];
  onAdd: (entry: SlipEntry) => void;
}) {
  const { data: homeBatters, isLoading: homeLoading } = useTeamBatters(game.teams.home.team.id);
  const { data: awayBatters, isLoading: awayLoading } = useTeamBatters(game.teams.away.team.id);

  const { data: homePitcherStats, isLoading: hpLoading } = useQuery({
    queryKey: queryKeys.pitcher.stats(game.teams.home.probablePitcher?.id ?? 0),
    queryFn: () => fetchPitcherStats(game.teams.home.probablePitcher!.id),
    enabled: !!game.teams.home.probablePitcher?.id,
    staleTime: 30 * 60 * 1000,
  });

  const { data: awayPitcherStats, isLoading: apLoading } = useQuery({
    queryKey: queryKeys.pitcher.stats(game.teams.away.probablePitcher?.id ?? 0),
    queryFn: () => fetchPitcherStats(game.teams.away.probablePitcher!.id),
    enabled: !!game.teams.away.probablePitcher?.id,
    staleTime: 30 * 60 * 1000,
  });

  const isLoading = homeLoading || awayLoading || hpLoading || apLoading;

  const rows = useMemo<BatterRow[]>(() => {
    if (!homeBatters || !awayBatters) return [];
    const hp = homePitcherStats;
    const ap = awayPitcherStats;
    if (!hp && !ap) return [];

    const hpName = game.teams.home.probablePitcher?.fullName ?? 'TBD';
    const apName = game.teams.away.probablePitcher?.fullName ?? 'TBD';

    function calcRow(b: RosterBatter, pitcher: PitcherStats, pitcherName: string): BatterRow {
      const ab = Math.max(b.stats.atBats ?? 1, 1);
      const avg = parseFloat(b.stats.avg) || 0.220;
      const avgStr = formatAvg(b.stats.avg);

      switch (propType) {
        case 'HR':
          return {
            batter: b, pitcherName,
            pct: Math.round(hrProbability(b.stats.homeRuns / ab, parseFloat(pitcher.era)) * 100),
            subStats: `${avgStr} AVG · ${b.stats.homeRuns} HR · ${b.stats.ops} OPS`,
          };
        case 'Hit':
          return {
            batter: b, pitcherName,
            pct: hitProbability(avg, parseFloat(pitcher.whip)),
            subStats: `${avgStr} AVG · ${b.stats.rbi} RBI · ${b.stats.ops} OPS`,
          };
        case '2+ Hits':
          return {
            batter: b, pitcherName,
            pct: twoHitsProbability(avg, parseFloat(pitcher.whip)),
            subStats: `${avgStr} AVG · ${b.stats.rbi} RBI · ${b.stats.ops} OPS`,
          };
        default:
          return { batter: b, pitcherName, pct: 0, subStats: '' };
      }
    }

    const result: BatterRow[] = [];
    if (hp) awayBatters.forEach((b) => result.push(calcRow(b, hp, hpName)));
    if (ap) homeBatters.forEach((b) => result.push(calcRow(b, ap, apName)));
    return result.filter((r) => r.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 22);
  }, [homeBatters, awayBatters, homePitcherStats, awayPitcherStats, propType, game]);

  if (isLoading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 48 }}>
        <ActivityIndicator color="#FF7828" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 12 }}>Loading lineup data…</Text>
      </View>
    );
  }

  if (!homePitcherStats && !awayPitcherStats) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 48 }}>
        <Ionicons name="person-outline" size={40} color="rgba(255,255,255,0.12)" />
        <Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
          Pitcher data unavailable for this matchup
        </Text>
      </View>
    );
  }

  return (
    <GlassCard style={{ padding: 16 }}>
      {rows.length === 0 ? (
        <Text style={{ color: 'rgba(255,255,255,0.32)', textAlign: 'center', padding: 20, fontSize: 13 }}>No batter data available</Text>
      ) : (
        rows.map((row, i) => (
          <BatterPropRow
            key={`${row.batter.id}-${propType}`}
            rank={i + 1}
            row={row}
            propType={propType}
            inSlip={slip.some((s) => s.id === `${row.batter.id}-${propType}`)}
            onAdd={onAdd}
          />
        ))
      )}
    </GlassCard>
  );
}

// ─── Pitcher K's content ──────────────────────────────────────────────────────

function PitcherKContent({ game, slip, onAdd }: { game: Game; slip: SlipEntry[]; onAdd: (e: SlipEntry) => void }) {
  const away = game.teams.away.probablePitcher;
  const home = game.teams.home.probablePitcher;

  if (!away && !home) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 48 }}>
        <Ionicons name="flash-outline" size={40} color="rgba(255,255,255,0.12)" />
        <Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
          No confirmed starters yet
        </Text>
      </View>
    );
  }

  return (
    <View>
      {away && (
        <PitcherKCard pitcherId={away.id} pitcherName={away.fullName} pitcherTeam={game.teams.away.team.name} opposingTeam={game.teams.home.team.name} slip={slip} onAdd={onAdd} />
      )}
      {home && (
        <PitcherKCard pitcherId={home.id} pitcherName={home.fullName} pitcherTeam={game.teams.home.team.name} opposingTeam={game.teams.away.team.name} slip={slip} onAdd={onAdd} />
      )}
    </View>
  );
}

// ─── Slip drawer ──────────────────────────────────────────────────────────────

function SlipDrawer({
  visible,
  slip,
  onClose,
  onRemove,
  onClear,
  onSaved,
}: {
  visible: boolean;
  slip: SlipEntry[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSaved: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { save } = useSavedSlips();
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const combined = combinedProbability(slip);
  const combinedStr = formatCombinedPct(combined);
  const impliedOdds = impliedAmericanOdds(combined);
  const visibleBar = Math.min(combined * 5, 100); // scale bar so tiny values are still visible

  const handleSave = useCallback(async () => {
    if (slip.length === 0) return;
    const newSlip = {
      id: `slip-${Date.now()}`,
      savedAt: new Date().toISOString(),
      legs: slip.map((e) => ({ ...e })),
      status: 'pending' as const,
    };
    await save(newSlip);
    setSaved(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaved(false);
      onSaved();
      onClose();
    }, 1400);
  }, [slip, save, onSaved, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.52)' }} activeOpacity={1} onPress={onClose} />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#111622',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          maxHeight: '85%',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.10)',
          paddingBottom: insets.bottom + 8,
        }}
      >
        {/* Handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.20)' }} />
        </View>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' }}>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900' }}>Your Slip</Text>
            <Text style={{ color: 'rgba(255,255,255,0.36)', fontSize: 12, marginTop: 2 }}>{slip.length} leg{slip.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {slip.length > 0 && (
              <TouchableOpacity onPress={onClear} activeOpacity={0.7} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(235,80,90,0.10)', borderWidth: 1, borderColor: 'rgba(235,80,90,0.25)' }}>
                <Text style={{ color: '#EB505A', fontSize: 13, fontWeight: '700' }}>Clear all</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.55)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Entries */}
        <Animated.ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 4 }} showsVerticalScrollIndicator={false}>
          {slip.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 44 }}>
              <Ionicons name="receipt-outline" size={42} color="rgba(255,255,255,0.10)" />
              <Text style={{ color: 'rgba(255,255,255,0.26)', fontSize: 14, marginTop: 14, textAlign: 'center', lineHeight: 20 }}>
                Tap "+ Slip" on any prop{'\n'}to start building
              </Text>
            </View>
          ) : (
            slip.map((entry) => (
              <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: propColor(entry.probability), marginRight: 12, flexShrink: 0 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{entry.description}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Text style={{ color: propColor(entry.probability), fontSize: 12, fontWeight: '800' }}>{entry.probability}%</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10 }}>·</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.36)', fontSize: 11 }}>{propLabel(entry.probability)}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => onRemove(entry.id)} activeOpacity={0.7} style={{ padding: 6 }}>
                  <Ionicons name="close" size={16} color="rgba(255,255,255,0.26)" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </Animated.ScrollView>

        {/* Combined probability + implied odds */}
        {slip.length > 1 && (
          <View style={{ marginHorizontal: 22, marginTop: 8 }}>
            <View style={{ padding: 16, backgroundColor: 'rgba(255,120,40,0.08)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,120,40,0.22)' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.48)', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>COMBINED PROBABILITY</Text>
                  <Text style={{ color: '#FF7828', fontSize: 26, fontWeight: '900', marginTop: 2 }}>{combinedStr}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, marginTop: 2 }}>{slip.length} legs combined</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>BREAK-EVEN ODDS</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 2 }}>{impliedOdds}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.26)', fontSize: 10, marginTop: 2 }}>min odds to profit</Text>
                </View>
              </View>
              <ProbBar pct={visibleBar} color="#FF7828" />
            </View>
          </View>
        )}

        {/* Save + disclaimer */}
        {slip.length > 0 && (
          <View style={{ paddingHorizontal: 22, paddingTop: 12 }}>
            <TouchableOpacity onPress={handleSave} disabled={saved} activeOpacity={0.85}>
              <LinearGradient
                colors={saved ? ['#50C882', '#3AA066'] : ['#FFA550', '#FF7828', '#C85014']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Ionicons name={saved ? 'checkmark-circle' : 'bookmark-outline'} size={18} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>
                  {saved ? 'Slip Saved!' : 'Save Slip'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 2 }}>
          <Text style={{ color: 'rgba(255,255,255,0.14)', fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
            For entertainment & educational purposes only.{'\n'}Not financial or betting advice.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PropsScreen() {
  const { data: games, isLoading } = useGames();
  const insets = useSafeAreaInsets();
  const { scrollHandler, scrollEventThrottle } = useTabBarScroll();

  const [selectedGamePk, setSelectedGamePk] = useState<number | null>(null);
  const [activeProp, setActiveProp] = useState<PropType>('HR');
  const [slip, setSlip] = useState<SlipEntry[]>([]);
  const [slipOpen, setSlipOpen] = useState(false);

  // FAB sits above the floating tab bar
  const tabBarBottomPos = insets.bottom > 0 ? insets.bottom + 6 : 18;
  const fabBottom = tabBarBottomPos + TAB_BAR_HEIGHT + 14;

  const gamesWithPitchers = useMemo(
    () => games?.filter((g) => g.teams.away.probablePitcher || g.teams.home.probablePitcher) ?? [],
    [games],
  );

  const selectedGame = useMemo(
    () =>
      selectedGamePk
        ? gamesWithPitchers.find((g) => g.gamePk === selectedGamePk) ?? gamesWithPitchers[0]
        : gamesWithPitchers[0],
    [selectedGamePk, gamesWithPitchers],
  );

  const addToSlip = useCallback((entry: SlipEntry) => {
    setSlip((prev) => (prev.some((e) => e.id === entry.id) ? prev : [...prev, entry]));
  }, []);

  const removeFromSlip = useCallback((id: string) => {
    setSlip((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearSlip = useCallback(() => setSlip([]), []);

  if (isLoading) {
    return (
      <AppBackground>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#FF7828" size="large" />
          <Text style={{ color: 'rgba(255,255,255,0.36)', fontSize: 13, marginTop: 12 }}>Loading prop data…</Text>
        </View>
      </AppBackground>
    );
  }

  if (gamesWithPitchers.length === 0) {
    return (
      <AppBackground>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="layers-outline" size={48} color="rgba(255,255,255,0.12)" />
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginTop: 16, textAlign: 'center', lineHeight: 22 }}>
            No confirmed pitchers yet.{'\n'}Check back closer to first pitch.
          </Text>
        </View>
      </AppBackground>
    );
  }

  const contentBottomPad = fabBottom + 52 + 20;

  return (
    <AppBackground>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={{ paddingBottom: contentBottomPad }}
      >
        {/* Header */}
        <View style={{ paddingTop: 60, paddingHorizontal: 18, paddingBottom: 18 }}>
          <Text style={{ color: 'rgba(255,255,255,0.36)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 }}>
            TODAY'S SLATE
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>
            Prop Builder
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.33)', fontSize: 13, marginTop: 4 }}>
            Build your slip with data-driven props
          </Text>
        </View>

        {/* Game dropdown */}
        <View style={{ paddingHorizontal: 18, marginBottom: 16 }}>
          <Text style={{ color: 'rgba(255,255,255,0.26)', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8 }}>
            SELECT GAME
          </Text>
          <GameDropdown
            games={gamesWithPitchers}
            selectedGame={selectedGame}
            onSelect={setSelectedGamePk}
          />
        </View>

        {/* Prop type pills */}
        <PropTypePills activeProp={activeProp} onChange={setActiveProp} />

        {/* Section label */}
        {(() => {
          const pt = PROP_TYPES.find((p) => p.id === activeProp);
          return (
            <View style={{ paddingHorizontal: 18, marginBottom: 12 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{pt?.label}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.33)', fontSize: 12, marginTop: 3 }}>{pt?.desc}</Text>
            </View>
          );
        })()}

        {/* Content */}
        <View style={{ paddingHorizontal: 18 }}>
          {selectedGame && activeProp !== "Pitcher K's" && (
            <BatterPropsContent game={selectedGame} propType={activeProp} slip={slip} onAdd={addToSlip} />
          )}
          {selectedGame && activeProp === "Pitcher K's" && (
            <PitcherKContent game={selectedGame} slip={slip} onAdd={addToSlip} />
          )}
        </View>

        {/* Disclaimer */}
        <Text style={{ color: 'rgba(255,255,255,0.13)', fontSize: 11, textAlign: 'center', paddingHorizontal: 24, paddingTop: 22, lineHeight: 16 }}>
          Probabilities are model estimates based on 2025 season stats.{'\n'}For educational use only — not betting advice.
        </Text>
      </Animated.ScrollView>

      {/* Floating slip FAB — sits above the tab bar */}
      {slip.length > 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: fabBottom,
            left: SW / 2 - 100,
            width: 200,
          }}
        >
          <TouchableOpacity onPress={() => setSlipOpen(true)} activeOpacity={0.85}>
            <LinearGradient
              colors={['#FFA550', '#FF7828', '#C85014']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                height: 52,
                borderRadius: 26,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                shadowColor: '#FF7828',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.55,
                shadowRadius: 20,
              }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>{slip.length}</Text>
              </View>
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>View Slip</Text>
              <Ionicons name="chevron-up" size={15} color="rgba(255,255,255,0.75)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <SlipDrawer
        visible={slipOpen}
        slip={slip}
        onClose={() => setSlipOpen(false)}
        onRemove={removeFromSlip}
        onClear={clearSlip}
        onSaved={clearSlip}
      />
    </AppBackground>
  );
}
