import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  loadSavedSlips,
  appendSlip,
  updateSlip,
  deleteSlip,
  type SavedSlip,
  type SlipStatus,
} from '@/src/storage/slipStorage';

// ─── Context shape ────────────────────────────────────────────────────────────

interface SavedSlipsContextValue {
  slips: SavedSlip[];
  loaded: boolean;
  save: (slip: SavedSlip) => Promise<void>;
  update: (id: string, patch: Partial<SavedSlip>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  markOutcome: (id: string, status: SlipStatus) => Promise<void>;
  // derived
  won: SavedSlip[];
  lost: SavedSlip[];
  pending: SavedSlip[];
  pendingCheckIn: SavedSlip[];
  winRate: number | null;
}

const SavedSlipsContext = createContext<SavedSlipsContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SavedSlipsProvider({ children }: { children: ReactNode }) {
  const [slips, setSlips] = useState<SavedSlip[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSavedSlips().then((data) => {
      setSlips(data);
      setLoaded(true);
    });
  }, []);

  const save = useCallback(async (slip: SavedSlip) => {
    await appendSlip(slip);
    setSlips((prev) => [...prev, slip]);
  }, []);

  const update = useCallback(async (id: string, patch: Partial<SavedSlip>) => {
    await updateSlip(id, patch);
    setSlips((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteSlip(id);
    setSlips((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const markOutcome = useCallback(async (id: string, status: SlipStatus) => {
    const patch: Partial<SavedSlip> = { status, checkedInAt: new Date().toISOString() };
    await updateSlip(id, patch);
    setSlips((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const won = slips.filter((s) => s.status === 'won');
  const lost = slips.filter((s) => s.status === 'lost');
  const pending = slips.filter((s) => s.status === 'pending');
  const pendingCheckIn = slips.filter((s) => {
    if (s.status !== 'pending') return false;
    return Date.now() - new Date(s.savedAt).getTime() > 5 * 60 * 60 * 1000;
  });
  const winRate =
    won.length + lost.length > 0
      ? Math.round((won.length / (won.length + lost.length)) * 100)
      : null;

  return (
    <SavedSlipsContext.Provider
      value={{ slips, loaded, save, update, remove, markOutcome, won, lost, pending, pendingCheckIn, winRate }}
    >
      {children}
    </SavedSlipsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSavedSlips(): SavedSlipsContextValue {
  const ctx = useContext(SavedSlipsContext);
  if (!ctx) throw new Error('useSavedSlips must be used inside <SavedSlipsProvider>');
  return ctx;
}
