import { useState } from 'react';
import { router } from 'expo-router';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppBackground } from '@/src/components/AppBackground';
import { GlassCard } from '@/src/components/GlassCard';
import { TeamLogo } from '@/src/components/TeamLogo';
import { useSettings } from '@/src/hooks/useSettings';
import { useAuth } from '@/src/hooks/useAuth';

const ALL_TEAMS = [
  { id: 108, name: 'Los Angeles Angels' },
  { id: 109, name: 'Arizona Diamondbacks' },
  { id: 110, name: 'Baltimore Orioles' },
  { id: 111, name: 'Boston Red Sox' },
  { id: 112, name: 'Chicago Cubs' },
  { id: 113, name: 'Cincinnati Reds' },
  { id: 114, name: 'Cleveland Guardians' },
  { id: 115, name: 'Colorado Rockies' },
  { id: 116, name: 'Detroit Tigers' },
  { id: 117, name: 'Houston Astros' },
  { id: 118, name: 'Kansas City Royals' },
  { id: 119, name: 'Los Angeles Dodgers' },
  { id: 120, name: 'Washington Nationals' },
  { id: 121, name: 'New York Mets' },
  { id: 133, name: 'Athletics' },
  { id: 134, name: 'Pittsburgh Pirates' },
  { id: 135, name: 'San Diego Padres' },
  { id: 136, name: 'Seattle Mariners' },
  { id: 137, name: 'San Francisco Giants' },
  { id: 138, name: 'St. Louis Cardinals' },
  { id: 139, name: 'Tampa Bay Rays' },
  { id: 140, name: 'Texas Rangers' },
  { id: 141, name: 'Toronto Blue Jays' },
  { id: 142, name: 'Minnesota Twins' },
  { id: 143, name: 'Philadelphia Phillies' },
  { id: 144, name: 'Atlanta Braves' },
  { id: 145, name: 'Chicago White Sox' },
  { id: 146, name: 'Miami Marlins' },
  { id: 147, name: 'New York Yankees' },
  { id: 158, name: 'Milwaukee Brewers' },
].sort((a, b) => a.name.localeCompare(b.name));

// ─── Edit Name Modal ─────────────────────────────────────────────────────────

function EditNameModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, updateName } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    setLoading(true);
    const res = await updateName(name);
    setLoading(false);
    if (res.ok) {
      onClose();
    } else {
      setError(res.error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ backgroundColor: '#141820', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 6 }}>Change Name</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 22 }}>Update your display name</Text>

          <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 54, marginBottom: 14 }}>
            <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="words"
              autoFocus
              style={{ flex: 1, color: '#FFFFFF', fontSize: 16 }}
            />
          </View>

          {!!error && <Text style={{ color: '#EB505A', fontSize: 13, marginBottom: 14 }}>{error}</Text>}

          <TouchableOpacity onPress={save} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#FFA550', '#FF7828', '#C85014']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Save Name</Text>}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { updatePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (next !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const res = await updatePassword(current, next);
    setLoading(false);
    if (res.ok) {
      setCurrent(''); setNext(''); setConfirm('');
      onClose();
    } else {
      setError(res.error);
    }
  };

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.06)' as const,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 12,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ backgroundColor: '#141820', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 6 }}>Change Password</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 22 }}>Update your account password</Text>

          <View style={inputStyle}>
            <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} />
            <TextInput value={current} onChangeText={setCurrent} placeholder="Current password" placeholderTextColor="rgba(255,255,255,0.25)" secureTextEntry autoFocus style={{ flex: 1, color: '#FFFFFF', fontSize: 16 }} />
          </View>
          <View style={inputStyle}>
            <Ionicons name="lock-open-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} />
            <TextInput value={next} onChangeText={setNext} placeholder="New password" placeholderTextColor="rgba(255,255,255,0.25)" secureTextEntry style={{ flex: 1, color: '#FFFFFF', fontSize: 16 }} />
          </View>
          <View style={inputStyle}>
            <Ionicons name="lock-open-outline" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 12 }} />
            <TextInput value={confirm} onChangeText={setConfirm} placeholder="Confirm new password" placeholderTextColor="rgba(255,255,255,0.25)" secureTextEntry style={{ flex: 1, color: '#FFFFFF', fontSize: 16 }} />
          </View>

          {!!error && <Text style={{ color: '#EB505A', fontSize: 13, marginBottom: 12 }}>{error}</Text>}

          <TouchableOpacity onPress={save} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#FFA550', '#FF7828', '#C85014']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Update Password</Text>}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Settings Screen ─────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const { user, logOut } = useAuth();
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logOut();
          router.replace('/auth/login' as any);
        },
      },
    ]);
  };

  const SettingRow = ({
    icon,
    label,
    value,
    onPress,
    danger,
  }: {
    icon: string;
    label: string;
    value?: string;
    onPress: () => void;
    danger?: boolean;
  }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ marginBottom: 10 }}>
      <GlassCard style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: danger ? 'rgba(235,80,90,0.12)' : 'rgba(255,120,40,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}
        >
          <Ionicons name={icon as any} size={18} color={danger ? '#EB505A' : '#FF7828'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: danger ? '#EB505A' : '#FFFFFF', fontSize: 15, fontWeight: '600' }}>
            {label}
          </Text>
          {!!value && (
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 1 }}>{value}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <AppBackground>
      <FlatList
        data={ALL_TEAMS}
        keyExtractor={(t) => t.id.toString()}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={{ paddingTop: 60, paddingHorizontal: 18, paddingBottom: 20 }}>
              <TouchableOpacity
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/games' as any))}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
              >
                <Ionicons name="chevron-back" size={18} color="#FF7828" />
                <Text style={{ color: '#FF7828', fontSize: 15, fontWeight: '700', marginLeft: 2 }}>Back</Text>
              </TouchableOpacity>

              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 }}>
                ACCOUNT
              </Text>
              <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginBottom: 6 }}>Settings</Text>
            </View>

            {/* User info card */}
            {user && (
              <View style={{ paddingHorizontal: 18, marginBottom: 24 }}>
                <GlassCard style={{ padding: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <LinearGradient
                      colors={['#FFA550', '#FF7828', '#C85014']}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                      }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>
                        {user.name.charAt(0).toUpperCase()}
                      </Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>{user.name}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 }}>{user.email}</Text>
                    </View>
                  </View>
                </GlassCard>
              </View>
            )}

            {/* Account section */}
            <View style={{ paddingHorizontal: 18, marginBottom: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 }}>
                PROFILE
              </Text>
              <SettingRow
                icon="person-outline"
                label="Change Name"
                value={user?.name}
                onPress={() => setShowNameModal(true)}
              />
              <SettingRow
                icon="lock-closed-outline"
                label="Change Password"
                value="••••••••"
                onPress={() => setShowPasswordModal(true)}
              />
            </View>

            {/* Favorite team section header */}
            {settings.favoriteTeamId && (
              <View style={{ paddingHorizontal: 18, marginBottom: 16 }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 }}>
                  FAVORITE TEAM
                </Text>
                <GlassCard
                  style={{
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderColor: 'rgba(255,120,40,0.35)',
                  }}
                >
                  <TeamLogo
                    teamId={settings.favoriteTeamId}
                    teamName={settings.favoriteTeamName ?? ''}
                    size={48}
                  />
                  <View style={{ marginLeft: 14, flex: 1 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>
                      SELECTED TEAM
                    </Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 2 }}>
                      {settings.favoriteTeamName}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => updateSettings({ favoriteTeamId: null, favoriteTeamName: null })}
                    activeOpacity={0.7}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>
                </GlassCard>
              </View>
            )}

            <View style={{ paddingHorizontal: 18, marginBottom: 12 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>
                SELECT FAVORITE TEAM
              </Text>
            </View>
          </View>
        }
        renderItem={({ item: team }) => {
          const isSelected = settings.favoriteTeamId === team.id;
          return (
            <TouchableOpacity
              onPress={() => updateSettings({ favoriteTeamId: team.id, favoriteTeamName: team.name })}
              activeOpacity={0.75}
              style={{ paddingHorizontal: 18, marginBottom: 8 }}
            >
              <GlassCard
                style={[
                  { padding: 14, flexDirection: 'row', alignItems: 'center' },
                  isSelected && { borderColor: 'rgba(255,120,40,0.4)' },
                ]}
              >
                <TeamLogo teamId={team.id} teamName={team.name} size={38} />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: isSelected ? '700' : '500',
                    marginLeft: 14,
                    flex: 1,
                  }}
                >
                  {team.name}
                </Text>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color="#FF7828" />}
              </GlassCard>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <View style={{ paddingHorizontal: 18, marginTop: 24, marginBottom: 50 }}>
            <TouchableOpacity onPress={handleLogout} activeOpacity={0.75}>
              <GlassCard
                style={{
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderColor: 'rgba(235,80,90,0.25)',
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(235,80,90,0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Ionicons name="log-out-outline" size={18} color="#EB505A" />
                </View>
                <Text style={{ color: '#EB505A', fontSize: 15, fontWeight: '600', flex: 1 }}>Sign Out</Text>
              </GlassCard>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 10 }}
      />

      <EditNameModal visible={showNameModal} onClose={() => setShowNameModal(false)} />
      <ChangePasswordModal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </AppBackground>
  );
}
