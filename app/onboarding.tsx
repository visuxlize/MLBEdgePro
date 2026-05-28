import { useRef, useState, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  Line,
  Path,
  Polyline,
  RadialGradient,
  Stop,
  Rect,
  G,
} from 'react-native-svg';
import { MLBEdgeLogo } from '@/src/components/MLBEdgeLogo';
import { useAuth } from '@/src/hooks/useAuth';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Per-slide SVG illustrations ──────────────────────────────────────────────

/** Slide 1: Baseball radar analytics logo */
function Slide1Visual() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer pulse ring */}
      <View
        style={{
          position: 'absolute',
          width: 240,
          height: 240,
          borderRadius: 120,
          borderWidth: 1,
          borderColor: 'rgba(255,120,40,0.12)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: 100,
          borderWidth: 1,
          borderColor: 'rgba(255,120,40,0.18)',
        }}
      />
      <MLBEdgeLogo size={170} showRadar />
    </View>
  );
}

/** Slide 2: Shield with data bars — "not a betting app" */
function Slide2Visual() {
  const s = 170;
  const c = s / 2;
  // Shield path (simplified) — 170x170
  const shieldPath = `
    M ${c} 10
    L ${s - 18} 28
    L ${s - 12} ${s * 0.55}
    C ${s - 12} ${s * 0.8}, ${c} ${s - 10}, ${c} ${s - 10}
    C ${c} ${s - 10}, 12 ${s * 0.8}, 12 ${s * 0.55}
    L 18 28
    Z
  `;
  // 3 data bars inside the shield
  const bars = [
    { x: 38, y: 78, w: 94, h: 10, ratio: 1.0 },
    { x: 38, y: 98, w: 94, h: 10, ratio: 0.72 },
    { x: 38, y: 118, w: 94, h: 10, ratio: 0.88 },
  ];

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: 'rgba(255,120,40,0.07)',
        }}
      />
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Defs>
          <RadialGradient id="shieldGlow" cx="50%" cy="40%" r="50%">
            <Stop offset="0%" stopColor="#FF7828" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#FF7828" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {/* Shield fill */}
        <Path d={shieldPath} fill="url(#shieldGlow)" />
        {/* Shield border */}
        <Path d={shieldPath} fill="none" stroke="#FF7828" strokeWidth={2} strokeLinejoin="round" opacity={0.7} />
        {/* Checkmark at top center */}
        <Polyline
          points={`${c - 12},${c - 14} ${c - 4},${c - 4} ${c + 16},${c - 26}`}
          fill="none"
          stroke="#FF7828"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data bars */}
        {bars.map((b, i) => (
          <G key={i}>
            {/* Bar background */}
            <Rect x={b.x} y={b.y} width={b.w} height={b.h} rx={b.h / 2} fill="rgba(255,120,40,0.10)" />
            {/* Bar fill */}
            <Rect x={b.x} y={b.y} width={b.w * b.ratio} height={b.h} rx={b.h / 2} fill="#FF7828" opacity={0.8} />
          </G>
        ))}
      </Svg>
    </View>
  );
}

/** Slide 3: Upward trend line — "gets smarter every day" */
function Slide3Visual() {
  const s = 170;
  // Grid lines
  const gridYs = [40, 70, 100, 130];
  // Trend data points (x, y) — upward trend
  const trendPts: [number, number][] = [
    [20, 130], [42, 118], [65, 105], [88, 88], [110, 68], [133, 48], [150, 30],
  ];
  const trendStr = trendPts.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: 'rgba(255,120,40,0.07)',
        }}
      />
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Defs>
          <RadialGradient id="trendGlow" cx="85%" cy="20%" r="50%">
            <Stop offset="0%" stopColor="#FF7828" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#FF7828" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {/* Glow at peak */}
        <Circle cx={150} cy={30} r={30} fill="url(#trendGlow)" />
        {/* Grid lines */}
        {gridYs.map((y) => (
          <Line key={y} x1={10} y1={y} x2={s - 10} y2={y} stroke="rgba(255,120,40,0.10)" strokeWidth={0.8} />
        ))}
        {/* Trend fill path (area under curve) */}
        <Path
          d={`M 20 140 L ${trendPts.map(([x, y]) => `${x} ${y}`).join(' L ')} L 150 140 Z`}
          fill="rgba(255,120,40,0.12)"
        />
        {/* Trend line */}
        <Polyline
          points={trendStr}
          fill="none"
          stroke="#FF7828"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data point circles */}
        {trendPts.map(([x, y], i) => (
          <G key={i}>
            <Circle cx={x} cy={y} r={i === trendPts.length - 1 ? 6 : 3.5} fill="rgba(255,120,40,0.25)" />
            <Circle cx={x} cy={y} r={i === trendPts.length - 1 ? 3.5 : 2} fill="#FF7828" />
          </G>
        ))}
        {/* Baseball seams on last (peak) dot */}
        <Path
          d={`M ${150 - 4} ${30 - 6} C ${150 - 8} ${30 - 2}, ${150 - 8} ${30 + 4}, ${150 - 4} ${30 + 6}`}
          stroke="#FF7828" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.7}
        />
        <Path
          d={`M ${150 + 4} ${30 - 6} C ${150 + 8} ${30 - 2}, ${150 + 8} ${30 + 4}, ${150 + 4} ${30 + 6}`}
          stroke="#FF7828" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.7}
        />
      </Svg>
    </View>
  );
}

// ─── Slide data ───────────────────────────────────────────────────────────────

type SlideData = {
  key: string;
  tag: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  glowTop: string;
  glowRight: string;
};

const SLIDES: SlideData[] = [
  {
    key: '1',
    tag: 'INTRODUCING',
    title: 'Your MLB\nEdge Pro',
    body: 'Real-time scores, advanced pitcher analytics, and AI-powered game predictions — built for how you follow baseball.',
    visual: <Slide1Visual />,
    glowTop: 'rgba(255,120,40,0.18)',
    glowRight: 'rgba(255,120,40,0.10)',
  },
  {
    key: '2',
    tag: 'RESPONSIBLE GAMING',
    title: 'Smart Betting\nAssistance',
    body: 'MLB Edge Pro provides data-driven analysis to help inform your decisions. This is not a betting app — we offer educational insights only. Always gamble responsibly.',
    visual: <Slide2Visual />,
    glowTop: 'rgba(80,120,255,0.12)',
    glowRight: 'rgba(80,180,255,0.08)',
  },
  {
    key: '3',
    tag: 'ALWAYS IMPROVING',
    title: 'Gets Smarter\nEvery Day',
    body: "Our model analyzes thousands of data points across every game. Predictions aren't always perfect — but the more data we process, the sharper the edge becomes.",
    visual: <Slide3Visual />,
    glowTop: 'rgba(80,200,130,0.12)',
    glowRight: 'rgba(80,200,130,0.07)',
  },
];

// ─── Dot indicator ────────────────────────────────────────────────────────────

function DotIndicator({ count, scrollX }: { count: number; scrollX: Animated.Value }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => {
        const inputRange = [(i - 1) * SW, i * SW, (i + 1) * SW];
        const width = scrollX.interpolate({
          inputRange,
          outputRange: [6, 22, 6],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            style={{
              width,
              height: 6,
              borderRadius: 3,
              backgroundColor: '#FF7828',
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { markOnboardingComplete } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<SlideData>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      markOnboardingComplete();
      router.replace('/auth/signup' as any);
    }
  }, [currentIndex, markOnboardingComplete]);

  const handleSkip = useCallback(() => {
    markOnboardingComplete();
    router.replace('/auth/login' as any);
  }, [markOnboardingComplete]);

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const renderItem = useCallback(({ item }: { item: SlideData }) => (
    <View style={{ width: SW, flex: 1 }}>
      {/* Per-slide glow */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: SW * 0.7,
          height: SW * 0.7,
          borderRadius: SW * 0.35,
          backgroundColor: item.glowTop,
          transform: [{ scaleX: 1.4 }],
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: SH * 0.25,
          left: -80,
          width: SW * 0.6,
          height: SW * 0.6,
          borderRadius: SW * 0.3,
          backgroundColor: item.glowRight,
          transform: [{ scaleX: 1.3 }],
        }}
      />

      {/* Visual illustration */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 20 }}>
        {item.visual}
      </View>

      {/* Text content */}
      <View
        style={{
          paddingHorizontal: 32,
          paddingBottom: 20,
          minHeight: SH * 0.26,
        }}
      >
        <Text
          style={{
            color: '#FF7828',
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 2.5,
            marginBottom: 10,
          }}
        >
          {item.tag}
        </Text>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 34,
            fontWeight: '900',
            letterSpacing: -0.8,
            lineHeight: 40,
            marginBottom: 14,
          }}
        >
          {item.title}
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 15,
            lineHeight: 22,
            fontWeight: '400',
          }}
        >
          {item.body}
        </Text>
      </View>
    </View>
  ), []);

  return (
    <LinearGradient colors={['#0A0E14', '#0D1220', '#0A0E14']} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      {/* Skip button */}
      {!isLastSlide && (
        <TouchableOpacity
          onPress={handleSkip}
          activeOpacity={0.7}
          style={{
            position: 'absolute',
            top: 60,
            right: 24,
            zIndex: 10,
            paddingVertical: 6,
            paddingHorizontal: 14,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.07)',
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600' }}>
            Skip
          </Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef as any}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={{ flex: 1 }}
      />

      {/* Bottom nav */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 32,
          paddingBottom: 54,
          paddingTop: 16,
        }}
      >
        <DotIndicator count={SLIDES.length} scrollX={scrollX} />

        <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
          <LinearGradient
            colors={['#FFA550', '#FF7828', '#C85014']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 52,
              paddingHorizontal: 28,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#FF7828',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.5,
              shadowRadius: 14,
              flexDirection: 'row',
              gap: 6,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 }}>
              {isLastSlide ? 'Get Started' : 'Next'}
            </Text>
            {!isLastSlide && (
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>→</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}
