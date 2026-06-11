import { memo, useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  Linking,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/src/components/AppBackground';
import { GlassCard } from '@/src/components/GlassCard';
import { TeamLogo } from '@/src/components/TeamLogo';
import { PlayerHeadshot } from '@/src/components/PlayerHeadshot';
import { useSettings } from '@/src/hooks/useSettings';
import { useAuth } from '@/src/hooks/useAuth';
import { useSubscription } from '@/src/hooks/useSubscription';
import { useTabBarScroll } from '@/src/hooks/useTabBarScroll';
import { useSavedSlips } from '@/src/hooks/useSavedSlips';
import { TAB_BAR_HEIGHT } from '@/src/components/LiquidGlassTabBar';
import { impliedAmericanOdds, formatCombinedPct, parlayAmericanOdds, type SavedSlip } from '@/src/storage/slipStorage';
import { router } from 'expo-router';

const { height: SCREEN_H } = Dimensions.get('window');

const STRIPE_PORTAL_URL = 'https://billing.stripe.com/p/login/bpc_1TeVcwDcySthi9PMZiJKNs66';

const ALL_TEAMS = [
  { id: 108, name: 'Los Angeles Angels' },
  { id: 109, name: 'Arizona Diamondbacks' },
  { id: 110, name: 'Baltimore Orioles' },
  { id: 111, name: 'Boston Red Sox' },
  { id: 112, name: 'Chicago Cubs' },
  { id: 113, name: 'Cincinnati Reds' },
  { id: 114, name: 'Cleveland Guardians' },
  { id: 115, name: 'Colorado Rockies' },
  { id: 116, name: 'Detroit Tigers' },
  { id: 117, name: 'Houston Astros' },
  { id: 118, name: 'Kansas City Royals' },
  { id: 119, name: 'Los Angeles Dodgers' },
  { id: 120, name: 'Washington Nationals' },
  { id: 121, name: 'New York Mets' },
  { id: 133, name: 'Athletics' },
  { id: 134, name: 'Pittsburgh Pirates' },
  { id: 135, name: 'San Diego Padres' },
  { id: 136, name: 'Seattle Mariners' },
  { id: 137, name: 'San Francisco Giants' },
  { id: 138, name: 'St. Louis Cardinals' },
  { id: 139, name: 'Tampa Bay Rays' },
  { id: 140, name: 'Texas Rangers' },
  { id: 141, name: 'Toronto Blue Jays' },
  { id: 142, name: 'Minnesota Twins' },
  { id: 143, name: 'Philadelphia Phillies' },
  { id: 144, name: 'Atlanta Braves' },
  { id: 145, name: 'Chicago White Sox' },
  { id: 146, name: 'Miami Marlins' },
  { id: 147, name: 'New York Yankees' },
  { id: 158, name: 'Milwaukee Brewers' },
].sort((a, b) => a.name.localeCompare(b.name));

// ─── Team Row (memoized list item) ────────────────────────────────────────────
const TeamRow = memo(function TeamRow({
  team,
  isSelected,
  onPress,
}: {
  team: { id: number; name: string };
  isSelected: boolean;
  onPress: (id: number, name: string) => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => onPress(team.id, team.name)}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginBottom: 4,
        backgroundColor: isSelected ? 'rgba(255,120,40,0.12)' : 'transparent',
        borderWidth: isSelected ? 1 : 0,
        borderColor: 'rgba(255,120,40,0.30)',
      }}
    >
      <TeamLogo teamId={team.id} teamName={team.name} size={36} />
      <Text
        style={{
          color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
          fontSize: 14,
          fontWeight: isSelected ? '700' : '500',
          marginLeft: 12,
          flex: 1,
        }}
      >
        {team.name}
      </Text>
      {isSelected && <Ionicons name="checkmark-circle" size={20} color="#FF7828" />}
    </TouchableOpacity>
  );
});

// ─── Team Dropdown ─────────────────────────────────────────────────────────────
function TeamDropdown({
  selectedId,
  selectedName,
  onSelect,
}: {
  selectedId: number | null;
  selectedName: string | null;
  onSelect: (id: number, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = ALL_TEAMS.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = useCallback(
    (id: number, name: string) => {
      onSelect(id, name);
      setOpen(false);
      setSearch('');
    },
    [onSelect],
  );

  const renderTeamRow = useCallback(
    ({ item: team }: { item: { id: number; name: string } }) => (
      <TeamRow
        team={team}
        isSelected={team.id === selectedId}
        onPress={handleSelect}
      />
    ),
    [selectedId, handleSelect],
  );

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.8}>
        <GlassCard
          style={{
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            borderColor: selectedId ? 'rgba(255,120,40,0.35)' : 'rgba(255,255,255,0.10)',
          }}
        >
          {selectedId ? (
            <>
              <TeamLogo teamId={selectedId} teamName={selectedName ?? ''} size={38} />
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginLeft: 14, flex: 1 }}>
                {selectedName}
              </Text>
            </>
          ) : (
            <>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="baseball-outline" size={18} color="rgba(255,255,255,0.3)" />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, marginLeft: 14, flex: 1 }}>
                Select a team...
              </Text>
            </>
          )}
          <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.35)" />
        </GlassCard>
      </TouchableOpacity>

      {/* Modal picker */}
      <Modal visible={open} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#111622',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: '80%',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.10)',
            }}
          >
            {/* Handle + header */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255,255,255,0.07)',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>Choose Your Team</Text>
              <TouchableOpacity onPress={() => { setOpen(false); setSearch(''); }} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                marginHorizontal: 16,
                marginVertical: 12,
                paddingHorizontal: 14,
                height: 44,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.3)" style={{ marginRight: 10 }} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search teams..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={{ flex: 1, color: '#FFFFFF', fontSize: 15 }}
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              )}
            </View>

            {/* Team list */}
            <FlatList
              data={filtered}
              keyExtractor={(t) => t.id.toString()}
              keyboardShouldPersistTaps="handled"
              style={{ paddingHorizontal: 16 }}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={renderTeamRow}
              removeClippedSubviews
              maxToRenderPerBatch={15}
              initialNumToRender={15}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Edit Name Modal ──────────────────────────────────────────────────────────
function EditNameModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, updateName } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    setLoading(true);
    const res = await updateName(name);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: '#141820', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 20 }}>Change Name</Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 54, marginBottom: 14 }}>
            <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} />
            <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="rgba(255,255,255,0.25)" autoFocus autoCapitalize="words" style={{ flex: 1, color: '#FFFFFF', fontSize: 16 }} />
          </View>
          {!!error && <Text style={{ color: '#EB505A', fontSize: 13, marginBottom: 12 }}>{error}</Text>}
          <TouchableOpacity onPress={save} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#FFA550', '#FF7828', '#C85014']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Save</Text>}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 10 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Change Password Modal ─────────────────────────────────────────────────────
function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { updatePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputRow = { backgroundColor: 'rgba(255,255,255,0.06)' as const, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' as const, flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 16, height: 54, marginBottom: 12 };

  const save = async () => {
    setError('');
    if (next !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const res = await updatePassword(current, next);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCurrent('');
    setNext('');
    setConfirm('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: '#141820', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 20 }}>Change Password</Text>
          <View style={inputRow}><Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} /><TextInput value={current} onChangeText={setCurrent} placeholder="Current password" placeholderTextColor="rgba(255,255,255,0.25)" secureTextEntry autoFocus style={{ flex: 1, color: '#FFFFFF', fontSize: 16 }} /></View>
          <View style={inputRow}><Ionicons name="lock-open-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} /><TextInput value={next} onChangeText={setNext} placeholder="New password" placeholderTextColor="rgba(255,255,255,0.25)" secureTextEntry style={{ flex: 1, color: '#FFFFFF', fontSize: 16 }} /></View>
          <View style={inputRow}><Ionicons name="lock-open-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} /><TextInput value={confirm} onChangeText={setConfirm} placeholder="Confirm new password" placeholderTextColor="rgba(255,255,255,0.25)" secureTextEntry style={{ flex: 1, color: '#FFFFFF', fontSize: 16 }} /></View>
          {!!error && <Text style={{ color: '#EB505A', fontSize: 13, marginBottom: 12 }}>{error}</Text>}
          <TouchableOpacity onPress={save} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#FFA550', '#FF7828', '#C85014']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Update Password</Text>}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 10 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slipCombinedPct(legs: Array<{ probability: number }>): number {
  if (legs.length === 0) return 0;
  return legs.reduce((acc, l) => acc * (l.probability / 100), 1) * 100;
}

function formatSlipDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Dillon Dingler HR vs Grayson Rodriguez" → "Dillon Dingler HR" */
function shortDesc(description: string): string {
  const idx = description.indexOf(' vs ');
  return idx > -1 ? description.slice(0, idx) : description;
}

/** Extract numeric MLB player ID from a leg id like "669742-HR" */
function playerIdFromLegId(id: string): number | null {
  const n = parseInt(id.split('-')[0], 10);
  return isNaN(n) ? null : n;
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

  // Use real parlay odds from entered FanDuel lines; fall back to implied probability
  const oddsLines = legs.map((l) => l.oddsLine);
  const realParlay = parlayAmericanOdds(oddsLines);
  const parlayDisplay = realParlay ?? impliedAmericanOdds(combinedPct);
  const parlayLabel = realParlay ? 'PARLAY PAYOUT ODDS' : 'BREAK-EVEN ODDS (EST.)';

  const persist = useCallback((updatedLegs: EditableLeg[], w: string, tw: string) => {
    onUpdateSlip({
      legs: updatedLegs.map(({ oddsLine, probText, ...rest }) => ({
        ...rest,
        probability: parseFloat(probText) || rest.probability,
        oddsLine: oddsLine || undefined,
      })),
      wager: w ? parseFloat(w) : undefined,
      toWin: tw ? parseFloat(tw) : undefined,
    });
  }, [onUpdateSlip]);

  const removeLeg = useCallback((idx: number) => {
    setLegs((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      persist(next, wager, toWin);
      return next;
    });
  }, [wager, toWin, persist]);

  const handleSave = useCallback(() => {
    persist(legs, wager, toWin);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  }, [legs, wager, toWin, persist]);

  return (
    // Outer container — NO flex:1 so maxHeight works correctly in the absolute-positioned parent
    <View style={{
      backgroundColor: '#111622',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: SCREEN_H * 0.88,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
    }}>
      {/* Handle — outside ScrollView so it stays fixed */}
      <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 2 }}>
        <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.20)' }} />
      </View>

      {/* Header — fixed */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' }}>
        <View>
          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>{slip.legs.length}-Leg Parlay</Text>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 }}>{formatSlipDate(slip.savedAt)}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => Alert.alert('Delete Slip', 'Remove this slip from history?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { onDelete(); onClose(); } }])} activeOpacity={0.7} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(235,80,90,0.10)', borderWidth: 1, borderColor: 'rgba(235,80,90,0.20)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="trash-outline" size={15} color="#EB505A" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
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
        {/* ── Legs ── */}
        <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 }}>LEGS · PROBABILITY · FANDUEL ODDS</Text>

        {legs.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>All legs removed.</Text>
          </View>
        )}

        {legs.map((leg, idx) => {
          const playerId = playerIdFromLegId(leg.id);
          return (
            <View key={leg.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
              {/* Player photo */}
              {playerId ? (
                <PlayerHeadshot playerId={playerId} playerName={leg.playerName} size={34} />
              ) : (
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={16} color="rgba(255,255,255,0.3)" />
                </View>
              )}

              {/* Name + type */}
              <Text style={{ flex: 1, color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 10 }} numberOfLines={1}>
                {shortDesc(leg.description)}
              </Text>

              {/* Prob % — read-only prediction value */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 7, height: 34, width: 58, marginLeft: 8, justifyContent: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '700' }}>{leg.probText}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>%</Text>
              </View>

              {/* Odds input */}
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
              <TouchableOpacity onPress={() => removeLeg(idx)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(235,80,90,0.12)', borderWidth: 1, borderColor: 'rgba(235,80,90,0.25)', alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}>
                <Ionicons name="close" size={12} color="#EB505A" />
              </TouchableOpacity>
            </View>
          );
        })}

        {/* ── Parlay summary row ── */}
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

        {/* ── Wager / To Win ── */}
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

        {/* ── Outcome ── */}
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

        {/* ── Save button ── */}
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

// ─── Slip History Card ────────────────────────────────────────────────────────

function SlipHistoryCard({ slip, onPress }: { slip: SavedSlip; onPress: () => void }) {
  const statusColor = slip.status === 'won' ? '#50C882' : slip.status === 'lost' ? '#EB505A' : '#FF7828';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ marginBottom: 10 }}>
      <GlassCard style={{ padding: 14, borderColor: slip.status === 'won' ? 'rgba(80,200,130,0.18)' : slip.status === 'lost' ? 'rgba(235,80,90,0.18)' : 'rgba(255,255,255,0.08)' }}>

        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 9 }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: statusColor, marginRight: 9 }} />
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800', flex: 1 }}>
            {slip.legs.length}-Leg Parlay
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: slip.status === 'won' ? 'rgba(80,200,130,0.12)' : slip.status === 'lost' ? 'rgba(235,80,90,0.12)' : 'rgba(255,120,40,0.10)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: slip.status === 'won' ? 'rgba(80,200,130,0.28)' : slip.status === 'lost' ? 'rgba(235,80,90,0.28)' : 'rgba(255,120,40,0.28)' }}>
            {slip.status === 'won' && <Ionicons name="trophy" size={11} color="#50C882" />}
            {slip.status === 'lost' && <Ionicons name="close-circle" size={11} color="#EB505A" />}
            {slip.status === 'pending' && <Ionicons name="time-outline" size={11} color="#FF7828" />}
            <Text style={{ color: statusColor, fontSize: 10, fontWeight: '800' }}>
              {slip.status === 'won' ? 'WON' : slip.status === 'lost' ? 'LOST' : 'PENDING'}
            </Text>
          </View>
        </View>

        {/* Leg pills — first 2, "+N more" badge */}
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

        {/* Footer row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 9, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, flex: 1 }}>{formatSlipDate(slip.savedAt)}</Text>
          {/* "$X to win $Y" — the money shot */}
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

// ─── Settings Tab ─────────────────────────────────────────────────────────────
export default function SettingsTabScreen() {
  const { settings, updateSettings } = useSettings();
  const { user, logOut } = useAuth();
  const { isPro, plan } = useSubscription();
  const { scrollHandler, scrollEventThrottle } = useTabBarScroll();
  const { slips, won, lost, pending, winRate, markOutcome, update, remove } = useSavedSlips();
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<SavedSlip | null>(null);

  const handleManageSubscription = () => {
    const url = user?.email
      ? `${STRIPE_PORTAL_URL}?prefilled_email=${encodeURIComponent(user.email)}`
      : STRIPE_PORTAL_URL;
    Linking.openURL(url);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await logOut();
          router.replace('/auth/login' as any);
        },
      },
    ]);
  };

  // Most recent 3 slips across all statuses for at-a-glance view
  const recentSlips = [...slips].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).slice(0, 3);

  return (
    <AppBackground>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 50 }}
      >
        {/* Header */}
        <View style={{ paddingTop: 64, paddingHorizontal: 20, paddingBottom: 24 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 }}>
            ACCOUNT
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>Settings</Text>
        </View>

        {/* Profile card */}
        {user && (
          <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
            <GlassCard style={{ padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <LinearGradient
                  colors={['#FFA550', '#FF7828', '#C85014']}
                  style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}
                >
                  <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>{user.name}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 }}>{user.email}</Text>
                </View>
              </View>
            </GlassCard>
          </View>
        )}

        {/* Profile section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 }}>PROFILE</Text>
          <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
            <TouchableOpacity
              onPress={() => setShowNameModal(true)}
              activeOpacity={0.75}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,120,40,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Ionicons name="person-outline" size={16} color="#FF7828" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Change Name</Text>
                {user?.name && <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 1 }}>{user.name}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowPasswordModal(true)}
              activeOpacity={0.75}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,120,40,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Ionicons name="lock-closed-outline" size={16} color="#FF7828" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Change Password</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 1 }}>Update your password</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* ─── Subscription ────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 }}>SUBSCRIPTION</Text>
          <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
            {/* Current plan row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
              <View style={{
                width: 34, height: 34, borderRadius: 10,
                backgroundColor: isPro ? 'rgba(255,120,40,0.12)' : 'rgba(255,255,255,0.06)',
                alignItems: 'center', justifyContent: 'center', marginRight: 14,
              }}>
                <Ionicons name={isPro ? 'flash' : 'person-outline'} size={16} color={isPro ? '#FF7828' : 'rgba(255,255,255,0.35)'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Current Plan</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <View style={{
                    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
                    backgroundColor: isPro ? 'rgba(255,120,40,0.15)' : 'rgba(255,255,255,0.07)',
                    borderWidth: 1,
                    borderColor: isPro ? 'rgba(255,120,40,0.35)' : 'rgba(255,255,255,0.10)',
                  }}>
                    <Text style={{ color: isPro ? '#FF7828' : 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                      {isPro ? 'PRO' : 'FREE'}
                    </Text>
                  </View>
                  {isPro && (
                    <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 11 }}>$14.99 / month</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Manage / Upgrade row */}
            {isPro ? (
              <TouchableOpacity
                onPress={handleManageSubscription}
                activeOpacity={0.75}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(235,80,90,0.10)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Ionicons name="card-outline" size={16} color="#EB505A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#EB505A', fontSize: 15, fontWeight: '600' }}>Manage Subscription</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 12, marginTop: 1 }}>Cancel, update billing & more</Text>
                </View>
                <Ionicons name="open-outline" size={15} color="rgba(235,80,90,0.50)" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => router.push('/upgrade' as any)}
                activeOpacity={0.75}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,120,40,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Ionicons name="flash-outline" size={16} color="#FF7828" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FF7828', fontSize: 15, fontWeight: '600' }}>Upgrade to Pro</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 12, marginTop: 1 }}>Unlock every edge from $4.99/mo</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color="rgba(255,120,40,0.40)" />
              </TouchableOpacity>
            )}
          </GlassCard>
        </View>

        {/* ─── Bet History ─────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          {/* Section header with "View All" link */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '800', letterSpacing: 2, flex: 1 }}>BET HISTORY</Text>
            {slips.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/bet-history' as any)} activeOpacity={0.7}>
                <Text style={{ color: '#FF7828', fontSize: 12, fontWeight: '700' }}>View All →</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats row */}
          {slips.length > 0 && (
            <GlassCard style={{ padding: 14, marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900' }}>{slips.length}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 }}>TOTAL</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#50C882', fontSize: 20, fontWeight: '900' }}>{won.length}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 }}>WON</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#EB505A', fontSize: 20, fontWeight: '900' }}>{lost.length}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 }}>LOST</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: winRate !== null ? '#FF7828' : 'rgba(255,255,255,0.25)', fontSize: 20, fontWeight: '900' }}>
                    {winRate !== null ? `${winRate}%` : '—'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 }}>WIN RATE</Text>
                </View>
              </View>
            </GlassCard>
          )}

          {/* Up to 3 most recent slips */}
          {slips.length === 0 ? (
            <GlassCard style={{ padding: 28, alignItems: 'center' }}>
              <Ionicons name="receipt-outline" size={36} color="rgba(255,255,255,0.12)" />
              <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
                No slips saved yet.{'\n'}Save one from the Prop Builder tab.
              </Text>
            </GlassCard>
          ) : (
            <>
              {recentSlips.map((slip) => (
                <SlipHistoryCard
                  key={slip.id}
                  slip={slip}
                  onPress={() => setSelectedSlip(slip)}
                />
              ))}
              {/* "View All" row when there are more than 3 */}
              {slips.length > 3 && (
                <TouchableOpacity onPress={() => router.push('/bet-history' as any)} activeOpacity={0.8}>
                  <GlassCard style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="list-outline" size={18} color="#FF7828" style={{ marginRight: 12 }} />
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', flex: 1 }}>View All Bets</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginRight: 6 }}>{slips.length} total</Text>
                    <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.25)" />
                  </GlassCard>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Favorite team */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 }}>FAVORITE TEAM</Text>
          <TeamDropdown
            selectedId={settings.favoriteTeamId}
            selectedName={settings.favoriteTeamName}
            onSelect={(id, name) => updateSettings({ favoriteTeamId: id, favoriteTeamName: name })}
          />
          {settings.favoriteTeamId && (
            <TouchableOpacity
              onPress={() => updateSettings({ favoriteTeamId: null, favoriteTeamName: null })}
              activeOpacity={0.7}
              style={{ alignItems: 'center', marginTop: 10 }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Clear selection</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Legal */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 }}>LEGAL</Text>
          <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
            <TouchableOpacity
              onPress={() => router.push('/terms' as any)}
              activeOpacity={0.75}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,120,40,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Ionicons name="document-text-outline" size={16} color="#FF7828" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Terms of Service</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 1 }}>Version 1.1</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/privacy-policy' as any)}
              activeOpacity={0.75}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,120,40,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#FF7828" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Privacy Policy</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 1 }}>Version 1.1</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* Sign out */}
        <View style={{ paddingHorizontal: 20 }}>
          <TouchableOpacity onPress={handleLogout} activeOpacity={0.75}>
            <GlassCard style={{ padding: 16, flexDirection: 'row', alignItems: 'center', borderColor: 'rgba(235,80,90,0.20)' }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(235,80,90,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Ionicons name="log-out-outline" size={16} color="#EB505A" />
              </View>
              <Text style={{ color: '#EB505A', fontSize: 15, fontWeight: '600', flex: 1 }}>Sign Out</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      <EditNameModal visible={showNameModal} onClose={() => setShowNameModal(false)} />
      <ChangePasswordModal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} />

      {/* Slip detail bottom sheet */}
      <Modal
        visible={selectedSlip !== null}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
      >
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} activeOpacity={1} onPress={() => setSelectedSlip(null)} />
        {selectedSlip && (
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '90%' }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <SlipDetailSheet
                slip={selectedSlip}
                onClose={() => setSelectedSlip(null)}
                onMarkWon={() => markOutcome(selectedSlip.id, 'won')}
                onMarkLost={() => markOutcome(selectedSlip.id, 'lost')}
                onUpdateSlip={(patch) => update(selectedSlip.id, patch)}
                onDelete={() => remove(selectedSlip.id)}
              />
            </KeyboardAvoidingView>
          </View>
        )}
      </Modal>
    </AppBackground>
  );
}
