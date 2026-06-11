/**
 * Onboarding — 4 steps:
 *  1. Welcome / value prop
 *  2. Plan picker (Free vs Pro) — with "Continue Free" escape hatch
 *  3. Favorite team selection
 *  4. You're in / success
 */

import { useRef, useState, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MLBEdgeLogo } from '@/src/components/MLBEdgeLogo';
import { TeamLogo } from '@/src/components/TeamLogo';
import { useAuth } from '@/src/hooks/useAuth';
import { useSettings } from '@/src/hooks/useSettings';

const { width: SW } = Dimensions.get('window');

// ─── Data ─────────────────────────────────────────────────────────────────────

const FREE_FEATURES = [
  { icon: 'baseball-outline',     text: "Today's full game schedule" },
  { icon: 'radio-button-on',      text: 'Live scores & game status' },
  { icon: 'trophy-outline',       text: 'Win prediction (home/away)' },
  { icon: 'partly-sunny-outline', text: 'Stadium weather conditions' },
];

const PRO_FEATURES = [
  { icon: 'flame-outline',       text: 'Home Run props & probabilities' },
  { icon: 'baseball',            text: 'Hit & multi-hit props (1+, 2+)' },
  { icon: 'flash-outline',       text: 'Pitcher strikeout projections' },
  { icon: 'trending-up-outline', text: 'Edge Report — AI value bets' },
  { icon: 'person-outline',      text: 'Full batter vs pitcher analysis' },
  { icon: 'layers-outline',      text: 'Prop Builder & slip tracking' },
];

const ALL_TEAMS = [
  { id: 108, name: 'Los Angeles Angels' }, { id: 109, name: 'Arizona Diamondbacks' },
  { id: 110, name: 'Baltimore Orioles' },  { id: 111, name: 'Boston Red Sox' },
  { id: 112, name: 'Chicago Cubs' },       { id: 113, name: 'Cincinnati Reds' },
  { id: 114, name: 'Cleveland Guardians' },{ id: 115, name: 'Colorado Rockies' },
  { id: 116, name: 'Detroit Tigers' },     { id: 117, name: 'Houston Astros' },
  { id: 118, name: 'Kansas City Royals' }, { id: 119, name: 'Los Angeles Dodgers' },
  { id: 120, name: 'Washington Nationals' },{ id: 121, name: 'New York Mets' },
  { id: 133, name: 'Athletics' },          { id: 134, name: 'Pittsburgh Pirates' },
  { id: 135, name: 'San Diego Padres' },   { id: 136, name: 'Seattle Mariners' },
  { id: 137, name: 'San Francisco Giants' },{ id: 138, name: 'St. Louis Cardinals' },
  { id: 139, name: 'Tampa Bay Rays' },     { id: 140, name: 'Texas Rangers' },
  { id: 141, name: 'Toronto Blue Jays' },  { id: 142, name: 'Minnesota Twins' },
  { id: 143, name: 'Philadelphia Phillies' },{ id: 144, name: 'Atlanta Braves' },
  { id: 145, name: 'Chicago White Sox' },  { id: 146, name: 'Miami Marlins' },
  { id: 147, name: 'New York Yankees' },   { id: 158, name: 'Milwaukee Brewers' },
].sort((a, b) => a.name.localeCompare(b.name));

// ─── Step 1 — Welcome ─────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 28 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 20 }}>
        {/* Rings */}
        {[240, 200, 160].map((s, i) => (
          <View key={s} style={{ position: 'absolute', width: s, height: s, borderRadius: s / 2, borderWidth: 1, borderColor: `rgba(255,120,40,${0.08 + i * 0.04})` }} />
        ))}
        <MLBEdgeLogo size={160} showRadar />
      </View>

      <View style={{ paddingBottom: 16 }}>
        <Text style={{ color: '#FF7828', fontSize: 10, fontWeight: '900', letterSpacing: 2.5, marginBottom: 10 }}>
          WELCOME TO
        </Text>
        <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '900', letterSpacing: -1, lineHeight: 42, marginBottom: 14 }}>
          MLB Edge Pro
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.50)', fontSize: 15, lineHeight: 22, marginBottom: 28 }}>
          Data-driven game predictions, prop analysis, and edge reports — built for serious MLB bettors.
        </Text>

        {[
          'Win predictions for every game',
          'HR, Hit & strikeout props',
          'AI-ranked value bets — the Edge Report',
        ].map((t) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(80,200,130,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark" size={12} color="#50C882" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>{t}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={onNext} activeOpacity={0.85}>
        <LinearGradient
          colors={['#FFA550', '#FF7828', '#C85014']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, shadowColor: '#FF7828', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 16 }}
        >
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Get Started</Text>
          <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ─── Step 2 — Plan picker ─────────────────────────────────────────────────────

function StepPlan({ onPro, onFree }: { onPro: () => void; onFree: () => void }) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ alignItems: 'center', marginBottom: 22, marginTop: 8 }}>
        <Text style={{ color: '#FF7828', fontSize: 10, fontWeight: '900', letterSpacing: 2.5, marginBottom: 8 }}>CHOOSE YOUR PLAN</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, textAlign: 'center', lineHeight: 34 }}>
          Free to start.{'\n'}Pro when you're ready.
        </Text>
      </View>

      {/* Free card */}
      <View style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#111622', padding: 18, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>Free Plan</Text>
          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Always free</Text>
        </View>
        {FREE_FEATURES.map((f) => (
          <View key={f.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 }}>
            <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={f.icon as any} size={14} color="rgba(255,255,255,0.40)" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.50)', fontSize: 13 }}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* Pro card */}
      <View style={{ borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,120,40,0.35)', backgroundColor: 'rgba(255,120,40,0.05)', padding: 18, marginBottom: 16, overflow: 'hidden' }}>
        {/* Glow blob */}
        <View pointerEvents="none" style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,120,40,0.10)' }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="flash" size={12} color="#FF7828" />
            <Text style={{ color: '#FF7828', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>Edge Pro</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
            <Text style={{ color: '#FF7828', fontSize: 22, fontWeight: '900' }}>$4.99</Text>
            <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 12 }}>/mo</Text>
          </View>
        </View>

        {PRO_FEATURES.map((f) => (
          <View key={f.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 }}>
            <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: 'rgba(255,120,40,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={f.icon as any} size={14} color="#FF7828" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.70)', fontSize: 13 }}>{f.text}</Text>
          </View>
        ))}

        <TouchableOpacity onPress={onPro} activeOpacity={0.85} style={{ marginTop: 6 }}>
          <LinearGradient
            colors={['#FFA550', '#FF7828', '#C85014']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, shadowColor: '#FF7828', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.40, shadowRadius: 12 }}
          >
            <Ionicons name="flash" size={15} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Start Edge Pro — $4.99/mo</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Continue Free */}
      <TouchableOpacity onPress={onFree} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 14 }}>
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, fontWeight: '600' }}>
          Continue with Free Plan →
        </Text>
      </TouchableOpacity>

      <Text style={{ color: 'rgba(255,255,255,0.13)', fontSize: 11, textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 }}>
        Cancel Pro anytime · No contracts · Free plan always available
      </Text>
    </ScrollView>
  );
}

// ─── Step 3 — Team picker ─────────────────────────────────────────────────────

function StepTeam({ onNext }: { onNext: () => void }) {
  const { settings, updateSettings } = useSettings();

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 24, paddingBottom: 14 }}>
        <Text style={{ color: '#FF7828', fontSize: 10, fontWeight: '900', letterSpacing: 2.5, marginBottom: 6 }}>STEP 3</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 }}>
          Your Favorite Team
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: 14, lineHeight: 20 }}>
          We'll feature your team at the top of every game day.{' '}
          <Text style={{ color: 'rgba(255,255,255,0.25)' }}>Skip to choose later.</Text>
        </Text>
      </View>

      <FlatList
        data={ALL_TEAMS}
        keyExtractor={(t) => t.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const selected = settings.favoriteTeamId === item.id;
          return (
            <TouchableOpacity
              onPress={() => updateSettings({ favoriteTeamId: item.id, favoriteTeamName: item.name })}
              activeOpacity={0.75}
              style={{ marginBottom: 8 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16, borderWidth: 1, borderColor: selected ? 'rgba(255,120,40,0.40)' : 'rgba(255,255,255,0.07)', backgroundColor: selected ? 'rgba(255,120,40,0.08)' : '#111622' }}>
                <TeamLogo teamId={item.id} teamName={item.name} size={36} />
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: selected ? '700' : '500', marginLeft: 12, flex: 1 }}>
                  {item.name}
                </Text>
                {selected && <Ionicons name="checkmark-circle" size={20} color="#FF7828" />}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={{ paddingHorizontal: 22, paddingBottom: 50, gap: 10 }}>
        <TouchableOpacity onPress={onNext} activeOpacity={0.85}>
          <LinearGradient
            colors={settings.favoriteTeamId ? ['#FFA550', '#FF7828', '#C85014'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: settings.favoriteTeamId ? '#FFF' : 'rgba(255,255,255,0.35)', fontSize: 15, fontWeight: '800' }}>
              {settings.favoriteTeamId ? 'Continue' : 'Continue without a team'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Step 4 — Success ─────────────────────────────────────────────────────────

function StepSuccess({ onFinish }: { onFinish: () => void }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center' }}>
      {/* Pulse rings */}
      {[280, 230, 180].map((s) => (
        <View key={s} pointerEvents="none" style={{ position: 'absolute', alignSelf: 'center', width: s, height: s, borderRadius: s / 2, borderWidth: 1, borderColor: `rgba(80,200,130,${0.06 + (280 - s) * 0.001})` }} />
      ))}

      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <View style={{ width: 96, height: 96, borderRadius: 30, backgroundColor: 'rgba(80,200,130,0.12)', borderWidth: 1.5, borderColor: 'rgba(80,200,130,0.30)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <Ionicons name="checkmark" size={44} color="#50C882" />
        </View>
        <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '900', letterSpacing: -1, marginBottom: 10, textAlign: 'center' }}>
          You're in!
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 280 }}>
          Your personalized MLB dashboard is ready. Time to find your edge.
        </Text>
      </View>

      <View style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: '#111622', padding: 18, marginBottom: 28 }}>
        <Text style={{ color: '#FF7828', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 12 }}>YOUR NEXT STEPS</Text>
        {[
          { icon: 'baseball-outline',  text: "Check today's game slate" },
          { icon: 'flash-outline',     text: 'Browse the Edge Report' },
          { icon: 'layers-outline',    text: 'Build your first prop slip' },
        ].map((item) => (
          <View key={item.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,120,40,0.10)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={item.icon as any} size={15} color="#FF7828" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.60)', fontSize: 14 }}>{item.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={onFinish} activeOpacity={0.85}>
        <LinearGradient
          colors={['#FFA550', '#FF7828', '#C85014']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#FF7828', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 16 }}
        >
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Open My Dashboard</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ─── Step dots ────────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === current ? '#FF7828' : 'rgba(255,255,255,0.15)',
          }}
        />
      ))}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const { markOnboardingComplete } = useAuth();
  const [step, setStep] = useState(0);

  const next = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)), []);

  const finish = useCallback(async () => {
    await markOnboardingComplete();
    router.replace('/auth/signup' as any);
  }, [markOnboardingComplete]);

  const goToPro = useCallback(() => {
    // Navigate to upgrade after onboarding completes
    next();
  }, [next]);

  const goFree = useCallback(() => {
    next();
  }, [next]);

  return (
    <LinearGradient colors={['#0A0E14', '#0D1220', '#0A0E14']} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      {/* Ambient glow */}
      <View pointerEvents="none" style={{ position: 'absolute', top: -80, right: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,120,40,0.10)', transform: [{ scaleX: 1.4 }] }} />

      {/* Step indicator — show on steps 0–2, hide on success */}
      {step < 3 && (
        <View style={{ paddingTop: 60, paddingHorizontal: 28, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <StepDots current={step} total={TOTAL_STEPS} />
          {step > 0 && step < 3 && (
            <TouchableOpacity
              onPress={finish}
              activeOpacity={0.7}
              style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '600' }}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {step === 0 && (
        <Animated.View style={{ flex: 1, paddingTop: step === 0 ? 0 : undefined }}>
          <StepWelcome onNext={next} />
        </Animated.View>
      )}
      {step === 1 && <StepPlan onPro={goToPro} onFree={goFree} />}
      {step === 2 && <StepTeam onNext={next} />}
      {step === 3 && (
        <View style={{ flex: 1, paddingTop: 60 }}>
          <StepSuccess onFinish={finish} />
        </View>
      )}
    </LinearGradient>
  );
}
