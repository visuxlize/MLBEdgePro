export const queryKeys = {
  games: {
    today: ['games', 'today'] as const,
    detail: (id: string | number) => ['games', id, 'details'] as const,
  },
  pitcher: {
    stats: (playerId: number) => ['pitcher', playerId, 'stats'] as const,
  },
  batter: {
    stats: (playerId: number) => ['batter', playerId, 'stats'] as const,
  },
  matchup: {
    career: (pitcherId: number, batterId: number) =>
      ['matchup', pitcherId, batterId] as const,
  },
  weather: {
    byStadium: (venueId: number | string) => ['weather', venueId] as const,
  },
  props: {
    byGame: (gameId: string) => ['props', gameId] as const,
  },
} as const;
