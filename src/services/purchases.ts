/**
 * PurchasesService — wraps RevenueCat's react-native-purchases SDK.
 *
 * SETUP REQUIRED (see SETUP.md):
 *   1. Create a RevenueCat project at app.revenuecat.com
 *   2. Add your app (iOS + Android)
 *   3. Create an Entitlement named "pro"
 *   4. Attach a $4.99/month product to that entitlement
 *   5. Paste your SDK keys into .env:
 *        EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxx
 *        EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxx
 *
 * The webhook at /webhooks/revenuecat handles granting Pro in Clerk automatically.
 */

import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
} from 'react-native-purchases';

const IOS_KEY     = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

// ── Entitlement ID — must match what you created in RevenueCat dashboard ──────
export const PRO_ENTITLEMENT_ID = 'pro';

let _configured = false;

// ─── Initialize ───────────────────────────────────────────────────────────────

export function configurePurchases() {
  if (_configured) return;
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey || apiKey.includes('xxxx')) {
    console.warn('[Purchases] RevenueCat API key not set — purchases disabled');
    return;
  }
  Purchases.configure({ apiKey });
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  _configured = true;
}

// ─── Link the Clerk user so RevenueCat knows who is purchasing ────────────────
// Call this after Clerk signs the user in.
export async function identifyUser(clerkUserId: string) {
  if (!_configured) return;
  try {
    await Purchases.logIn(clerkUserId);
  } catch (err) {
    console.warn('[Purchases] logIn error:', err);
  }
}

// ─── Logout (call when user signs out of Clerk) ───────────────────────────────
export async function logOutPurchases() {
  if (!_configured) return;
  try {
    await Purchases.logOut();
  } catch {}
}

// ─── Check if the current user is Pro ─────────────────────────────────────────
// Prefer Clerk publicMetadata (useSubscription hook) over this — but this is
// useful for a fresh check right after purchase before the webhook fires.
export async function checkIsPro(): Promise<boolean> {
  if (!_configured) return false;
  try {
    const info: CustomerInfo = await Purchases.getCustomerInfo();
    return info.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

// ─── Get current offering ─────────────────────────────────────────────────────
export async function getProOffering(): Promise<PurchasesOffering | null> {
  if (!_configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (err) {
    console.warn('[Purchases] getOfferings error:', err);
    return null;
  }
}

// ─── Purchase monthly Pro ─────────────────────────────────────────────────────
export async function purchasePro(): Promise<
  | { ok: true; customerInfo: CustomerInfo }
  | { ok: false; error: string; userCancelled?: boolean }
> {
  if (!_configured) {
    return { ok: false, error: 'Purchases not configured. Add RevenueCat keys to .env.' };
  }

  try {
    const offering = await getProOffering();
    const monthly  = offering?.monthly;

    if (!monthly) {
      return {
        ok: false,
        error: 'No monthly package found. Make sure you created a $4.99/month product in RevenueCat and attached it to the "pro" entitlement.',
      };
    }

    const { customerInfo } = await Purchases.purchasePackage(monthly);
    return { ok: true, customerInfo };
  } catch (err: any) {
    if (err?.userCancelled) {
      return { ok: false, error: 'Purchase cancelled.', userCancelled: true };
    }
    return { ok: false, error: err?.message ?? 'Purchase failed. Please try again.' };
  }
}

// ─── Restore purchases (required by App Store guidelines) ────────────────────
export async function restorePurchases(): Promise<
  | { ok: true; isPro: boolean }
  | { ok: false; error: string }
> {
  if (!_configured) {
    return { ok: false, error: 'Purchases not configured.' };
  }

  try {
    const info = await Purchases.restorePurchases();
    const isPro = info.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
    return { ok: true, isPro };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Restore failed.' };
  }
}
