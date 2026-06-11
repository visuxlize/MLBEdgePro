import { useRef, useState } from 'react';
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

// ─── OTP input row ─────────────────────────────────────────────────────────────

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  const digits = value.padEnd(6, ' ').split('').slice(0, 6);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const arr = value.padEnd(6, '').split('');
    arr[index] = digit;
    const next = arr.join('').trimEnd();
    onChange(next);
    if (digit && index < 5) refs[index + 1].current?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !value[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={refs[i]}
          value={d.trim()}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
          keyboardType="number-pad"
          maxLength={1}
          keyboardAppearance="dark"
          selectTextOnFocus
          style={{
            width: 46,
            height: 56,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: d.trim() ? '#FF7828' : 'rgba(255,255,255,0.15)',
            backgroundColor: '#191C22',
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: '800',
            textAlign: 'center',
          }}
        />
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SignupScreen() {
  const { signUp, verifyEmail } = useAuth();

  // Step 1 — account details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Step 2 — email verification
  const [pendingVerification, setPendingVerification] = useState(false);
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const FIELD_BG = '#191C22';
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
  const inputText = { flex: 1, color: '#FFFFFF' as const, fontSize: 16, backgroundColor: FIELD_BG };

  const goBack = () => {
    if (pendingVerification) {
      setPendingVerification(false);
      setOtp('');
      setError('');
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/auth/login' as any);
  };

  // ── Step 1: create account ─────────────────────────────────────────────────
  const handleSignup = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!acceptedTerms) {
      setError('You must accept the Terms of Service and Privacy Policy.');
      return;
    }
    setLoading(true);
    const result = await signUp(name, email, password, acceptedTerms);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (result.needsVerification) {
      setPendingVerification(true);
      return;
    }

    router.replace('/(tabs)/games' as any);
  };

  // ── Step 2: verify OTP ────────────────────────────────────────────────────
  const handleVerify = async () => {
    setError('');
    if (otp.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    const result = await verifyEmail(otp);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.replace('/(tabs)/games' as any);
  };

  // ── Verification step UI ──────────────────────────────────────────────────
  if (pendingVerification) {
    return (
      <LinearGradient colors={['#0A0E14', '#0D1220', '#0A0E14']} style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View pointerEvents="none" style={{ position: 'absolute', top: -80, right: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,120,40,0.12)', transform: [{ scaleX: 1.4 }] }} />

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
            {/* Back */}
            <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 40 }}>
              <Ionicons name="chevron-back" size={18} color="#FF7828" />
              <Text style={{ color: '#FF7828', fontSize: 15, fontWeight: '700' }}>Back</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 36 }}>
              <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(255,120,40,0.12)', borderWidth: 1, borderColor: 'rgba(255,120,40,0.30)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <Ionicons name="mail-open-outline" size={32} color="#FF7828" />
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 }}>Check your email</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 10, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 }}>
                We sent a 6-digit code to{'\n'}
                <Text style={{ color: '#FF7828', fontWeight: '700' }}>{email}</Text>
              </Text>
            </View>

            {/* OTP Input */}
            <View style={{ marginBottom: 24 }}>
              <OtpInput value={otp} onChange={setOtp} />
            </View>

            {/* Error */}
            {!!error && (
              <View style={{ backgroundColor: 'rgba(235,80,90,0.12)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(235,80,90,0.25)', padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="alert-circle-outline" size={16} color="#EB505A" style={{ marginRight: 8 }} />
                <Text style={{ color: '#EB505A', fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            )}

            {/* Verify Button */}
            <TouchableOpacity onPress={handleVerify} activeOpacity={0.85} disabled={loading || otp.length < 6} style={{ opacity: otp.length < 6 ? 0.5 : 1 }}>
              <LinearGradient
                colors={['#FFA550', '#FF7828', '#C85014']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#FF7828', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 16 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>Verify & Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, textAlign: 'center', marginTop: 20, lineHeight: 18 }}>
              Didn't get the code? Check your spam folder{'\n'}or go back to re-enter your email.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  // ── Step 1 UI ─────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={['#0A0E14', '#0D1220', '#0A0E14']} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <View pointerEvents="none" style={{ position: 'absolute', top: -80, right: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,120,40,0.12)', transform: [{ scaleX: 1.4 }] }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={{ position: 'absolute', top: 60, left: 0, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="chevron-back" size={18} color="#FF7828" />
            <Text style={{ color: '#FF7828', fontSize: 15, fontWeight: '700' }}>Back</Text>
          </TouchableOpacity>

          {/* Brand */}
          <View style={{ alignItems: 'center', marginBottom: 32, marginTop: 100 }}>
            <MLBEdgeLogo size={120} showRadar />
            <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 16 }}>
              Create Account
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 6 }}>
              Start tracking MLB edge data
            </Text>
          </View>

          <View style={{ gap: 14 }}>
            {/* Name */}
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>YOUR NAME</Text>
              <View style={inputRow}>
                <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} />
                <TextInput value={name} onChangeText={setName} placeholder="John Smith" placeholderTextColor="rgba(255,255,255,0.25)" autoCapitalize="words" autoComplete="name" textContentType="name" keyboardAppearance="dark" style={inputText} />
              </View>
            </View>

            {/* Email */}
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>EMAIL</Text>
              <View style={inputRow}>
                <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} />
                <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="rgba(255,255,255,0.25)" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" keyboardAppearance="dark" style={inputText} />
              </View>
            </View>

            {/* Password */}
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>PASSWORD</Text>
              <View style={inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} />
                <TextInput value={password} onChangeText={setPassword} placeholder="Min. 8 characters" placeholderTextColor="rgba(255,255,255,0.25)" secureTextEntry={!showPassword} textContentType="newPassword" autoComplete="new-password" keyboardAppearance="dark" style={inputText} />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} activeOpacity={0.7}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.35)" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>CONFIRM PASSWORD</Text>
              <View style={inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} />
                <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••" placeholderTextColor="rgba(255,255,255,0.25)" secureTextEntry={!showPassword} textContentType="newPassword" autoComplete="new-password" keyboardAppearance="dark" style={inputText} />
              </View>
            </View>

            {/* Terms */}
            <TouchableOpacity onPress={() => setAcceptedTerms((v) => !v)} activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 }}>
              <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: acceptedTerms ? '#FF7828' : 'rgba(255,255,255,0.25)', backgroundColor: acceptedTerms ? '#FF7828' : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 }}>
                {acceptedTerms && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 20, flex: 1 }}>
                {'I agree to the '}
                <Text onPress={() => router.push('/terms' as any)} style={{ color: '#FF7828', fontWeight: '700' }}>Terms of Service</Text>
                {' and '}
                <Text onPress={() => router.push('/privacy-policy' as any)} style={{ color: '#FF7828', fontWeight: '700' }}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* Error */}
            {!!error && (
              <View style={{ backgroundColor: 'rgba(235,80,90,0.12)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(235,80,90,0.25)', padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="alert-circle-outline" size={16} color="#EB505A" style={{ marginRight: 8 }} />
                <Text style={{ color: '#EB505A', fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity onPress={handleSignup} activeOpacity={0.85} disabled={loading} style={{ marginTop: 4, opacity: !acceptedTerms ? 0.5 : 1 }}>
              <LinearGradient
                colors={['#FFA550', '#FF7828', '#C85014']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#FF7828', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 16 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Already have an account? </Text>
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
