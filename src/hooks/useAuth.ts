/**
 * useAuth — wraps Clerk SDK and exposes a stable interface that the rest of
 * the app (login, signup, settings, games, etc.) depends on.
 *
 * Subscription status lives in useSubscription.ts (reads Clerk publicMetadata).
 */

import {
  useUser,
  useSignIn,
  useSignUp,
  useAuth as useClerkAuth,
  useClerk,
} from '@clerk/clerk-expo';
import { useOnboardingState } from './useOnboardingState';

// ─── Public shape (backward-compatible with the old AsyncStorage hook) ─────────

export interface AuthUser {
  email: string;
  name: string;
  createdAt: string;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  const { user, isLoaded: userLoaded } = useUser();
  const { isLoaded: authLoaded, isSignedIn } = useClerkAuth();
  const { signOut } = useClerk();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp: clerkSignUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const {
    hasSeenOnboarding,
    isLoaded: onboardingLoaded,
    markOnboardingComplete,
  } = useOnboardingState();

  const isLoaded = authLoaded && userLoaded && onboardingLoaded;

  // ── Normalize Clerk user → AuthUser shape ─────────────────────────────────
  const authUser: AuthUser | null = user
    ? {
        email: user.primaryEmailAddress?.emailAddress ?? '',
        name:
          [user.firstName, user.lastName].filter(Boolean).join(' ') ||
          user.username ||
          'User',
        createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
      }
    : null;

  // ── Sign in ───────────────────────────────────────────────────────────────
  const logIn = async (
    email: string,
    password: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!signIn || !setSignInActive) return { ok: false, error: 'Auth not ready.' };
    try {
      const result = await signIn.create({
        identifier: email.trim().toLowerCase(),
        password,
      });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        return { ok: true };
      }
      return { ok: false, error: 'Sign in incomplete. Please try again.' };
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        'Sign in failed. Check your credentials.';
      return { ok: false, error: msg };
    }
  };

  // ── Sign up (returns needsVerification=true when email OTP is required) ───
  const signUp = async (
    name: string,
    email: string,
    password: string,
    acceptedTerms = false,
  ): Promise<
    | { ok: true; needsVerification?: boolean }
    | { ok: false; error: string }
  > => {
    if (!clerkSignUp || !setSignUpActive)
      return { ok: false, error: 'Auth not ready.' };
    if (!acceptedTerms)
      return {
        ok: false,
        error: 'You must accept the Terms of Service and Privacy Policy.',
      };

    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] ?? '';
    const lastName = parts.slice(1).join(' ') || undefined;

    try {
      const result = await clerkSignUp.create({
        emailAddress: email.trim().toLowerCase(),
        password,
        firstName,
        lastName,
      });

      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        return { ok: true };
      }

      // Needs email verification
      if (result.status === 'missing_requirements') {
        await clerkSignUp.prepareEmailAddressVerification({
          strategy: 'email_code',
        });
        return { ok: true, needsVerification: true };
      }

      return { ok: false, error: 'Signup incomplete. Please try again.' };
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        'Signup failed. Please try again.';
      return { ok: false, error: msg };
    }
  };

  // ── Verify email OTP ──────────────────────────────────────────────────────
  const verifyEmail = async (
    code: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!clerkSignUp || !setSignUpActive)
      return { ok: false, error: 'Auth not ready.' };
    try {
      const result = await clerkSignUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        return { ok: true };
      }
      return { ok: false, error: 'Verification incomplete.' };
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        'Invalid code. Please try again.';
      return { ok: false, error: msg };
    }
  };

  // ── Sign out ──────────────────────────────────────────────────────────────
  const logOut = async () => {
    await signOut();
  };

  // ── Update display name ───────────────────────────────────────────────────
  const updateName = async (
    newName: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!user) return { ok: false, error: 'Not logged in.' };
    if (!newName.trim()) return { ok: false, error: 'Name cannot be empty.' };
    try {
      const parts = newName.trim().split(/\s+/);
      await user.update({
        firstName: parts[0],
        lastName: parts.slice(1).join(' ') || undefined,
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'Update failed.' };
    }
  };

  // ── Update password ───────────────────────────────────────────────────────
  const updatePassword = async (
    currentPassword: string,
    newPassword: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!user) return { ok: false, error: 'Not logged in.' };
    if (newPassword.length < 8)
      return { ok: false, error: 'New password must be at least 8 characters.' };
    try {
      await user.updatePassword({ currentPassword, newPassword });
      return { ok: true };
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ?? err?.message ?? 'Password update failed.';
      return { ok: false, error: msg };
    }
  };

  return {
    user: authUser,
    clerkUser: user,
    isLoaded,
    isAuthenticated: !!isSignedIn,
    hasSeenOnboarding,
    markOnboardingComplete,
    signUp,
    verifyEmail,
    logIn,
    logOut,
    updateName,
    updatePassword,
  };
}
