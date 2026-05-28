import { useQueries } from "@tanstack/react-query";
import {
  fetchBatterStats,
  fetchMatchupStats,
  fetchPitcherStats,
} from "../api/mlb";

export function useMatchup(pitcherId: number, batterId: number) {
  // useQueries runs ALL of these simultaneously (parallel, not sequential)
  const results = useQueries({
    queries: [
      {
        queryKey: ["pitcher", pitcherId, "stats"],
        queryFn: () => fetchPitcherStats(pitcherId),
        enabled: !!pitcherId, // only runs if pitcherId exists
      },
      {
        queryKey: ["batter", batterId, "stats"],
        queryFn: () => fetchBatterStats(batterId),
        enabled: !!batterId,
      },
      {
        queryKey: ["matchup", pitcherId, batterId],
        queryFn: () => fetchMatchupStats(batterId, pitcherId),
        enabled: !!pitcherId && !!batterId,
      },
    ],
  });

  const [pitcherQuery, batterQuery, matchupQuery] = results;

  return {
    pitcher: pitcherQuery.data,
    batter: batterQuery.data,
    matchupHistory: matchupQuery.data,
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
  };
}
