/**
 * Upgrade / Paywall screen
 *
 * Uses RevenueCat to purchase the monthly Pro subscription.
 * After a successful purchase RevenueCat fires the webhook →
 * your backend sets publicMetadata.isPro = true on the Clerk user →
 * useSubscription() updates on the next render.
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import { MLBEdgeLogo } from '@/src/components/MLBEdgeLogo';
import { useSubscription } from '@/src/hooks/useSubscription';
import { getProOffering, purchasePro, restorePurchases } from '@/src/services/purchases';

// ─── Feature comparison data ──────────────────────────────────────────────────

const FREE_FEATURES = [
  { icon: 'baseball-outline',      label: "Today's full game schedule" },
  { icon: 'stats-chart-outline',   label: 'Live scores & game status' },
  { icon: 'trophy-outline',        label: 'Win prediction (home / away)' },
  { icon: 'calendar-outline',      label: 'Upcoming matchup overview' },
  { icon: 'partly-sunny-outline',  label: 'Stadium weather conditions' },
];

const PRO_FEATURES = [
  { icon: 'flame-outline',         label: 'Home Run props & probabilities',      highlight: true },
  { icon: 'baseball-outline',      label: 'Hit & multi-hit props (1+, 2+)',       highlight: true },
  { icon: 'flash-outline',         label: 'Pitcher strikeout projections',        highlight: true },
  { icon: 'trending-up-outline',   label: 'Edge Report — AI-ranked value bets',  highlight: true },
  { icon: 'person-outline',        label: 'Full batter vs pitcher analysis',      highlight: true },
  { icon: 'layers-outline',        label: 'Prop Builder & multi-leg slips',       highlight: false },
  { icon: 'bookmark-outline',      label: 'Save & track your bet slips',          highlight: false },
  { icon: 'notifications-outline', label: 'Priority data refresh',               highlight: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FeatureRow({ icon, label, highlight = false }: { icon: string; label: string; highlight?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: highlight ? 'rgba(255,120,40,0.12)' : 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Ionicons name={icon as any} size={16} color={highlight ? '#FF7828' : 'rgba(255,255,255,0.40)'} />
      </View>
      <Text style={{ color: highlight ? '#FFFFFF' : 'rgba(255,255,255,0.50)', fontSize: 14, fontWeight: highlight ? '600' : '400', flex: 1 }}>
        {label}
      </Text>
      {highlight && <Ionicons name="checkmark-circle" size={18} color="#FF7828" />}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function UpgradeScreen() {
  const insets = useSafeAreaInsets();
  const { isPro } = useSubscription();

  // Price display pulled from StoreKit/Google Play via RevenueCat
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [offeringLoaded, setOfferingLoaded] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    getProOffering()
      .then((offering) => {
        setMonthlyPackage(offering?.monthly ?? null);
      })
      .finally(() => setOfferingLoaded(true));
  }, []);

  // Display price: use live StoreKit price if available, fallback to $4.99
  const priceString = monthlyPackage?.product?.priceString ?? '$4.99';

  const handleSubscribe = async () => {
    setPurchasing(true);
    const result = await purchasePro();
    setPurchasing(false);

    if (!result.ok) {
      if (result.userCancelled) return; // user dismissed — no alert needed
      Alert.alert('Purchase Failed', result.error);
      return;
    }

    // Purchase succeeded — the RevenueCat webhook will set publicMetadata.isPro
    // on the Clerk user. useSubscription() will update on the next Clerk poll.
    // Show a success screen and go back.
    Alert.alert(
      '🎉 Welcome to Edge Pro!',
      "You're all set. Your Pro features are now unlocked.",
      [{ text: 'Let\'s go!', onPress: () => router.back() }],
    );
  };

  const handleRestore = async () => {
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);

    if (!result.ok) {
      Alert.alert('Restore Failed', result.error);
      return;
    }

    if (result.isPro) {
      Alert.alert('Restored!', 'Your Pro subscription has been restored.', [
        { text: 'Great!', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('No Active Subscription', "We couldn't find an active subscription on this account.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0E14' }}>
      <StatusBar barStyle="light-content" />

      {/* Background glow */}
      <View pointerEvents="none" style={{ position: 'absolute', top: -100, right: -80, width: 340, height: 340, borderRadius: 170, backgroundColor: 'rgba(255,120,40,0.08)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', bottom: 100, left: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(129,140,248,0.06)' }} />

      {/* Close */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={{ position: 'absolute', top: insets.top + 12, right: 20, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28, paddingHorizontal: 22 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 28 }}>
          <MLBEdgeLogo size={80} showRadar />

          <View style={{ flexDirection: 'row', marginTop: 16, marginBottom: 6 }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(255,120,40,0.15)', borderWidth: 1, borderColor: 'rgba(255,120,40,0.35)' }}>
              <Text style={{ color: '#FF7828', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }}>EDGE PRO</Text>
            </View>
          </View>

          <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center', lineHeight: 36 }}>
            Unlock every edge
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 10, textAlign: 'center', lineHeight: 20 }}>
            Every prop. Every edge. Every advantage.{'\n'}For less than a coffee a month.
          </Text>

          {/* Price badge */}
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            {!offeringLoaded ? (
              <ActivityIndicator color="#FF7828" style={{ marginVertical: 18 }} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ color: '#FF7828', fontSize: 48, fontWeight: '900', letterSpacing: -2, lineHeight: 52 }}>
                  {priceString}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 16, marginBottom: 8 }}>/mo</Text>
              </View>
            )}
            <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, marginTop: 2 }}>Cancel anytime · No contracts</Text>
          </View>
        </View>

        {/* Already Pro */}
        {isPro && (
          <View style={{ backgroundColor: 'rgba(80,200,130,0.10)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(80,200,130,0.30)', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <Ionicons name="checkmark-circle" size={24} color="#50C882" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#50C882', fontSize: 15, fontWeight: '800' }}>You're already on Edge Pro!</Text>
              <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: 12, marginTop: 2 }}>All features are unlocked.</Text>
            </View>
          </View>
        )}

        {/* Pro features */}
        <View style={{ backgroundColor: 'rgba(255,120,40,0.06)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,120,40,0.18)', padding: 18, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: 'rgba(255,120,40,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="flash" size={14} color="#FF7828" />
            </View>
            <Text style={{ color: '#FF7828', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }}>EDGE PRO — EVERYTHING UNLOCKED</Text>
          </View>
          {PRO_FEATURES.map((f) => <FeatureRow key={f.label} icon={f.icon} label={f.label} highlight={f.highlight} />)}
        </View>

        {/* Free features */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 18, marginBottom: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person-outline" size={14} color="rgba(255,255,255,0.40)" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }}>FREE PLAN — ALWAYS INCLUDED</Text>
          </View>
          {FREE_FEATURES.map((f) => (
            <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ionicons name={f.icon as any} size={16} color="rgba(255,255,255,0.35)" />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.50)', fontSize: 14, flex: 1 }}>{f.label}</Text>
              <Ionicons name="checkmark" size={16} color="rgba(255,255,255,0.22)" />
            </View>
          ))}
        </View>

        {/* CTA */}
        {!isPro && (
          <>
            <TouchableOpacity onPress={handleSubscribe} disabled={purchasing || !offeringLoaded} activeOpacity={0.85}>
              <LinearGradient
                colors={['#FFA550', '#FF7828', '#C85014']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ height: 58, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: !offeringLoaded ? 0.6 : 1, shadowColor: '#FF7828', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.50, shadowRadius: 20 }}
              >
                {purchasing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="flash" size={18} color="#FFF" />
                    <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.3 }}>
                      Start Edge Pro — {priceString}/mo
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRestore} disabled={restoring} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 16 }}>
              {restoring ? (
                <ActivityIndicator color="rgba(255,255,255,0.35)" size="small" />
              ) : (
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Restore previous purchase</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Legal */}
        <Text style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 }}>
          Subscription auto-renews at {priceString}/month until cancelled.{'\n'}
          Manage or cancel in {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} settings.{'\n'}
          For educational & entertainment purposes only.
        </Text>
      </ScrollView>
    </View>
  );
}
