import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/hooks/useAuth';
import { MLBEdgeLogo } from '@/src/components/MLBEdgeLogo';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/auth/login' as any);
  };

  const handleSignup = async () => {
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!acceptedTerms) {
      setError('You must accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setLoading(true);
    const result = await signUp(name, email, password, acceptedTerms);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace('/(tabs)/games' as any);
  };

  // rgba(255,255,255,0.06) composited on #0A0E14 ≈ #191C22.
  // Using the same solid color on both the container and every TextInput means
  // iOS autofill has nothing to tint — no yellow bleed, no black bar mismatch.
  const FIELD_BG = '#191C22' as const;

  const inputRow = {
    backgroundColor: FIELD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    height: 54,
    overflow: 'hidden' as const,
  };

  const inputText = {
    flex: 1,
    color: '#FFFFFF' as const,
    fontSize: 16,
    backgroundColor: FIELD_BG,
  };

  const passwordText = inputText;

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
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={goBack}
            activeOpacity={0.7}
            style={{
              position: 'absolute',
              top: 60,
              left: 0,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={18} color="#FF7828" />
            <Text style={{ color: '#FF7828', fontSize: 15, fontWeight: '700' }}>Back</Text>
          </TouchableOpacity>

          {/* Brand / Logo */}
          <View style={{ alignItems: 'center', marginBottom: 32, marginTop: 100 }}>
            <MLBEdgeLogo size={120} showRadar />
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 28,
                fontWeight: '900',
                letterSpacing: -0.5,
                marginTop: 16,
              }}
            >
              Create Account
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 6 }}>
              Start tracking MLB edge data
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 14 }}>
            {/* Name */}
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
                YOUR NAME
              </Text>
              <View style={inputRow}>
                <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="John Smith"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  keyboardAppearance="dark"
                  style={inputText}
                />
              </View>
            </View>

            {/* Email */}
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
                EMAIL
              </Text>
              <View style={inputRow}>
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
                  style={inputText}
                />
              </View>
            </View>

            {/* Password */}
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
                PASSWORD
              </Text>
              <View style={inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  keyboardAppearance="dark"
                  style={passwordText}
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} activeOpacity={0.7}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="rgba(255,255,255,0.35)"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
                CONFIRM PASSWORD
              </Text>
              <View style={inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  keyboardAppearance="dark"
                  style={passwordText}
                />
              </View>
            </View>

            {/* Terms acceptance */}
            <TouchableOpacity
              onPress={() => setAcceptedTerms((v) => !v)}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
                paddingVertical: 4,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  borderWidth: 2,
                  borderColor: acceptedTerms ? '#FF7828' : 'rgba(255,255,255,0.25)',
                  backgroundColor: acceptedTerms ? '#FF7828' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                  flexShrink: 0,
                }}
              >
                {acceptedTerms && (
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                )}
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 20, flex: 1 }}>
                {'I have read and agree to the '}
                <Text
                  onPress={() => router.push('/terms' as any)}
                  style={{ color: '#FF7828', fontWeight: '700' }}
                >
                  Terms of Service
                </Text>
                {' and '}
                <Text
                  onPress={() => router.push('/privacy-policy' as any)}
                  style={{ color: '#FF7828', fontWeight: '700' }}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Error */}
            {!!error && (
              <View
                style={{
                  backgroundColor: 'rgba(235,80,90,0.12)',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(235,80,90,0.25)',
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="alert-circle-outline" size={16} color="#EB505A" style={{ marginRight: 8 }} />
                <Text style={{ color: '#EB505A', fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            )}

            {/* Create Account Button */}
            <TouchableOpacity
              onPress={handleSignup}
              activeOpacity={0.85}
              disabled={loading}
              style={{ marginTop: 4, opacity: !acceptedTerms ? 0.5 : 1 }}
            >
              <LinearGradient
                colors={['#FFA550', '#FF7828', '#C85014']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: 56,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#FF7828',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.45,
                  shadowRadius: 16,
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>
                    Create Account
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Sign In link */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
                <Text style={{ color: '#FF7828', fontSize: 14, fontWeight: '700' }}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
