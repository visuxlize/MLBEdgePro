import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedSlipLeg {
  id: string;
  playerName: string;
  propType: string;
  description: string;
  probability: number;
  oddsLine?: string; // e.g. "+150" or "-110"
}

export type SlipStatus = 'pending' | 'won' | 'lost';

export interface SavedSlip {
  id: string;
  savedAt: string;       // ISO date string
  legs: SavedSlipLeg[];
  wager?: number;        // dollars wagered
  toWin?: number;        // potential payout from sportsbook
  status: SlipStatus;
  checkedInAt?: string;  // ISO date string when outcome was recorded
}

// ─── Storage key ─────────────────────────────────────────────────────────────

const KEY = '@mlbedgepro_saved_slips';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function loadSavedSlips(): Promise<SavedSlip[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedSlip[];
  } catch {
    return [];
  }
}

export async function persistSavedSlips(slips: SavedSlip[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(slips));
}

export async function appendSlip(slip: SavedSlip): Promise<void> {
  const existing = await loadSavedSlips();
  await persistSavedSlips([...existing, slip]);
}

export async function updateSlip(id: string, patch: Partial<SavedSlip>): Promise<void> {
  const existing = await loadSavedSlips();
  const next = existing.map((s) => (s.id === id ? { ...s, ...patch } : s));
  await persistSavedSlips(next);
}

export async function deleteSlip(id: string): Promise<void> {
  const existing = await loadSavedSlips();
  await persistSavedSlips(existing.filter((s) => s.id !== id));
}

// ─── Odds helpers ─────────────────────────────────────────────────────────────

/**
 * Given a combined probability 0-100, returns the implied American odds string.
 * e.g.  5% → "+1,900"   50% → "-100"   75% → "-300"   0.05% → "+199,900"
 */
export function impliedAmericanOdds(combinedPct: number): string {
  if (combinedPct <= 0) return 'N/A';
  const p = combinedPct / 100;
  if (p >= 0.5) {
    const odds = Math.round(-(p / (1 - p)) * 100);
    return odds.toLocaleString();
  }
  const odds = Math.round(((1 - p) / p) * 100);
  return `+${odds.toLocaleString()}`;
}

/**
 * Parlay payout odds calculated the same way FanDuel does:
 *   1. Convert each American line to decimal  (+570 → 6.7,  -110 → 1.909...)
 *   2. Multiply all decimals together
 *   3. Convert result back to American (floor to match FanDuel)
 *
 * Returns null when any leg has no valid odds string.
 * Returns null when only one valid line is present (no parlay).
 */
export function parlayAmericanOdds(oddsLines: string[]): string | null {
  const valid = oddsLines.map((s) => s.trim()).filter((s) => s !== '' && s !== '+' && s !== '-');
  if (valid.length < 2) return null;

  let decimal = 1;
  for (const line of valid) {
    const n = parseFloat(line);
    if (isNaN(n) || n === 0) return null;
    decimal *= n > 0 ? n / 100 + 1 : 100 / Math.abs(n) + 1;
  }

  const american = Math.floor((decimal - 1) * 100);
  return `+${american.toLocaleString()}`;
}

/**
 * Format a combined probability with appropriate precision.
 */
export function formatCombinedPct(pct: number): string {
  if (pct >= 10) return `${pct.toFixed(1)}%`;
  if (pct >= 1) return `${pct.toFixed(2)}%`;
  if (pct >= 0.01) return `${pct.toFixed(3)}%`;
  return '< 0.01%';
}
