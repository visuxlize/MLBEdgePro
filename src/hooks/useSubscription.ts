/**
 * useSubscription — reads subscription status from Clerk's publicMetadata.
 *
 * publicMetadata is set server-side only (your backend or Clerk dashboard),
 * so it is tamper-proof. The shape is:
 *
 *   publicMetadata: {
 *     isPro: boolean;
 *     plan: 'free' | 'pro';
 *     subscriptionId?: string;          // RevenueCat or Stripe subscription ID
 *     subscriptionExpiresAt?: string;   // ISO date string
 *   }
 *
 * To grant pro access during development:
 *   1. Open https://dashboard.clerk.com
 *   2. Users → find your test user → Metadata → Public
 *   3. Set: { "isPro": true, "plan": "pro" }
 */

import { useUser } from '@clerk/clerk-expo';

export type Plan = 'free' | 'pro';

export interface SubscriptionStatus {
  isPro: boolean;
  plan: Plan;
  isLoaded: boolean;
  subscriptionId?: string;
  expiresAt?: string;
}

export function useSubscription(): SubscriptionStatus {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return { isPro: false, plan: 'free', isLoaded: false };
  }

  if (!user) {
    return { isPro: false, plan: 'free', isLoaded: true };
  }

  const meta = (user.publicMetadata ?? {}) as {
    isPro?: boolean;
    plan?: Plan;
    subscriptionId?: string;
    subscriptionExpiresAt?: string;
  };

  const isPro = meta.isPro === true;
  const plan: Plan = isPro ? 'pro' : 'free';

  return {
    isPro,
    plan,
    isLoaded: true,
    subscriptionId: meta.subscriptionId,
    expiresAt: meta.subscriptionExpiresAt,
  };
}
