import { useQuery } from '@tanstack/react-query';
import { fetchTeamBatters } from '@/src/api/mlb';

export function useTeamBatters(teamId: number) {
  return useQuery({
    queryKey: ['team', teamId, 'batters'],
    queryFn: () => fetchTeamBatters(teamId),
    enabled: !!teamId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
