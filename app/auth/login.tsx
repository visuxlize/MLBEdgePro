import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/hooks/useAuth';
import { MLBEdgeLogo } from '@/src/components/MLBEdgeLogo';

export default function LoginScreen() {
  const { logIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    const result = await logIn(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace('/(tabs)/games' as any);
  };

  const FIELD_BG = '#191C22';

  return (
    <LinearGradient colors={['#0A0E14', '#0D1220', '#0A0E14']} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      {/* Ambient glow */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -80,
          right: -60,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: 'rgba(255,120,40,0.12)',
          transform: [{ scaleX: 1.4 }],
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 44 }}>
            <MLBEdgeLogo size={120} showRadar />
            <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 16 }}>
              MLB Edge Pro
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 6 }}>
              Sign in to your account
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 14 }}>
            {/* Email */}
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
                EMAIL
              </Text>
              <View style={{ backgroundColor: FIELD_BG, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 54, overflow: 'hidden' }}>
                <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  keyboardAppearance="dark"
                  style={{ flex: 1, color: '#FFFFFF', fontSize: 16, backgroundColor: FIELD_BG }}
                />
              </View>
            </View>

            {/* Password */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>
                  PASSWORD
                </Text>
              </View>
              <View style={{ backgroundColor: FIELD_BG, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 54, overflow: 'hidden' }}>
                <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  autoComplete="current-password"
                  keyboardAppearance="dark"
                  style={{ flex: 1, color: '#FFFFFF', fontSize: 16, backgroundColor: FIELD_BG }}
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} activeOpacity={0.7}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.35)" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {!!error && (
              <View style={{ backgroundColor: 'rgba(235,80,90,0.12)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(235,80,90,0.25)', padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="alert-circle-outline" size={16} color="#EB505A" style={{ marginRight: 8 }} />
                <Text style={{ color: '#EB505A', fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            )}

            {/* Sign In Button */}
            <TouchableOpacity onPress={handleLogin} activeOpacity={0.85} disabled={loading} style={{ marginTop: 6 }}>
              <LinearGradient
                colors={['#FFA550', '#FF7828', '#C85014']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#FF7828', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 16 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Sign Up link */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/signup' as any)} activeOpacity={0.7}>
                <Text style={{ color: '#FF7828', fontSize: 14, fontWeight: '700' }}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
