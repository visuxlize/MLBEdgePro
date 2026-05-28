import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

const USERS_KEY = '@mlbedgepro_users';
const CURRENT_KEY = '@mlbedgepro_current';
const ONBOARDING_KEY = '@mlbedgepro_onboarding_seen';

export interface AuthUser {
  email: string;
  name: string;
  password: string; // stored locally — no server
  createdAt: string;
  hasAcceptedTerms?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isLoaded: boolean;
  hasSeenOnboarding: boolean;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function readUsers(): Promise<AuthUser[]> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeUsers(users: AuthUser[]) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function readCurrentEmail(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoaded: false,
    hasSeenOnboarding: false,
  });

  // Boot: restore logged-in user + onboarding flag in parallel
  useEffect(() => {
    (async () => {
      const [onboardingVal, email] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_KEY).catch(() => null),
        readCurrentEmail(),
      ]);
      const hasSeenOnboarding = onboardingVal === 'true';

      if (!email) {
        setState({ user: null, isLoaded: true, hasSeenOnboarding });
        return;
      }

      const users = await readUsers();
      const found = users.find((u) => u.email === email) ?? null;
      setState({ user: found, isLoaded: true, hasSeenOnboarding });
    })();
  }, []);

  const markOnboardingComplete = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setState((s) => ({ ...s, hasSeenOnboarding: true }));
  }, []);

  const signUp = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      acceptedTerms = false,
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      const trimEmail = email.trim().toLowerCase();
      if (!trimEmail || !password || !name.trim()) {
        return { ok: false, error: 'All fields are required.' };
      }
      if (password.length < 6) {
        return { ok: false, error: 'Password must be at least 6 characters.' };
      }
      if (!acceptedTerms) {
        return { ok: false, error: 'You must accept the Terms of Service and Privacy Policy.' };
      }
      const users = await readUsers();
      if (users.find((u) => u.email === trimEmail)) {
        return { ok: false, error: 'An account with that email already exists.' };
      }
      const newUser: AuthUser = {
        email: trimEmail,
        name: name.trim(),
        password,
        createdAt: new Date().toISOString(),
        hasAcceptedTerms: true,
      };
      await writeUsers([...users, newUser]);
      await AsyncStorage.setItem(CURRENT_KEY, trimEmail);
      setState((s) => ({ ...s, user: newUser }));
      return { ok: true };
    },
    [],
  );

  const logIn = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      const trimEmail = email.trim().toLowerCase();
      const users = await readUsers();
      const found = users.find((u) => u.email === trimEmail);
      if (!found) return { ok: false, error: 'No account found with that email.' };
      if (found.password !== password) return { ok: false, error: 'Incorrect password.' };
      await AsyncStorage.setItem(CURRENT_KEY, trimEmail);
      setState((s) => ({ ...s, user: found }));
      return { ok: true };
    },
    [],
  );

  const logOut = useCallback(async () => {
    await AsyncStorage.removeItem(CURRENT_KEY);
    setState((s) => ({ ...s, user: null }));
  }, []);

  const updateName = useCallback(
    async (newName: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!state.user) return { ok: false, error: 'Not logged in.' };
      if (!newName.trim()) return { ok: false, error: 'Name cannot be empty.' };
      const users = await readUsers();
      const updated = users.map((u) =>
        u.email === state.user!.email ? { ...u, name: newName.trim() } : u,
      );
      await writeUsers(updated);
      const updatedUser = { ...state.user, name: newName.trim() };
      setState((s) => ({ ...s, user: updatedUser }));
      return { ok: true };
    },
    [state.user],
  );

  const updatePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!state.user) return { ok: false, error: 'Not logged in.' };
      if (state.user.password !== currentPassword) {
        return { ok: false, error: 'Current password is incorrect.' };
      }
      if (newPassword.length < 6) {
        return { ok: false, error: 'New password must be at least 6 characters.' };
      }
      const users = await readUsers();
      const updated = users.map((u) =>
        u.email === state.user!.email ? { ...u, password: newPassword } : u,
      );
      await writeUsers(updated);
      setState((s) => ({ ...s, user: { ...s.user!, password: newPassword } }));
      return { ok: true };
    },
    [state.user],
  );

  return {
    user: state.user,
    isLoaded: state.isLoaded,
    isAuthenticated: !!state.user,
    hasSeenOnboarding: state.hasSeenOnboarding,
    markOnboardingComplete,
    signUp,
    logIn,
    logOut,
    updateName,
    updatePassword,
  };
}
