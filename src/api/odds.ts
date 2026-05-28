export type PlayerPropLine = {
  playerId: string;
  market: string;
  line: number;
};

export async function fetchPlayerProps(gameId: string): Promise<PlayerPropLine[]> {
  void gameId;
  return [];
}
