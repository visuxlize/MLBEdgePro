import { useEffect, useRef } from 'react';
import {
  Animated,
  Linking,
  Modal,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const TRIAL_BASE = 'https://mlbedgepro.dev/trial';

function openTrial(tier: 'fan' | 'pro', onDismiss: () => void) {
  onDismiss();
  Linking.openURL(`${TRIAL_BASE}?tier=${tier}`);
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function TrialToast({ visible, onDismiss }: Props) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 16,
          stiffness: 180,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(0.88);
      opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Blurred backdrop */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 60 : 40}
        tint="dark"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
      >
        {/* Tap outside to dismiss */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onDismiss}
          style={{ position: 'absolute', inset: 0 }}
        />

        <Animated.View style={{ width: '100%', transform: [{ scale }], opacity }}>
          <View
            style={{
              backgroundColor: '#0F1318',
              borderRadius: 28,
              borderWidth: 1,
              borderColor: 'rgba(255,120,40,0.25)',
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.7,
              shadowRadius: 40,
              elevation: 20,
            }}
          >
            {/* Header */}
            <View style={{ padding: 24, paddingBottom: 20, alignItems: 'center' }}>
              {/* Dismiss */}
              <TouchableOpacity
                onPress={onDismiss}
                hitSlop={12}
                style={{ position: 'absolute', top: 16, right: 16, zIndex: 1, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={14} color="rgba(255,255,255,0.40)" />
              </TouchableOpacity>

              {/* Icon */}
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,120,40,0.15)', borderWidth: 1, borderColor: 'rgba(255,120,40,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Ionicons name="flash" size={24} color="#FF7828" />
              </View>

              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center', marginBottom: 6 }}>
                Try Edge Pro free
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                No charge until your trial ends.{'\n'}Card required. Cancel anytime.
              </Text>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 20 }} />

            {/* Tier cards */}
            <View style={{ padding: 20, gap: 12 }}>

              {/* Fan — 14-day */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => openTrial('fan', onDismiss)}
              >
                <LinearGradient
                  colors={['rgba(255,120,40,0.18)', 'rgba(255,100,20,0.10)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,120,40,0.35)', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,120,40,0.20)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Ionicons name="baseball-outline" size={18} color="#FF7828" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <Text style={{ color: '#FF7828', fontSize: 15, fontWeight: '900' }}>Fan</Text>
                      <View style={{ backgroundColor: 'rgba(255,120,40,0.20)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                        <Text style={{ color: '#FF7828', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>14-DAY FREE TRIAL</Text>
                      </View>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Props, Edge Report, matchup analysis</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900' }}>$4.99</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 10 }}>/mo after</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Pro — 3-day */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => openTrial('pro', onDismiss)}
              >
                <LinearGradient
                  colors={['rgba(129,140,248,0.18)', 'rgba(99,102,241,0.10)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 18, borderWidth: 1, borderColor: 'rgba(129,140,248,0.35)', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(129,140,248,0.20)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Ionicons name="star-outline" size={18} color="#818CF8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <Text style={{ color: '#818CF8', fontSize: 15, fontWeight: '900' }}>Pro</Text>
                      <View style={{ backgroundColor: 'rgba(129,140,248,0.20)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                        <Text style={{ color: '#818CF8', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>3-DAY FREE TRIAL</Text>
                      </View>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Spray charts, barrel rate & daily picks</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900' }}>$14.99</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 10 }}>/mo after</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <TouchableOpacity
              onPress={onDismiss}
              activeOpacity={0.7}
              style={{ alignItems: 'center', paddingBottom: 22, paddingTop: 4 }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}
