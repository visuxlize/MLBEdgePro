import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchGamesForDate, type Game } from '@/src/api/mlb';
import { localDateString } from '@/src/utils/formatters';

// ─── helpers ──────────────────────────────────────────────────────────────────

function isLive(game: Game): boolean {
  const s = game.status.detailedState;
  return s === 'In Progress' || s === 'Manager Challenge';
}

function sortGames(games: Game[]): Game[] {
  return [...games].sort((a, b) => {
    const aLive = isLive(a);
    const bLive = isLive(b);
    if (aLive && !bLive) return -1;
    if (!aLive && bLive) return 1;
    return new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime();
  });
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useGames() {
  const now = new Date();
  const today = localDateString(now);

  // Between midnight and 5 AM a game that started "yesterday" may still be live.
  // Fetch yesterday too so we don't silently drop a live game when the calendar ticks over.
  const isEarlyMorning = now.getHours() < 5;
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateString(yesterdayDate);

  const todayQuery = useQuery<Game[]>({
    queryKey: ['games', today],
    queryFn: () => fetchGamesForDate(today),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 60 * 1000,
    networkMode: 'offlineFirst',
  });

  // Only enabled during the early-morning window — no wasted requests otherwise.
  const yesterdayQuery = useQuery<Game[]>({
    queryKey: ['games', yesterday],
    queryFn: () => fetchGamesForDate(yesterday),
    enabled: isEarlyMorning,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 60 * 1000, // poll fast — game could end any moment
    networkMode: 'offlineFirst',
  });

  const data = useMemo<Game[]>(() => {
    const todayGames = todayQuery.data ?? [];

    // Guard: nothing extra to merge outside the early-morning window
    if (!isEarlyMorning || !yesterdayQuery.data) return sortGames(todayGames);

    // Merge any yesterday games that are still in progress (e.g. extra innings past midnight).
    // Deduplicate by gamePk so a game never appears twice.
    const liveFromYesterday = yesterdayQuery.data.filter(isLive);
    const merged = [...todayGames];
    for (const g of liveFromYesterday) {
      if (!merged.some((tg) => tg.gamePk === g.gamePk)) {
        merged.push(g);
      }
    }

    return sortGames(merged);
  }, [todayQuery.data, yesterdayQuery.data, isEarlyMorning]);

  return {
    data,
    isLoading: todayQuery.isLoading,
    isError: todayQuery.isError,
    error: todayQuery.error,
    refetch: todayQuery.refetch,
    isRefetching: todayQuery.isRefetching || (yesterdayQuery.isRefetching ?? false),
  };
}
