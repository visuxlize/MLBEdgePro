import { useQuery } from '@tanstack/react-query';

import { fetchPlayerProps } from '@/src/api/odds';
import { queryKeys } from '@/src/constants/queryKeys';

export function usePlayerProps(gameId: string) {
  return useQuery({
    queryKey: queryKeys.props.byGame(gameId),
    queryFn: () => fetchPlayerProps(gameId),
    enabled: Boolean(gameId),
  });
}
