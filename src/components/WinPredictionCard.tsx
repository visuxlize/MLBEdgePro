import { useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from './GlassCard';
import type { GamePrediction } from '@/src/utils/predictions';

interface Props {
  prediction: GamePrediction;
  homeTeamName: string;
  awayTeamName: string;
}

function ProbBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  const isBold = pct >= 50;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <View style={{ width: 90 }}>
        <Text style={{ color: isBold ? '#FFFFFF' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: isBold ? '700' : '500' }}>
          {label}{isBold ? ' ★' : ''}
        </Text>
      </View>
      <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, marginHorizontal: 10 }}>
        <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: color }} />
      </View>
      <Text style={{ color, fontSize: 13, fontWeight: '800', width: 38, textAlign: 'right' }}>
        {pct}%
      </Text>
    </View>
  );
}

function FactorRow({ factor, homeTeamName }: { factor: GamePrediction['factors'][0]; homeTeamName: string }) {
  const isHome = factor.advantage === 'home';
  const isAway = factor.advantage === 'away';
  const winnerColor = isHome ? '#50C882' : isAway ? '#FF7828' : 'rgba(255,255,255,0.5)';

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>{factor.name}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginLeft: 6 }}>{factor.weight}%</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2, lineHeight: 17 }}>
            {factor.detail}
          </Text>
        </View>
        <View
          style={{
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
            backgroundColor: `${winnerColor}22`,
            borderWidth: 1,
            borderColor: `${winnerColor}44`,
            minWidth: 60,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: winnerColor, fontSize: 11, fontWeight: '800' }}>
            {factor.advantage === 'neutral' ? 'Neutral' : factor.winner.split(' ').pop()}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function WinPredictionCard({ prediction, homeTeamName, awayTeamName }: Props) {
  const [showFactors, setShowFactors] = useState(false);

  const confColor =
    prediction.confidence === 'High'
      ? '#50C882'
      : prediction.confidence === 'Medium'
        ? '#FF7828'
        : 'rgba(255,255,255,0.5)';

  const homeColor = prediction.homeWinPct >= 55 ? '#50C882' : prediction.homeWinPct <= 45 ? '#EB505A' : 'rgba(255,255,255,0.5)';
  const awayColor = prediction.awayWinPct >= 55 ? '#50C882' : prediction.awayWinPct <= 45 ? '#EB505A' : 'rgba(255,255,255,0.5)';

  return (
    <GlassCard style={{ padding: 16 }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <View>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 2 }}>
            GAME PREDICTION
          </Text>
        </View>
        <View
          style={{
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 5,
            backgroundColor: `${confColor}22`,
            borderWidth: 1,
            borderColor: `${confColor}44`,
          }}
        >
          <Text style={{ color: confColor, fontSize: 12, fontWeight: '800' }}>
            {prediction.confidence} confidence
          </Text>
        </View>
      </View>

      {/* Probability bars */}
      <ProbBar
        label={awayTeamName.split(' ').pop()!}
        pct={prediction.awayWinPct}
        color={awayColor}
      />
      <ProbBar
        label={homeTeamName.split(' ').pop()!}
        pct={prediction.homeWinPct}
        color={homeColor}
      />

      {/* Winner box */}
      <LinearGradient
        colors={['rgba(80,200,130,0.12)', 'rgba(80,200,130,0.05)']}
        style={{
          borderRadius: 12,
          padding: 14,
          marginTop: 8,
          marginBottom: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(80,200,130,0.25)',
        }}
      >
        <View>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>
            PREDICTED WINNER
          </Text>
          <Text style={{ color: '#50C882', fontSize: 18, fontWeight: '900', marginTop: 2 }}>
            {prediction.predictedWinner}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>
            WIN PROBABILITY
          </Text>
          <Text style={{ color: '#50C882', fontSize: 26, fontWeight: '900', marginTop: 1 }}>
            {prediction.predictedWinnerPct}%
          </Text>
        </View>
      </LinearGradient>

      {/* Toggle factors */}
      <TouchableOpacity
        onPress={() => setShowFactors((v) => !v)}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          marginBottom: showFactors ? 16 : 0,
        }}
      >
        <Ionicons
          name={showFactors ? 'chevron-up' : 'chevron-down'}
          size={14}
          color="rgba(255,255,255,0.5)"
          style={{ marginRight: 6 }}
        />
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' }}>
          {showFactors ? 'Hide' : 'Show'} analysis factors
        </Text>
      </TouchableOpacity>

      {showFactors && (
        <View>
          {prediction.factors.map((f) => (
            <FactorRow key={f.name} factor={f} homeTeamName={homeTeamName} />
          ))}

          {/* Model inputs */}
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: 10,
              padding: 12,
              marginTop: 4,
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10 }}>
              MODEL INPUTS
            </Text>
            {[
              ['away era', prediction.inputs.awayEra, 'home era', prediction.inputs.homeEra],
              ['away whip', prediction.inputs.awayWhip, 'home whip', prediction.inputs.homeWhip],
              ['away k/9', prediction.inputs.awayK9, 'home k/9', prediction.inputs.homeK9],
            ].map(([k1, v1, k2, v2]) => (
              <View key={k1} style={{ flexDirection: 'row', marginBottom: 6 }}>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, width: 70 }}>{k1}</Text>
                <Text style={{ color: '#FF7828', fontSize: 12, fontWeight: '700', width: 50 }}>{v1}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, width: 70 }}>{k2}</Text>
                <Text style={{ color: '#FF7828', fontSize: 12, fontWeight: '700' }}>{v2}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </GlassCard>
  );
}
