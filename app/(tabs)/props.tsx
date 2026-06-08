import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { PaywallGate } from '@/src/components/PaywallGate';
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
import { useDailySlips, type DailySlip } from '@/src/hooks/useDailySlips';
import { TAB_BAR_HEIGHT } from '@/src/components/LiquidGlassTabBar';
import { fetchPitcherStats, type Game, type PitcherStats, type RosterBatter } from '@/src/api/mlb';
import { queryKeys } from '@/src/constants/queryKeys';
import { TEAM_DISPLAY_ABBR } from '@/src/utils/mlbImages';
import { impliedAmericanOdds, formatCombinedPct } from '@/src/storage/slipStorage';
import {
  hitProbability,
  twoHitsProbability,
  hrNukeProbability,
  hrHotFlag,
  hrDueFlag,
  pitcherKLineProp,
  firstInningProp,
  buildGamePrediction,
} from '@/src/utils/predictions';

const { width: SW } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type PropType = 'HR' | 'Hit' | '2+ Hits' | "Pitcher K's" | '1st Inn O/U' | 'Moneyline';
type ScreenView = 'dashboard' | 'builder';

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
  isHot?: boolean;
  isDue?: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PROP_TYPES: { id: PropType; icon: string; label: string; desc: string }[] = [
  { id: 'HR',           icon: 'flame-outline',       label: 'Home Run',     desc: 'HR probability vs opposing pitcher (HR Nuke model)' },
  { id: 'Hit',          icon: 'baseball-outline',     label: '1+ Hit',       desc: 'Probability of recording at least 1 hit' },
  { id: '2+ Hits',      icon: 'layers-outline',       label: '2+ Hits',      desc: 'Probability of recording 2 or more hits' },
  { id: "Pitcher K's",  icon: 'flash-outline',        label: "Pitcher K's",  desc: 'Projected strikeout line with over/under' },
  { id: '1st Inn O/U',  icon: 'timer-outline',        label: '1st Inn O/U',  desc: 'Over/Under 0.5 runs scored in the 1st inning' },
  { id: 'Moneyline',    icon: 'trophy-outline',       label: 'Moneyline',    desc: 'Win prediction based on Edge Report model' },
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
  return new Date(game.gameDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ─── Prob bar ─────────────────────────────────────────────────────────────────

function ProbBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 2, backgroundColor: color }} />
    </View>
  );
}

// ─── View toggle ─────────────────────────────────────────────────────────────

function ViewToggle({ active, onChange }: { active: ScreenView; onChange: (v: ScreenView) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, marginHorizontal: 18, marginBottom: 16 }}>
      {(['dashboard', 'builder'] as ScreenView[]).map((v) => {
        const isActive = active === v;
        return (
          <TouchableOpacity
            key={v}
            onPress={() => onChange(v)}
            activeOpacity={0.75}
            style={{ flex: 1 }}
          >
            {isActive ? (
              <LinearGradient
                colors={['#FFA550', '#FF7828']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 9, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              >
                <Ionicons name={v === 'dashboard' ? 'flash' : 'build'} size={13} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>
                  {v === 'dashboard' ? 'Dashboard' : 'Builder'}
                </Text>
              </LinearGradient>
            ) : (
              <View style={{ paddingVertical: 9, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Ionicons name={v === 'dashboard' ? 'flash-outline' : 'build-outline'} size={13} color="rgba(255,255,255,0.40)" />
                <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: 13, fontWeight: '600' }}>
                  {v === 'dashboard' ? 'Dashboard' : 'Builder'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Game dropdown ────────────────────────────────────────────────────────────

function GameDropdown({ games, selectedGame, onSelect }: { games: Game[]; selectedGame: Game | undefined; onSelect: (pk: number) => void }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const awayAbbr = selectedGame ? TEAM_DISPLAY_ABBR[selectedGame.teams.away.team.id] ?? selectedGame.teams.away.team.name.split(' ').pop()! : '—';
  const homeAbbr = selectedGame ? TEAM_DISPLAY_ABBR[selectedGame.teams.home.team.id] ?? selectedGame.teams.home.team.name.split(' ').pop()! : '—';
  const isLive = selectedGame?.status.detailedState === 'In Progress';

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.8}>
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 }}>
            {isLive && <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#EB505A', marginRight: 10 }} />}
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
            <View style={{ marginLeft: 10 }}><Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.35)" /></View>
          </View>
        </GlassCard>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#111622', borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', paddingBottom: insets.bottom + 12, maxHeight: '75%' }}>
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 6 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)' }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>Select Game</Text>
            <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={0.7} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
          <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}>
            {games.map((g) => {
              const isSelected = g.gamePk === selectedGame?.gamePk;
              const aA = TEAM_DISPLAY_ABBR[g.teams.away.team.id] ?? g.teams.away.team.name.split(' ').pop()!;
              const hA = TEAM_DISPLAY_ABBR[g.teams.home.team.id] ?? g.teams.home.team.name.split(' ').pop()!;
              const live = g.status.detailedState === 'In Progress';
              return (
                <TouchableOpacity key={g.gamePk} onPress={() => { onSelect(g.gamePk); setOpen(false); }} activeOpacity={0.75} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: isSelected ? 'rgba(255,120,40,0.40)' : 'rgba(255,255,255,0.08)', backgroundColor: isSelected ? 'rgba(255,120,40,0.10)' : 'rgba(255,255,255,0.04)' }}>
                    <TeamLogo teamId={g.teams.away.team.id} teamName={g.teams.away.team.name} size={32} />
                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {live && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EB505A' }} />}
                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>{aA} <Text style={{ color: 'rgba(255,255,255,0.35)', fontWeight: '400' }}>@</Text> {hA}</Text>
                        <Text style={{ color: live ? '#EB505A' : 'rgba(255,255,255,0.35)', fontSize: 11, marginLeft: 'auto' as any }}>{gameTimeLabel(g)}</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 3 }} numberOfLines={1}>{g.teams.away.probablePitcher?.fullName ?? 'TBD'} vs {g.teams.home.probablePitcher?.fullName ?? 'TBD'}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10, marginTop: 2 }}>{g.venue.name}</Text>
                    </View>
                    <TeamLogo teamId={g.teams.home.team.id} teamName={g.teams.home.team.name} size={32} />
                    {isSelected && <View style={{ marginLeft: 10 }}><Ionicons name="checkmark-circle" size={18} color="#FF7828" /></View>}
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

// ─── Prop type pills ──────────────────────────────────────────────────────────

function PropTypePills({ activeProp, onChange }: { activeProp: PropType; onChange: (p: PropType) => void }) {
  const rows = [PROP_TYPES.slice(0, 2), PROP_TYPES.slice(2, 4), PROP_TYPES.slice(4, 6)];
  return (
    <View style={{ paddingHorizontal: 18, gap: 8, marginBottom: 16 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((pt) => {
            const active = activeProp === pt.id;
            return (
              <TouchableOpacity key={pt.id} onPress={() => onChange(pt.id)} activeOpacity={0.75} style={{ flex: 1 }}>
                {active ? (
                  <LinearGradient colors={['#FFA550', '#FF7828']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Ionicons name={pt.icon as any} size={14} color="#FFF" />
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }} numberOfLines={1}>{pt.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={{ paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' }}>
                    <Ionicons name={pt.icon as any} size={14} color="rgba(255,255,255,0.35)" />
                    <Text style={{ color: 'rgba(255,255,255,0.50)', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{pt.label}</Text>
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

const BatterPropRow = memo(function BatterPropRow({ rank, row, propType, inSlip, onAdd }: { rank: number; row: BatterRow; propType: PropType; inSlip: boolean; onAdd: (entry: SlipEntry) => void }) {
  const color = propColor(row.pct);
  const label = propLabel(row.pct);

  const handleAdd = useCallback(() => {
    onAdd({ id: `${row.batter.id}-${propType}`, playerName: row.batter.fullName, propType, description: `${row.batter.fullName} ${propType} vs ${row.pitcherName}`, probability: row.pct });
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
            {/* HOT badge */}
            {row.isHot && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,120,40,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,120,40,0.40)' }}>
                <Ionicons name="flame" size={9} color="#FF7828" />
                <Text style={{ color: '#FF7828', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>HOT</Text>
              </View>
            )}
            {/* DUE badge */}
            {row.isDue && !row.isHot && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(129,140,248,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(129,140,248,0.40)' }}>
                <Ionicons name="time" size={9} color="#818cf8" />
                <Text style={{ color: '#818cf8', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>DUE</Text>
              </View>
            )}
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.36)', fontSize: 11, marginTop: 1 }} numberOfLines={1}>{row.subStats}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.20)', fontSize: 10, marginTop: 1 }} numberOfLines={1}>vs {row.pitcherName}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 5, marginLeft: 8 }}>
          <View style={{ backgroundColor: `${color}1E`, borderRadius: 8, borderWidth: 1, borderColor: `${color}44`, paddingHorizontal: 10, paddingVertical: 4, minWidth: 56, alignItems: 'center' }}>
            <Text style={{ color, fontSize: 15, fontWeight: '900' }}>{row.pct}%</Text>
            <Text style={{ color, fontSize: 9, fontWeight: '700', opacity: 0.75 }}>{label}</Text>
          </View>
          <TouchableOpacity onPress={handleAdd} disabled={inSlip} activeOpacity={0.7} style={{ backgroundColor: inSlip ? 'rgba(80,200,130,0.12)' : 'rgba(255,120,40,0.10)', borderRadius: 8, borderWidth: 1, borderColor: inSlip ? 'rgba(80,200,130,0.35)' : 'rgba(255,120,40,0.30)', paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
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

function PitcherKCard({ pitcherId, pitcherName, pitcherTeam, opposingTeam, slip, onAdd }: { pitcherId: number; pitcherName: string; pitcherTeam: string; opposingTeam: string; slip: SlipEntry[]; onAdd: (entry: SlipEntry) => void }) {
  const { data: stats, isLoading } = useQuery({ queryKey: queryKeys.pitcher.stats(pitcherId), queryFn: () => fetchPitcherStats(pitcherId), enabled: !!pitcherId, staleTime: 30 * 60 * 1000 });
  if (isLoading) return <GlassCard style={{ padding: 20, marginBottom: 12, alignItems: 'center' }}><ActivityIndicator color="#FF7828" /></GlassCard>;
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
          {[{ val: k9, lbl: 'K/9' }, { val: stats.era, lbl: 'ERA' }, { val: `${stats.wins}-${stats.losses}`, lbl: 'W-L' }].map((item, i, arr) => (
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
      {[
        { key: overKey, inSlip: overInSlip, icon: 'arrow-up-circle' as const, color: '#50C882', pct: kProp.overPct, label: `Over ${kProp.line} Ks`, desc: `${pitcherName} Over ${kProp.line} K's` },
        { key: underKey, inSlip: underInSlip, icon: 'arrow-down-circle' as const, color: '#EB505A', pct: kProp.underPct, label: `Under ${kProp.line} Ks`, desc: `${pitcherName} Under ${kProp.line} K's` },
      ].map((side) => (
        <View key={side.key} style={{ marginBottom: side.key === overKey ? 12 : 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={side.icon} size={16} color={side.color} />
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>{side.label}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: side.color, fontSize: 16, fontWeight: '900' }}>{side.pct}%</Text>
              <TouchableOpacity onPress={() => onAdd({ id: side.key, playerName: pitcherName, propType: "Pitcher K's", description: side.desc, probability: side.pct })} disabled={side.inSlip} activeOpacity={0.7} style={{ backgroundColor: side.inSlip ? `${side.color}26` : `${side.color}14`, borderRadius: 8, borderWidth: 1, borderColor: side.inSlip ? `${side.color}70` : `${side.color}38`, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name={side.inSlip ? 'checkmark' : 'add'} size={12} color={side.color} />
                <Text style={{ color: side.color, fontSize: 11, fontWeight: '800' }}>{side.inSlip ? 'Added' : side.key === overKey ? 'Over' : 'Under'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ProbBar pct={side.pct} color={side.color} />
        </View>
      ))}
    </GlassCard>
  );
}

// ─── First Inning O/U card ────────────────────────────────────────────────────

function FirstInningCard({ pitcherId, pitcherName, pitcherTeam, opposingTeam, opposingBatters, slip, onAdd }: { pitcherId: number; pitcherName: string; pitcherTeam: string; opposingTeam: string; opposingBatters: RosterBatter[]; slip: SlipEntry[]; onAdd: (entry: SlipEntry) => void }) {
  const { data: stats, isLoading } = useQuery({ queryKey: queryKeys.pitcher.stats(pitcherId), queryFn: () => fetchPitcherStats(pitcherId), enabled: !!pitcherId, staleTime: 30 * 60 * 1000 });
  if (isLoading) return <GlassCard style={{ padding: 20, marginBottom: 12, alignItems: 'center' }}><ActivityIndicator color="#FF7828" /></GlassCard>;
  if (!stats) return null;

  // Compute opposing team avg from top 4 batters (leadoff-ish)
  const teamAvg = opposingBatters.length > 0
    ? opposingBatters.slice(0, 4).reduce((acc, b) => acc + (parseFloat(b.stats.avg) || 0.245), 0) / Math.min(opposingBatters.length, 4)
    : 0.245;

  const { overPct, underPct } = firstInningProp(stats, teamAvg);
  const overKey = `${pitcherId}-1st-over`;
  const underKey = `${pitcherId}-1st-under`;
  const overInSlip = slip.some((s) => s.id === overKey);
  const underInSlip = slip.some((s) => s.id === underKey);

  return (
    <GlassCard style={{ padding: 18, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <View style={{ backgroundColor: 'rgba(129,140,248,0.15)', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(129,140,248,0.30)' }}>
              <Text style={{ color: '#818cf8', fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>1ST INNING</Text>
            </View>
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{pitcherName}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>{pitcherTeam} vs {opposingTeam}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>LINE</Text>
          <Text style={{ color: '#818cf8', fontSize: 20, fontWeight: '900', marginTop: 1 }}>0.5 Runs</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {[{ val: stats.era, lbl: 'ERA' }, { val: stats.whip, lbl: 'WHIP' }, { val: `${stats.wins}-${stats.losses}`, lbl: 'W-L' }].map((item, i, arr) => (
          <View key={item.lbl} style={{ flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingVertical: 8 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>{item.val}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 }}>{item.lbl}</Text>
          </View>
        ))}
      </View>

      {[
        { key: overKey, inSlip: overInSlip, icon: 'arrow-up-circle' as const, color: '#50C882', pct: overPct, label: 'Over 0.5 Runs', desc: `${pitcherName} game — Over 0.5 1st Inn Runs` },
        { key: underKey, inSlip: underInSlip, icon: 'arrow-down-circle' as const, color: '#EB505A', pct: underPct, label: 'Under 0.5 Runs', desc: `${pitcherName} game — Under 0.5 1st Inn Runs` },
      ].map((side) => (
        <View key={side.key} style={{ marginBottom: side.key === overKey ? 12 : 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={side.icon} size={16} color={side.color} />
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>{side.label}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: side.color, fontSize: 16, fontWeight: '900' }}>{side.pct}%</Text>
              <TouchableOpacity onPress={() => onAdd({ id: side.key, playerName: pitcherName, propType: '1st Inn O/U', description: side.desc, probability: side.pct })} disabled={side.inSlip} activeOpacity={0.7} style={{ backgroundColor: side.inSlip ? `${side.color}26` : `${side.color}14`, borderRadius: 8, borderWidth: 1, borderColor: side.inSlip ? `${side.color}70` : `${side.color}38`, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name={side.inSlip ? 'checkmark' : 'add'} size={12} color={side.color} />
                <Text style={{ color: side.color, fontSize: 11, fontWeight: '800' }}>{side.inSlip ? 'Added' : side.key === overKey ? 'Over' : 'Under'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ProbBar pct={side.pct} color={side.color} />
        </View>
      ))}
    </GlassCard>
  );
}

// ─── Moneyline card ───────────────────────────────────────────────────────────

function MoneylineCard({ game, slip, onAdd }: { game: Game; slip: SlipEntry[]; onAdd: (entry: SlipEntry) => void }) {
  const homePitcherId = game.teams.home.probablePitcher?.id ?? 0;
  const awayPitcherId = game.teams.away.probablePitcher?.id ?? 0;
  const { data: hpStats, isLoading: hpLoading } = useQuery({ queryKey: queryKeys.pitcher.stats(homePitcherId), queryFn: () => fetchPitcherStats(homePitcherId), enabled: !!homePitcherId, staleTime: 30 * 60 * 1000 });
  const { data: apStats, isLoading: apLoading } = useQuery({ queryKey: queryKeys.pitcher.stats(awayPitcherId), queryFn: () => fetchPitcherStats(awayPitcherId), enabled: !!awayPitcherId, staleTime: 30 * 60 * 1000 });

  if (hpLoading || apLoading) return <GlassCard style={{ padding: 20, marginBottom: 12, alignItems: 'center' }}><ActivityIndicator color="#FF7828" /></GlassCard>;
  if (!hpStats || !apStats) return null;

  const pred = buildGamePrediction(hpStats, apStats, game.teams.home.team.name, game.teams.away.team.name);
  const homeAbbr = TEAM_DISPLAY_ABBR[game.teams.home.team.id] ?? game.teams.home.team.name.split(' ').pop()!;
  const awayAbbr = TEAM_DISPLAY_ABBR[game.teams.away.team.id] ?? game.teams.away.team.name.split(' ').pop()!;
  const homeKey = `${game.gamePk}-ml-home`;
  const awayKey = `${game.gamePk}-ml-away`;
  const homeInSlip = slip.some((s) => s.id === homeKey);
  const awayInSlip = slip.some((s) => s.id === awayKey);

  const confidenceColor = pred.confidence === 'High' ? '#50C882' : pred.confidence === 'Medium' ? '#FF7828' : 'rgba(255,255,255,0.35)';

  return (
    <GlassCard style={{ padding: 18, marginBottom: 14 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ backgroundColor: 'rgba(255,120,40,0.12)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,120,40,0.28)', marginRight: 10 }}>
          <Text style={{ color: '#FF7828', fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>MONEYLINE</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
            {awayAbbr} @ {homeAbbr}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 }}>
            {game.teams.away.probablePitcher?.fullName ?? 'TBD'} vs {game.teams.home.probablePitcher?.fullName ?? 'TBD'}
          </Text>
        </View>
        <View style={{ alignItems: 'center', backgroundColor: `${confidenceColor}18`, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: `${confidenceColor}30` }}>
          <Text style={{ color: confidenceColor, fontSize: 11, fontWeight: '900' }}>{pred.confidence}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 9, fontWeight: '700', marginTop: 1 }}>CONF.</Text>
        </View>
      </View>

      {/* Win prediction bars */}
      {[
        { key: awayKey, name: game.teams.away.team.name, abbr: awayAbbr, teamId: game.teams.away.team.id, pct: pred.awayWinPct, inSlip: awayInSlip, isWinner: pred.predictedWinner === game.teams.away.team.name },
        { key: homeKey, name: game.teams.home.team.name, abbr: homeAbbr, teamId: game.teams.home.team.id, pct: pred.homeWinPct, inSlip: homeInSlip, isWinner: pred.predictedWinner === game.teams.home.team.name },
      ].map((team) => {
        const color = team.isWinner ? '#50C882' : 'rgba(255,255,255,0.40)';
        return (
          <View key={team.key} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TeamLogo teamId={team.teamId} teamName={team.name} size={28} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>{team.abbr}</Text>
                  {team.isWinner && (
                    <View style={{ backgroundColor: 'rgba(80,200,130,0.15)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(80,200,130,0.35)' }}>
                      <Text style={{ color: '#50C882', fontSize: 9, fontWeight: '900' }}>PICK</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={{ color, fontSize: 18, fontWeight: '900', marginRight: 10 }}>{team.pct}%</Text>
              <TouchableOpacity onPress={() => onAdd({ id: team.key, playerName: team.name, propType: 'Moneyline', description: `${team.name} Moneyline Win`, probability: team.pct })} disabled={team.inSlip} activeOpacity={0.7} style={{ backgroundColor: team.inSlip ? 'rgba(80,200,130,0.12)' : 'rgba(255,120,40,0.10)', borderRadius: 8, borderWidth: 1, borderColor: team.inSlip ? 'rgba(80,200,130,0.35)' : 'rgba(255,120,40,0.30)', paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name={team.inSlip ? 'checkmark' : 'add'} size={12} color={team.inSlip ? '#50C882' : '#FF7828'} />
                <Text style={{ color: team.inSlip ? '#50C882' : '#FF7828', fontSize: 11, fontWeight: '800' }}>{team.inSlip ? 'Added' : 'Slip'}</Text>
              </TouchableOpacity>
            </View>
            <ProbBar pct={team.pct} color={team.isWinner ? '#50C882' : 'rgba(255,255,255,0.22)'} />
          </View>
        );
      })}

      {/* Top factor */}
      {pred.factors[0] && (
        <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 3 }}>KEY FACTOR</Text>
          <Text style={{ color: 'rgba(255,255,255,0.60)', fontSize: 12, lineHeight: 17 }}>{pred.factors[0].detail}</Text>
        </View>
      )}
    </GlassCard>
  );
}

// ─── Content components ───────────────────────────────────────────────────────

function BatterPropsContent({ game, propType, slip, onAdd }: { game: Game; propType: PropType; slip: SlipEntry[]; onAdd: (entry: SlipEntry) => void }) {
  const { data: homeBatters, isLoading: homeLoading } = useTeamBatters(game.teams.home.team.id);
  const { data: awayBatters, isLoading: awayLoading } = useTeamBatters(game.teams.away.team.id);
  const { data: hpStats, isLoading: hpLoading } = useQuery({ queryKey: queryKeys.pitcher.stats(game.teams.home.probablePitcher?.id ?? 0), queryFn: () => fetchPitcherStats(game.teams.home.probablePitcher!.id), enabled: !!game.teams.home.probablePitcher?.id, staleTime: 30 * 60 * 1000 });
  const { data: apStats, isLoading: apLoading } = useQuery({ queryKey: queryKeys.pitcher.stats(game.teams.away.probablePitcher?.id ?? 0), queryFn: () => fetchPitcherStats(game.teams.away.probablePitcher!.id), enabled: !!game.teams.away.probablePitcher?.id, staleTime: 30 * 60 * 1000 });

  const isLoading = homeLoading || awayLoading || hpLoading || apLoading;
  const hpName = game.teams.home.probablePitcher?.fullName ?? 'TBD';
  const apName = game.teams.away.probablePitcher?.fullName ?? 'TBD';

  const rows = useMemo<BatterRow[]>(() => {
    if (!homeBatters || !awayBatters) return [];
    const hp = hpStats; const ap = apStats;
    if (!hp && !ap) return [];

    function calcRow(b: RosterBatter, pitcher: PitcherStats, pitcherName: string): BatterRow {
      const ab = Math.max(b.stats.atBats ?? 1, 1);
      const avg = parseFloat(b.stats.avg) || 0.220;
      const avgStr = formatAvg(b.stats.avg);
      const ops = b.stats.ops;
      const era = pitcher.era;

      if (propType === 'HR') {
        const pct = hrNukeProbability(b.stats.homeRuns / ab, era, ops);
        return {
          batter: b, pitcherName,
          pct,
          subStats: `${avgStr} AVG · ${b.stats.homeRuns} HR · ${ops} OPS`,
          isHot: hrHotFlag(pct, ops, era),
          isDue: hrDueFlag(b.stats.homeRuns / ab, ops, b.stats.atBats ?? 0),
        };
      }
      if (propType === 'Hit') {
        return { batter: b, pitcherName, pct: hitProbability(avg, parseFloat(pitcher.whip)), subStats: `${avgStr} AVG · ${b.stats.rbi} RBI · ${ops} OPS` };
      }
      if (propType === '2+ Hits') {
        return { batter: b, pitcherName, pct: twoHitsProbability(avg, parseFloat(pitcher.whip)), subStats: `${avgStr} AVG · ${b.stats.rbi} RBI · ${ops} OPS` };
      }
      return { batter: b, pitcherName, pct: 0, subStats: '' };
    }

    const result: BatterRow[] = [];
    if (hp) awayBatters.forEach((b) => result.push(calcRow(b, hp, hpName)));
    if (ap) homeBatters.forEach((b) => result.push(calcRow(b, ap, apName)));
    return result.filter((r) => r.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 22);
  }, [homeBatters, awayBatters, hpStats, apStats, propType, hpName, apName]);

  if (isLoading) return <View style={{ alignItems: 'center', paddingVertical: 48 }}><ActivityIndicator color="#FF7828" size="large" /><Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 12 }}>Loading lineup data…</Text></View>;
  if (!hpStats && !apStats) return <View style={{ alignItems: 'center', paddingVertical: 48 }}><Ionicons name="person-outline" size={40} color="rgba(255,255,255,0.12)" /><Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 14, marginTop: 12, textAlign: 'center' }}>Pitcher data unavailable for this matchup</Text></View>;

  return (
    <GlassCard style={{ padding: 16 }}>
      {propType === 'HR' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="flame" size={10} color="#FF7828" />
            <Text style={{ color: '#FF7828', fontSize: 10, fontWeight: '800' }}>HOT</Text>
            <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 10 }}> = A+/A matchup grade</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10 }}>·</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="time" size={10} color="#818cf8" />
            <Text style={{ color: '#818cf8', fontSize: 10, fontWeight: '800' }}>DUE</Text>
            <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 10 }}> = overdue by power model</Text>
          </View>
        </View>
      )}
      {rows.length === 0 ? (
        <Text style={{ color: 'rgba(255,255,255,0.32)', textAlign: 'center', padding: 20, fontSize: 13 }}>No batter data available</Text>
      ) : (
        rows.map((row, i) => (
          <BatterPropRow key={`${row.batter.id}-${propType}`} rank={i + 1} row={row} propType={propType} inSlip={slip.some((s) => s.id === `${row.batter.id}-${propType}`)} onAdd={onAdd} />
        ))
      )}
    </GlassCard>
  );
}

function PitcherKContent({ game, slip, onAdd }: { game: Game; slip: SlipEntry[]; onAdd: (e: SlipEntry) => void }) {
  const away = game.teams.away.probablePitcher;
  const home = game.teams.home.probablePitcher;
  if (!away && !home) return <View style={{ alignItems: 'center', paddingVertical: 48 }}><Ionicons name="flash-outline" size={40} color="rgba(255,255,255,0.12)" /><Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 14, marginTop: 12, textAlign: 'center' }}>No confirmed starters yet</Text></View>;
  return (
    <View>
      {away && <PitcherKCard pitcherId={away.id} pitcherName={away.fullName} pitcherTeam={game.teams.away.team.name} opposingTeam={game.teams.home.team.name} slip={slip} onAdd={onAdd} />}
      {home && <PitcherKCard pitcherId={home.id} pitcherName={home.fullName} pitcherTeam={game.teams.home.team.name} opposingTeam={game.teams.away.team.name} slip={slip} onAdd={onAdd} />}
    </View>
  );
}

function FirstInningContent({ game, slip, onAdd }: { game: Game; slip: SlipEntry[]; onAdd: (e: SlipEntry) => void }) {
  const { data: homeBatters } = useTeamBatters(game.teams.home.team.id);
  const { data: awayBatters } = useTeamBatters(game.teams.away.team.id);
  const away = game.teams.away.probablePitcher;
  const home = game.teams.home.probablePitcher;
  if (!away && !home) return <View style={{ alignItems: 'center', paddingVertical: 48 }}><Ionicons name="timer-outline" size={40} color="rgba(255,255,255,0.12)" /><Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 14, marginTop: 12, textAlign: 'center' }}>No confirmed starters yet</Text></View>;
  return (
    <View>
      {away && <FirstInningCard pitcherId={away.id} pitcherName={away.fullName} pitcherTeam={game.teams.away.team.name} opposingTeam={game.teams.home.team.name} opposingBatters={homeBatters ?? []} slip={slip} onAdd={onAdd} />}
      {home && <FirstInningCard pitcherId={home.id} pitcherName={home.fullName} pitcherTeam={game.teams.home.team.name} opposingTeam={game.teams.away.team.name} opposingBatters={awayBatters ?? []} slip={slip} onAdd={onAdd} />}
    </View>
  );
}

function MoneylineContent({ game, slip, onAdd }: { game: Game; slip: SlipEntry[]; onAdd: (e: SlipEntry) => void }) {
  if (!game.teams.home.probablePitcher || !game.teams.away.probablePitcher) return <View style={{ alignItems: 'center', paddingVertical: 48 }}><Ionicons name="trophy-outline" size={40} color="rgba(255,255,255,0.12)" /><Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 14, marginTop: 12, textAlign: 'center' }}>Both starting pitchers must be confirmed</Text></View>;
  return <MoneylineCard game={game} slip={slip} onAdd={onAdd} />;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DailySlipCard({ dailySlip, onSave, onSwitchBuilder }: { dailySlip: DailySlip; onSave: (s: DailySlip) => void; onSwitchBuilder: () => void }) {
  const [saved, setSaved] = useState(false);
  const isSafe = dailySlip.tier === 'safe';
  const tierColor = isSafe ? '#50C882' : '#FF7828';
  const tierBg = isSafe ? 'rgba(80,200,130,0.08)' : 'rgba(255,120,40,0.08)';
  const tierBorder = isSafe ? 'rgba(80,200,130,0.20)' : 'rgba(255,120,40,0.20)';

  const handleSave = useCallback(() => {
    onSave(dailySlip);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  }, [dailySlip, onSave]);

  return (
    <GlassCard style={{ padding: 16, marginBottom: 12, borderColor: tierBorder }}>
      {/* Title row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900' }}>{dailySlip.label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <Ionicons name={isSafe ? 'shield-checkmark' : 'star'} size={11} color={tierColor} />
            <Text style={{ color: tierColor, fontSize: 11, fontWeight: '700' }}>
              {isSafe ? 'Safe Pick' : 'Long Shot'} · {dailySlip.legCount} legs
            </Text>
          </View>
        </View>
        <View style={{ backgroundColor: tierBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: tierBorder }}>
          <Text style={{ color: tierColor, fontSize: 15, fontWeight: '900' }}>{dailySlip.combinedPct.toFixed(1)}%</Text>
          <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 1 }}>COMBINED</Text>
        </View>
      </View>

      {/* Legs */}
      <View style={{ marginBottom: 12 }}>
        {dailySlip.legs.map((leg) => (
          <View key={leg.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: propColor(leg.probability), marginRight: 8 }} />
            <Text style={{ flex: 1, color: 'rgba(255,255,255,0.70)', fontSize: 11, fontWeight: '600' }} numberOfLines={1}>{leg.description}</Text>
            <Text style={{ color: propColor(leg.probability), fontSize: 11, fontWeight: '800', marginLeft: 6 }}>{leg.probability}%</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={handleSave} disabled={saved} activeOpacity={0.85} style={{ flex: 1 }}>
          <LinearGradient
            colors={saved ? ['#50C882', '#3AA066'] : isSafe ? ['#50C882', '#3AA066'] : ['#FFA550', '#FF7828']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ height: 40, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Ionicons name={saved ? 'checkmark-circle' : 'bookmark-outline'} size={14} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>{saved ? 'Saved!' : 'Save to Tracker'}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSwitchBuilder} activeOpacity={0.75} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="expand-outline" size={16} color="rgba(255,255,255,0.50)" />
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

function DashboardView({ games, onSwitchBuilder }: { games: Game[]; onSwitchBuilder: () => void }) {
  const { data: slips, isLoading } = useDailySlips(games);
  const { save } = useSavedSlips();

  const handleSave = useCallback(async (ds: DailySlip) => {
    await save({
      id: `ds-${ds.id}-${Date.now()}`,
      savedAt: new Date().toISOString(),
      legs: ds.legs.map((l) => ({ ...l })),
      status: 'pending',
    });
  }, [save]);

  if (isLoading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 60 }}>
        <ActivityIndicator color="#FF7828" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginTop: 16, textAlign: 'center' }}>Building today's picks…</Text>
        <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>Analyzing {games.length} games across all matchups</Text>
      </View>
    );
  }

  if (!slips || slips.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 60 }}>
        <Ionicons name="analytics-outline" size={44} color="rgba(255,255,255,0.12)" />
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginTop: 16, textAlign: 'center' }}>Not enough data yet</Text>
        <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, marginTop: 6, textAlign: 'center' }}>Check back once pitchers are confirmed</Text>
      </View>
    );
  }

  const safeSlips = slips.filter(s => s.tier === 'safe');
  const longshotSlips = slips.filter(s => s.tier === 'longshot');

  return (
    <View style={{ paddingHorizontal: 18 }}>
      {/* Safe section */}
      {safeSlips.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: '#50C882' }} />
            <Ionicons name="shield-checkmark" size={13} color="#50C882" />
            <Text style={{ color: '#50C882', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }}>SAFE PICKS</Text>
            <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10 }}>High-probability parlays</Text>
          </View>
          {safeSlips.map((s) => <DailySlipCard key={s.id} dailySlip={s} onSave={handleSave} onSwitchBuilder={onSwitchBuilder} />)}
        </>
      )}

      {/* Long shot section */}
      {longshotSlips.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: safeSlips.length > 0 ? 8 : 0 }}>
            <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: '#FF7828' }} />
            <Ionicons name="star" size={13} color="#FF7828" />
            <Text style={{ color: '#FF7828', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }}>LONG SHOTS</Text>
            <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10 }}>Higher risk, higher reward</Text>
          </View>
          {longshotSlips.map((s) => <DailySlipCard key={s.id} dailySlip={s} onSave={handleSave} onSwitchBuilder={onSwitchBuilder} />)}
        </>
      )}

      <Text style={{ color: 'rgba(255,255,255,0.13)', fontSize: 11, textAlign: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8, lineHeight: 16 }}>
        Parlays built from model probabilities.{'\n'}For educational use only — not betting advice.
      </Text>
    </View>
  );
}

// ─── Slip drawer ──────────────────────────────────────────────────────────────

function SlipDrawer({ visible, slip, onClose, onRemove, onClear, onSaved }: { visible: boolean; slip: SlipEntry[]; onClose: () => void; onRemove: (id: string) => void; onClear: () => void; onSaved: () => void }) {
  const insets = useSafeAreaInsets();
  const { save } = useSavedSlips();
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const combined = combinedProbability(slip);
  const combinedStr = formatCombinedPct(combined);
  const impliedOdds = impliedAmericanOdds(combined);
  const visibleBar = Math.min(combined * 5, 100);

  const handleSave = useCallback(async () => {
    if (slip.length === 0) return;
    await save({ id: `slip-${Date.now()}`, savedAt: new Date().toISOString(), legs: slip.map((e) => ({ ...e })), status: 'pending' });
    setSaved(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { setSaved(false); onSaved(); onClose(); }, 1400);
  }, [slip, save, onSaved, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.52)' }} activeOpacity={1} onPress={onClose} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#111622', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', paddingBottom: insets.bottom + 8 }}>
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.20)' }} />
        </View>
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

        <Animated.ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 4 }} showsVerticalScrollIndicator={false}>
          {slip.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 44 }}>
              <Ionicons name="receipt-outline" size={42} color="rgba(255,255,255,0.10)" />
              <Text style={{ color: 'rgba(255,255,255,0.26)', fontSize: 14, marginTop: 14, textAlign: 'center', lineHeight: 20 }}>Tap "+ Slip" on any prop{'\n'}to start building</Text>
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

        {slip.length > 0 && (
          <View style={{ paddingHorizontal: 22, paddingTop: 12 }}>
            <TouchableOpacity onPress={handleSave} disabled={saved} activeOpacity={0.85}>
              <LinearGradient colors={saved ? ['#50C882', '#3AA066'] : ['#FFA550', '#FF7828', '#C85014']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Ionicons name={saved ? 'checkmark-circle' : 'bookmark-outline'} size={18} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>{saved ? 'Slip Saved!' : 'Save Slip'}</Text>
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

  const [screenView, setScreenView] = useState<ScreenView>('dashboard');
  const [selectedGamePk, setSelectedGamePk] = useState<number | null>(null);
  const [activeProp, setActiveProp] = useState<PropType>('HR');
  const [slip, setSlip] = useState<SlipEntry[]>([]);
  const [slipOpen, setSlipOpen] = useState(false);

  const tabBarBottomPos = insets.bottom > 0 ? insets.bottom + 6 : 18;
  const fabBottom = tabBarBottomPos + TAB_BAR_HEIGHT + 14;

  const gamesWithPitchers = useMemo(
    () => games?.filter((g) => g.teams.away.probablePitcher || g.teams.home.probablePitcher) ?? [],
    [games],
  );

  const selectedGame = useMemo(
    () => selectedGamePk ? gamesWithPitchers.find((g) => g.gamePk === selectedGamePk) ?? gamesWithPitchers[0] : gamesWithPitchers[0],
    [selectedGamePk, gamesWithPitchers],
  );

  const addToSlip = useCallback((entry: SlipEntry) => {
    setSlip((prev) => (prev.some((e) => e.id === entry.id) ? prev : [...prev, entry]));
  }, []);
  const removeFromSlip = useCallback((id: string) => setSlip((prev) => prev.filter((e) => e.id !== id)), []);
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
        <View style={{ paddingTop: 60, paddingHorizontal: 18, paddingBottom: 14 }}>
          <Text style={{ color: 'rgba(255,255,255,0.36)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 }}>TODAY'S SLATE</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>Prop Builder</Text>
          <Text style={{ color: 'rgba(255,255,255,0.33)', fontSize: 13, marginTop: 4 }}>
            {screenView === 'dashboard' ? 'Model-built parlays ready to save' : 'Build your slip with data-driven props'}
          </Text>
        </View>

        {/* View toggle */}
        <ViewToggle active={screenView} onChange={setScreenView} />

        {/* Dashboard */}
        {screenView === 'dashboard' && (
          <PaywallGate feature="Props Dashboard" benefits={['Pre-built 2–5 leg safe & long shot parlays', 'Auto-generated from today\'s full slate', 'One-tap save to Bet Tracker', 'Refreshed daily before first pitch']} minHeight={460}>
            <DashboardView games={gamesWithPitchers} onSwitchBuilder={() => setScreenView('builder')} />
          </PaywallGate>
        )}

        {/* Builder */}
        {screenView === 'builder' && (
          <>
            {/* Game selector */}
            <View style={{ paddingHorizontal: 18, marginBottom: 16 }}>
              <Text style={{ color: 'rgba(255,255,255,0.26)', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8 }}>SELECT GAME</Text>
              <GameDropdown games={gamesWithPitchers} selectedGame={selectedGame} onSelect={setSelectedGamePk} />
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
            <PaywallGate
              feature="Prop Builder"
              benefits={[
                'HR Nuke model with Hot & Due badges',
                '1st Inning O/U & Moneyline props',
                'Pitcher strikeout projections',
                'Full batter vs pitcher matchup',
                'Build & save multi-leg slips',
              ]}
              minHeight={460}
            >
              <View style={{ paddingHorizontal: 18 }}>
                {selectedGame && (activeProp === 'HR' || activeProp === 'Hit' || activeProp === '2+ Hits') && (
                  <BatterPropsContent game={selectedGame} propType={activeProp} slip={slip} onAdd={addToSlip} />
                )}
                {selectedGame && activeProp === "Pitcher K's" && (
                  <PitcherKContent game={selectedGame} slip={slip} onAdd={addToSlip} />
                )}
                {selectedGame && activeProp === '1st Inn O/U' && (
                  <FirstInningContent game={selectedGame} slip={slip} onAdd={addToSlip} />
                )}
                {selectedGame && activeProp === 'Moneyline' && (
                  <MoneylineContent game={selectedGame} slip={slip} onAdd={addToSlip} />
                )}
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.13)', fontSize: 11, textAlign: 'center', paddingHorizontal: 24, paddingTop: 22, lineHeight: 16 }}>
                Probabilities are model estimates based on 2025 season stats.{'\n'}For educational use only — not betting advice.
              </Text>
            </PaywallGate>
          </>
        )}
      </Animated.ScrollView>

      {/* Floating slip FAB — only in builder view */}
      {screenView === 'builder' && slip.length > 0 && (
        <View style={{ position: 'absolute', bottom: fabBottom, left: SW / 2 - 100, width: 200 }}>
          <TouchableOpacity onPress={() => setSlipOpen(true)} activeOpacity={0.85}>
            <LinearGradient colors={['#FFA550', '#FF7828', '#C85014']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#FF7828', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.55, shadowRadius: 20 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>{slip.length}</Text>
              </View>
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>View Slip</Text>
              <Ionicons name="chevron-up" size={15} color="rgba(255,255,255,0.75)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <SlipDrawer visible={slipOpen} slip={slip} onClose={() => setSlipOpen(false)} onRemove={removeFromSlip} onClear={clearSlip} onSaved={clearSlip} />
    </AppBackground>
  );
}
