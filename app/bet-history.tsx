import { useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppBackground } from '@/src/components/AppBackground';
import { GlassCard } from '@/src/components/GlassCard';
import { PlayerHeadshot } from '@/src/components/PlayerHeadshot';
import { useSavedSlips } from '@/src/hooks/useSavedSlips';
import {
  impliedAmericanOdds,
  formatCombinedPct,
  parlayAmericanOdds,
  type SavedSlip,
} from '@/src/storage/slipStorage';

const { height: SCREEN_H } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slipCombinedPct(legs: Array<{ probability: number }>): number {
  if (legs.length === 0) return 0;
  return legs.reduce((acc, l) => acc * (l.probability / 100), 1) * 100;
}

function formatSlipDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function shortDesc(description: string): string {
  const idx = description.indexOf(' vs ');
  return idx > -1 ? description.slice(0, idx) : description;
}

function playerIdFromLegId(id: string): number | null {
  const n = parseInt(id.split('-')[0], 10);
  return isNaN(n) ? null : n;
}

// ─── Slip History Card ────────────────────────────────────────────────────────

function SlipHistoryCard({ slip, onPress }: { slip: SavedSlip; onPress: () => void }) {
  const statusColor = slip.status === 'won' ? '#50C882' : slip.status === 'lost' ? '#EB505A' : '#FF7828';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ marginBottom: 10 }}>
      <GlassCard style={{
        padding: 14,
        borderColor: slip.status === 'won' ? 'rgba(80,200,130,0.18)' : slip.status === 'lost' ? 'rgba(235,80,90,0.18)' : 'rgba(255,255,255,0.08)',
      }}>
        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 9 }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: statusColor, marginRight: 9 }} />
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800', flex: 1 }}>
            {slip.legs.length}-Leg Parlay
          </Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: slip.status === 'won' ? 'rgba(80,200,130,0.12)' : slip.status === 'lost' ? 'rgba(235,80,90,0.12)' : 'rgba(255,120,40,0.10)',
            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
            borderColor: slip.status === 'won' ? 'rgba(80,200,130,0.28)' : slip.status === 'lost' ? 'rgba(235,80,90,0.28)' : 'rgba(255,120,40,0.28)',
          }}>
            {slip.status === 'won' && <Ionicons name="trophy" size={11} color="#50C882" />}
            {slip.status === 'lost' && <Ionicons name="close-circle" size={11} color="#EB505A" />}
            {slip.status === 'pending' && <Ionicons name="time-outline" size={11} color="#FF7828" />}
            <Text style={{ color: statusColor, fontSize: 10, fontWeight: '800' }}>
              {slip.status === 'won' ? 'WON' : slip.status === 'lost' ? 'LOST' : 'PENDING'}
            </Text>
          </View>
        </View>

        {/* Leg pills */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {slip.legs.slice(0, 2).map((leg) => (
            <View key={leg.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 5 }}>
              {playerIdFromLegId(leg.id) ? (
                <PlayerHeadshot playerId={playerIdFromLegId(leg.id)!} playerName={leg.playerName} size={18} />
              ) : null}
              <Text style={{ color: 'rgba(255,255,255,0.70)', fontSize: 11, fontWeight: '600' }} numberOfLines={1}>{shortDesc(leg.description)}</Text>
            </View>
          ))}
          {slip.legs.length > 2 && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 11, fontWeight: '700' }}>+{slip.legs.length - 2}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 9, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, flex: 1 }}>{formatSlipDate(slip.savedAt)}</Text>
          {slip.wager && slip.toWin ? (
            <Text style={{ color: statusColor, fontSize: 12, fontWeight: '800' }}>
              ${slip.wager % 1 === 0 ? slip.wager : slip.wager.toFixed(2)} to win ${slip.toWin % 1 === 0 ? slip.toWin : slip.toWin.toFixed(2)}
            </Text>
          ) : slip.wager ? (
            <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11, fontWeight: '700' }}>${slip.wager} wagered</Text>
          ) : null}
          <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.18)" style={{ marginLeft: 6 }} />
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

// ─── Slip Detail Sheet ────────────────────────────────────────────────────────

type EditableLeg = SavedSlip['legs'][number] & { oddsLine: string; probText: string };

function SlipDetailSheet({
  slip,
  onClose,
  onMarkWon,
  onMarkLost,
  onUpdateSlip,
  onDelete,
}: {
  slip: SavedSlip;
  onClose: () => void;
  onMarkWon: () => void;
  onMarkLost: () => void;
  onUpdateSlip: (patch: Partial<SavedSlip>) => void;
  onDelete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [legs, setLegs] = useState<EditableLeg[]>(
    slip.legs.map((l) => ({ ...l, oddsLine: l.oddsLine ?? '', probText: String(l.probability) })),
  );
  const [wager, setWager] = useState(slip.wager ? String(slip.wager) : '');
  const [toWin, setToWin] = useState(slip.toWin ? String(slip.toWin) : '');
  const [saved, setSaved] = useState(false);

  const currentLegs = legs.map((l) => ({ ...l, probability: parseFloat(l.probText) || l.probability }));
  const combinedPct = slipCombinedPct(currentLegs);

  const oddsLines = legs.map((l) => l.oddsLine);
  const realParlay = parlayAmericanOdds(oddsLines);
  const parlayDisplay = realParlay ?? impliedAmericanOdds(combinedPct);
  const parlayLabel = realParlay ? 'PARLAY PAYOUT ODDS' : 'BREAK-EVEN ODDS (EST.)';

  const persist = (updatedLegs: EditableLeg[], w: string, tw: string) => {
    onUpdateSlip({
      legs: updatedLegs.map(({ oddsLine, probText, ...rest }) => ({
        ...rest,
        probability: parseFloat(probText) || rest.probability,
        oddsLine: oddsLine || undefined,
      })),
      wager: w ? parseFloat(w) : undefined,
      toWin: tw ? parseFloat(tw) : undefined,
    });
  };

  const removeLeg = (idx: number) => {
    setLegs((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      persist(next, wager, toWin);
      return next;
    });
  };

  const handleSave = () => {
    persist(legs, wager, toWin);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  return (
    <View style={{
      backgroundColor: '#111622',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: SCREEN_H * 0.88,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
    }}>
      {/* Handle */}
      <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 2 }}>
        <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.20)' }} />
      </View>

      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' }}>
        <View>
          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>{slip.legs.length}-Leg Parlay</Text>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 }}>{formatSlipDate(slip.savedAt)}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => Alert.alert('Delete Slip', 'Remove this slip from history?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => { onDelete(); onClose(); } },
            ])}
            activeOpacity={0.7}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(235,80,90,0.10)', borderWidth: 1, borderColor: 'rgba(235,80,90,0.20)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="trash-outline" size={15} color="#EB505A" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.55)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable body */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: insets.bottom + 16 }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 }}>
          LEGS · PROBABILITY · FANDUEL ODDS
        </Text>

        {legs.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>All legs removed.</Text>
          </View>
        )}

        {legs.map((leg, idx) => {
          const playerId = playerIdFromLegId(leg.id);
          return (
            <View key={leg.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
              {playerId ? (
                <PlayerHeadshot playerId={playerId} playerName={leg.playerName} size={34} />
              ) : (
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={16} color="rgba(255,255,255,0.3)" />
                </View>
              )}
              <Text style={{ flex: 1, color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 10 }} numberOfLines={1}>
                {shortDesc(leg.description)}
              </Text>
              {/* Prob % — read-only prediction value */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 7, height: 34, width: 58, marginLeft: 8, justifyContent: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '700' }}>{leg.probText}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>%</Text>
              </View>
              {/* Odds */}
              <TextInput
                value={leg.oddsLine}
                onChangeText={(t) => setLegs((prev) => prev.map((l, i) => i === idx ? { ...l, oddsLine: t } : l))}
                onBlur={() => persist(legs, wager, toWin)}
                placeholder="+150"
                placeholderTextColor="rgba(255,255,255,0.16)"
                keyboardType="default"
                style={{ width: 66, height: 34, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', paddingHorizontal: 8, color: '#FF7828', fontSize: 12, fontWeight: '800', textAlign: 'center', marginLeft: 6 }}
              />
              {/* Remove */}
              <TouchableOpacity
                onPress={() => removeLeg(idx)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(235,80,90,0.12)', borderWidth: 1, borderColor: 'rgba(235,80,90,0.25)', alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}
              >
                <Ionicons name="close" size={12} color="#EB505A" />
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Parlay summary */}
        {legs.length > 1 && (
          <View style={{ flexDirection: 'row', marginTop: 10, marginBottom: 12, padding: 12, backgroundColor: 'rgba(255,120,40,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,120,40,0.18)' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>COMBINED PROB</Text>
              <Text style={{ color: '#FF7828', fontSize: 18, fontWeight: '900', marginTop: 1 }}>{formatCombinedPct(combinedPct)}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>{parlayLabel}</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 1 }}>{parlayDisplay}</Text>
            </View>
          </View>
        )}

        {/* Wager / To Win */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 5 }}>WAGER</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 12, height: 48 }}>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, marginRight: 3 }}>$</Text>
              <TextInput value={wager} onChangeText={setWager} onBlur={() => persist(legs, wager, toWin)} placeholder="0.00" placeholderTextColor="rgba(255,255,255,0.18)" keyboardType="decimal-pad" style={{ flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '700' }} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 5 }}>TO WIN</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(80,200,130,0.18)', paddingHorizontal: 12, height: 48 }}>
              <Text style={{ color: 'rgba(80,200,130,0.55)', fontSize: 15, marginRight: 3 }}>$</Text>
              <TextInput value={toWin} onChangeText={setToWin} onBlur={() => persist(legs, wager, toWin)} placeholder="0.00" placeholderTextColor="rgba(255,255,255,0.18)" keyboardType="decimal-pad" style={{ flex: 1, color: '#50C882', fontSize: 16, fontWeight: '700' }} />
            </View>
          </View>
        </View>

        {/* Outcome */}
        {slip.status === 'pending' ? (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <TouchableOpacity onPress={() => { persist(legs, wager, toWin); onMarkWon(); onClose(); }} activeOpacity={0.85} style={{ flex: 1 }}>
              <LinearGradient colors={['#50C882', '#3AA066']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Ionicons name="trophy" size={16} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>Won</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { persist(legs, wager, toWin); onMarkLost(); onClose(); }} activeOpacity={0.85} style={{ flex: 1 }}>
              <View style={{ height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: 'rgba(235,80,90,0.10)', borderWidth: 1, borderColor: 'rgba(235,80,90,0.28)' }}>
                <Ionicons name="close-circle-outline" size={16} color="#EB505A" />
                <Text style={{ color: '#EB505A', fontSize: 14, fontWeight: '800' }}>Lost</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, marginBottom: 10, backgroundColor: slip.status === 'won' ? 'rgba(80,200,130,0.09)' : 'rgba(235,80,90,0.09)', borderWidth: 1, borderColor: slip.status === 'won' ? 'rgba(80,200,130,0.28)' : 'rgba(235,80,90,0.28)' }}>
            <Ionicons name={slip.status === 'won' ? 'trophy' : 'close-circle-outline'} size={22} color={slip.status === 'won' ? '#50C882' : '#EB505A'} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: slip.status === 'won' ? '#50C882' : '#EB505A', fontSize: 15, fontWeight: '800' }}>{slip.status === 'won' ? 'Won 🎉' : 'Lost'}</Text>
              {slip.checkedInAt && <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 11, marginTop: 1 }}>{formatSlipDate(slip.checkedInAt)}</Text>}
            </View>
            {slip.wager && slip.toWin && slip.status === 'won' && (
              <Text style={{ color: '#50C882', fontSize: 17, fontWeight: '900' }}>+${(slip.toWin - slip.wager).toFixed(2)}</Text>
            )}
          </View>
        )}

        {/* Save Changes */}
        <TouchableOpacity onPress={handleSave} activeOpacity={0.85}>
          <LinearGradient
            colors={saved ? ['#50C882', '#3AA066'] : ['#FFA550', '#FF7828', '#C85014']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Ionicons name={saved ? 'checkmark-circle' : 'bookmark-outline'} size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>{saved ? 'Saved!' : 'Save Changes'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Bet History Screen ────────────────────────────────────────────────────────

type HistoryTab = 'pending' | 'won' | 'lost';

export default function BetHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { pending, won, lost, markOutcome, update, remove } = useSavedSlips();
  const [activeTab, setActiveTab] = useState<HistoryTab>('pending');
  const [selectedSlip, setSelectedSlip] = useState<SavedSlip | null>(null);

  const tabSlips = activeTab === 'pending' ? pending : activeTab === 'won' ? won : lost;
  const tabCounts: Record<HistoryTab, number> = { pending: pending.length, won: won.length, lost: lost.length };

  const TAB_META: { key: HistoryTab; label: string; color: string; icon: string }[] = [
    { key: 'pending', label: 'Open', color: '#FF7828', icon: 'time-outline' },
    { key: 'won', label: 'Won', color: '#50C882', icon: 'trophy-outline' },
    { key: 'lost', label: 'Lost', color: '#EB505A', icon: 'close-circle-outline' },
  ];

  const EMPTY_MSG: Record<HistoryTab, string> = {
    pending: 'No open bets.\nSave a slip from the Prop Builder.',
    won: 'No winning slips yet.\nKeep building smart!',
    lost: 'No lost slips recorded.',
  };

  return (
    <AppBackground>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>HISTORY</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.3 }}>All Bets</Text>
          </View>
        </View>

        {/* Tab switcher */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {TAB_META.map(({ key, label, color, icon }) => {
            const active = activeTab === key;
            const count = tabCounts[key];
            return (
              <TouchableOpacity key={key} onPress={() => setActiveTab(key)} activeOpacity={0.8} style={{ flex: 1 }}>
                <View style={{
                  paddingVertical: 10, borderRadius: 14, alignItems: 'center',
                  backgroundColor: active ? `${color}18` : 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: active ? `${color}44` : 'rgba(255,255,255,0.08)',
                  gap: 3,
                }}>
                  <Ionicons name={icon as any} size={16} color={active ? color : 'rgba(255,255,255,0.30)'} />
                  <Text style={{ color: active ? color : 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '800' }}>{label}</Text>
                  <Text style={{ color: active ? color : 'rgba(255,255,255,0.22)', fontSize: 13, fontWeight: '900' }}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {tabSlips.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons
              name={(TAB_META.find((t) => t.key === activeTab)?.icon ?? 'time-outline') as any}
              size={52}
              color="rgba(255,255,255,0.10)"
            />
            <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 14, marginTop: 16, textAlign: 'center', lineHeight: 22 }}>
              {EMPTY_MSG[activeTab]}
            </Text>
          </View>
        ) : (
          tabSlips
            .slice()
            .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
            .map((slip) => (
              <SlipHistoryCard
                key={slip.id}
                slip={slip}
                onPress={() => setSelectedSlip(slip)}
              />
            ))
        )}
      </ScrollView>

      {/* Detail bottom sheet */}
      <Modal
        visible={selectedSlip !== null}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
          activeOpacity={1}
          onPress={() => setSelectedSlip(null)}
        />
        {selectedSlip && (
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <SlipDetailSheet
                slip={selectedSlip}
                onClose={() => setSelectedSlip(null)}
                onMarkWon={() => markOutcome(selectedSlip.id, 'won')}
                onMarkLost={() => markOutcome(selectedSlip.id, 'lost')}
                onUpdateSlip={(patch) => update(selectedSlip.id, patch)}
                onDelete={() => { remove(selectedSlip.id); setSelectedSlip(null); }}
              />
            </KeyboardAvoidingView>
          </View>
        )}
      </Modal>
    </AppBackground>
  );
}
