import { useQuery } from '@tanstack/react-query';
import { fetchStadiumWeather } from '@/src/api/weather';
import { getStadiumInfo } from '@/src/constants/stadiums';
import { queryKeys } from '@/src/constants/queryKeys';

export function useWeather(venueId: number, venueName = '') {
  const stadium = getStadiumInfo(venueId, venueName);

  return useQuery({
    queryKey: queryKeys.weather.byStadium(venueId),
    queryFn: () => fetchStadiumWeather(stadium!.lat, stadium!.lon),
    enabled: !!stadium && !stadium.indoor,
    staleTime: 15 * 60 * 1000,
  });
}
