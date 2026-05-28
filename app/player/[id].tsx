import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { fetchPlayerProfile } from '@/src/api/mlb';
import { getHeadshotUrl, TEAM_COLORS } from '@/src/utils/mlbImages';

const { width: SW } = Dimensions.get('window');
const HERO_H = 440;
const OVERLAP = 48;

// ─── Stat table ──────────────────────────────────────────────────────────────

function StatTable({
  title,
  columns,
  values,
}: {
  title: string;
  columns: string[];
  values: (string | number)[];
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 14 }}>{title}</Text>
      {/* Header */}
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {columns.map((col) => (
          <Text key={col} style={{ flex: 1, color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textAlign: 'center' }}>
            {col}
          </Text>
        ))}
      </View>
      {/* Divider */}
      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 10 }} />
      {/* Values */}
      <View style={{ flexDirection: 'row' }}>
        {values.map((val, i) => (
          <Text key={i} style={{ flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '900', textAlign: 'center' }}>
            {val}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Info tile ────────────────────────────────────────────────────────────────

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        padding: 14,
        alignItems: 'center',
        marginHorizontal: 4,
      }}
    >
      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900', textAlign: 'center' }}>
        {value}
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playerId = Number(id);

  const { data: player, isLoading, isError } = useQuery({
    queryKey: ['player', playerId],
    queryFn: () => fetchPlayerProfile(playerId),
    enabled: !isNaN(playerId) && playerId > 0,
    retry: 1,
  });

  const teamColor = player ? (TEAM_COLORS[player.currentTeamId] ?? '#FF7828') : '#FF7828';
  const headshotUrl = getHeadshotUrl(playerId);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0E14', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FF7828" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 14, fontSize: 14 }}>Loading player…</Text>
      </View>
    );
  }

  if (isError || !player) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0E14', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Ionicons name="person-outline" size={48} color="rgba(255,255,255,0.15)" style={{ marginBottom: 12 }} />
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, textAlign: 'center' }}>
          Could not load player profile
        </Text>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/games' as any))} style={{ marginTop: 20 }} activeOpacity={0.7}>
          <Text style={{ color: '#FF7828', fontSize: 15, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const seasonCols = ['AB', 'AVG', 'HR', 'RBI', 'SB', 'OPS'];
  const seasonVals = [
    player.seasonStats.atBats,
    player.seasonStats.avg,
    player.seasonStats.homeRuns,
    player.seasonStats.rbi,
    player.seasonStats.stolenBases,
    player.seasonStats.ops,
  ];

  const careerCols = ['G', 'AVG', 'HR', 'RBI', 'SB', 'OPS'];
  const careerVals = [
    player.careerStats.gamesPlayed,
    player.careerStats.avg,
    player.careerStats.homeRuns,
    player.careerStats.rbi,
    player.careerStats.stolenBases,
    player.careerStats.ops,
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0E14' }}>
      {/* ── Fixed back button (always visible above scroll) ── */}
      <TouchableOpacity
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/games' as any))}
        activeOpacity={0.8}
        style={{
          position: 'absolute',
          top: 54,
          left: 18,
          zIndex: 100,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.50)',
          borderRadius: 22,
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
          gap: 4,
        }}
      >
        <Ionicons name="chevron-back" size={16} color="#FF7828" />
        <Text style={{ color: '#FF7828', fontSize: 14, fontWeight: '800' }}>Back</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* ── HERO IMAGE ─────────────────────────────────────── */}
        <View style={{ height: HERO_H, width: SW, overflow: 'hidden' }}>
          {/* Team colour ambient glow */}
          <LinearGradient
            colors={[`${teamColor}55`, `${teamColor}18`, 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Player headshot — full hero */}
          <Image
            source={{ uri: headshotUrl }}
            style={{ position: 'absolute', bottom: 0, left: '50%', transform: [{ translateX: -125 }], width: 250, height: 320 }}
            contentFit="contain"
            transition={300}
          />

          {/* Bottom liquid glass blend */}
          <LinearGradient
            colors={['transparent', 'rgba(10,14,20,0.55)', 'rgba(10,14,20,0.88)', '#0A0E14']}
            locations={[0.4, 0.65, 0.82, 1]}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: HERO_H * 0.65 }}
          />

          {/* BlurView stripe at the transition point */}
          <BlurView
            intensity={18}
            tint="dark"
            style={{
              position: 'absolute',
              bottom: OVERLAP - 8,
              left: 0,
              right: 0,
              height: 60,
            }}
          />

          {/* Player name + meta overlaid */}
          <View style={{ position: 'absolute', bottom: OVERLAP + 10, left: 22, right: 22 }}>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 }}>
              #{player.primaryNumber}  ·  {player.primaryPosition}
              {player.currentTeam ? `  ·  ${player.currentTeam}` : ''}
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '900', letterSpacing: -1, lineHeight: 40 }}>
              {player.firstName}{'\n'}{player.lastName}
            </Text>
          </View>
        </View>

        {/* ── CONTENT — overlaps hero bottom ─────────────────── */}
        <View
          style={{
            marginTop: -OVERLAP,
            backgroundColor: '#0A0E14',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 24,
            paddingHorizontal: 20,
            paddingBottom: 50,
          }}
        >
          {/* Info tiles */}
          <View style={{ flexDirection: 'row', marginHorizontal: -4, marginBottom: 32 }}>
            {player.currentAge && (
              <InfoTile label="Age" value={String(player.currentAge)} />
            )}
            {player.batSide && player.pitchHand && (
              <InfoTile label="Bat/Throw" value={`${player.batSide}/${player.pitchHand}`} />
            )}
            {player.height && player.weight && (
              <InfoTile label="Height/Weight" value={`${player.height}/${player.weight}`} />
            )}
          </View>

          {/* Season summary */}
          <StatTable
            title={`${new Date().getFullYear()} Summary`}
            columns={seasonCols}
            values={seasonVals}
          />

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 24 }} />

          {/* Career summary */}
          <StatTable
            title="Career Summary"
            columns={careerCols}
            values={careerVals}
          />

          {/* Birth info */}
          {(player.birthCity || player.birthCountry) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.2)" />
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
                {[player.birthCity, player.birthCountry].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
