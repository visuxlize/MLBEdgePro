/**
 * PaywallGate — wraps paid-only content.
 *
 * Free users see:
 *   - A dimmed, non-interactive preview of the content beneath
 *   - A lock card with the feature name and an "Upgrade to Pro" CTA
 *
 * Pro users see:
 *   - The children rendered normally
 */

import { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/src/hooks/useSubscription';

interface Props {
  children: ReactNode;
  /** Short feature label shown in the lock overlay, e.g. "Prop Builder" */
  feature?: string;
  /** Bullet points explaining what pro unlocks */
  benefits?: string[];
  /** Minimum height so the lock card has room to render */
  minHeight?: number;
}

const DEFAULT_BENEFITS = [
  'HR, Hit & multi-hit props',
  'Pitcher strikeout projections',
  'Edge Report & AI insights',
  'Full batter matchup analysis',
];

export function PaywallGate({
  children,
  feature = 'Pro Feature',
  benefits = DEFAULT_BENEFITS,
  minHeight = 420,
}: Props) {
  const { isPro, isLoaded } = useSubscription();

  // Still loading — render nothing to avoid flash
  if (!isLoaded) return null;

  // Pro user — render content as-is
  if (isPro) return <>{children}</>;

  // Free user — dimmed preview + lock overlay
  return (
    <View style={{ position: 'relative', minHeight }}>
      {/* Dimmed non-interactive preview */}
      <View
        style={{ opacity: 0.18 }}
        pointerEvents="none"
      >
        {children}
      </View>

      {/* Dark gradient fade over preview */}
      <LinearGradient
        colors={['rgba(10,14,20,0)', 'rgba(10,14,20,0.80)', 'rgba(10,14,20,0.98)']}
        locations={[0, 0.35, 0.65]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />

      {/* Lock card */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          alignItems: 'center',
        }}
      >
        {/* Lock icon */}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: 'rgba(255,120,40,0.12)',
            borderWidth: 1,
            borderColor: 'rgba(255,120,40,0.30)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <Ionicons name="lock-closed" size={24} color="#FF7828" />
        </View>

        {/* Headline */}
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 20,
            fontWeight: '900',
            letterSpacing: -0.3,
            marginBottom: 6,
            textAlign: 'center',
          }}
        >
          {feature}
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 13,
            textAlign: 'center',
            marginBottom: 18,
            lineHeight: 18,
          }}
        >
          Unlock with Edge Pro — $4.99/month
        </Text>

        {/* Benefits list */}
        <View style={{ alignSelf: 'stretch', marginBottom: 20, gap: 8 }}>
          {benefits.map((b) => (
            <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: 'rgba(80,200,130,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Ionicons name="checkmark" size={12} color="#50C882" />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, flex: 1 }}>{b}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={() => router.push('/upgrade' as any)}
          activeOpacity={0.85}
          style={{ alignSelf: 'stretch' }}
        >
          <LinearGradient
            colors={['#FFA550', '#FF7828', '#C85014']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 52,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              shadowColor: '#FF7828',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.45,
              shadowRadius: 16,
            }}
          >
            <Ionicons name="flash" size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>
              Upgrade to Edge Pro
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text
          style={{
            color: 'rgba(255,255,255,0.18)',
            fontSize: 11,
            marginTop: 12,
            textAlign: 'center',
          }}
        >
          Cancel anytime · Billed monthly
        </Text>
      </View>
    </View>
  );
}
