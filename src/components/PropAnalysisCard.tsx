import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Text, View } from 'react-native';
import { GlassCard } from './GlassCard';
import { StatBadge } from './StatBadge';
import { fetchPitcherStats, type Player } from '@/src/api/mlb';
import { queryKeys } from '@/src/constants/queryKeys';

interface PropAnalysisCardProps {
  pitcher: Player;
  pitcherTeam: string;
  opposingTeam: string;
}

interface PropLine {
  label: string;
  probability: number;
}

function propColor(pct: number): string {
  if (pct >= 65) return '#50C882';
  if (pct >= 45) return '#FF7828';
  return '#EB505A';
}

function eraColor(era: string): string {
  const v = parseFloat(era);
  return v < 3.0 ? '#EB505A' : v < 4.0 ? '#FF7828' : '#50C882';
}

function whipColor(whip: string): string {
  const v = parseFloat(whip);
  return v < 1.1 ? '#EB505A' : v < 1.3 ? '#FF7828' : '#50C882';
}

export function PropAnalysisCard({ pitcher, pitcherTeam, opposingTeam }: PropAnalysisCardProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: queryKeys.pitcher.stats(pitcher.id),
    queryFn: () => fetchPitcherStats(pitcher.id),
    enabled: !!pitcher.id,
  });

  if (isLoading) {
    return (
      <GlassCard style={{ padding: 16, marginBottom: 8, alignItems: 'center' }}>
        <ActivityIndicator color="#FF7828" size="small" />
      </GlassCard>
    );
  }

  if (!stats) return null;

  const era = parseFloat(stats.era) || 4.5;
  const whip = parseFloat(stats.whip) || 1.3;
  const ip = parseFloat(stats.inningsPitched) || 1;
  const k9 = (stats.strikeOuts / (ip / 9)).toFixed(1);

  const props: PropLine[] = [
    {
      label: 'Batters face K',
      probability: Math.min(95, Math.round(30 + (stats.strikeOuts / Math.max(ip, 1)) * 10)),
    },
    {
      label: 'Over 0.5 hits allowed',
      probability: Math.min(95, Math.round(100 - Math.max(0, (5 - era) * 8))),
    },
    {
      label: 'HR allowed',
      probability: Math.min(90, Math.round(era > 4.5 ? 55 : era > 3.5 ? 40 : 25)),
    },
    {
      label: `WHIP ${whip < 1.1 ? 'Low' : whip < 1.3 ? 'Mid' : 'High'}`,
      probability: Math.min(95, Math.round(whip < 1.1 ? 72 : whip < 1.3 ? 55 : 38)),
    },
  ];

  return (
    <GlassCard style={{ padding: 16, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>{pitcher.fullName}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
            {pitcherTeam} vs {opposingTeam}
          </Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <StatBadge label="ERA" value={stats.era} color={eraColor(stats.era)} />
          <StatBadge label="WHIP" value={stats.whip} color={whipColor(stats.whip)} />
          <StatBadge label="K/9" value={k9} color="#FF7828" />
        </View>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10, gap: 8 }}>
        {props.map((p) => (
          <View key={p.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, flex: 1 }}>{p.label}</Text>
            <View
              style={{
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 3,
                backgroundColor: `${propColor(p.probability)}22`,
                borderWidth: 1,
                borderColor: `${propColor(p.probability)}44`,
              }}
            >
              <Text style={{ color: propColor(p.probability), fontSize: 12, fontWeight: '800' }}>
                {p.probability}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}
