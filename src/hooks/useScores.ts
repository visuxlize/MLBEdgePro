import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const SCORES_KEY = '@mlbedgepro_scores';

export interface GameScore {
  gamePk: number;
  date: string; // YYYY-MM-DD
  awayTeamId: number;
  homeTeamId: number;
  awayTeamName: string;
  homeTeamName: string;
  awayScore: number;
  homeScore: number;
  venueName: string;
  savedAt: string;
}

type ScoresMap = Record<string, GameScore>; // key: `${date}-${gamePk}`

export function useScores() {
  const [scoresMap, setScoresMap] = useState<ScoresMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SCORES_KEY).then((raw) => {
      if (raw) {
        try {
          setScoresMap(JSON.parse(raw));
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const saveScore = useCallback(
    async (score: Omit<GameScore, 'savedAt'>) => {
      const key = `${score.date}-${score.gamePk}`;
      const entry: GameScore = { ...score, savedAt: new Date().toISOString() };
      const next = { ...scoresMap, [key]: entry };
      setScoresMap(next);
      await AsyncStorage.setItem(SCORES_KEY, JSON.stringify(next));
    },
    [scoresMap],
  );

  const deleteScore = useCallback(
    async (gamePk: number, date: string) => {
      const key = `${date}-${gamePk}`;
      const next = { ...scoresMap };
      delete next[key];
      setScoresMap(next);
      await AsyncStorage.setItem(SCORES_KEY, JSON.stringify(next));
    },
    [scoresMap],
  );

  const getScoresForDate = useCallback(
    (date: string): GameScore[] => {
      return Object.values(scoresMap).filter((s) => s.date === date);
    },
    [scoresMap],
  );

  const getScore = useCallback(
    (gamePk: number, date: string): GameScore | null => {
      return scoresMap[`${date}-${gamePk}`] ?? null;
    },
    [scoresMap],
  );

  const getAllDates = useCallback((): string[] => {
    const dates = [...new Set(Object.values(scoresMap).map((s) => s.date))];
    return dates.sort((a, b) => b.localeCompare(a));
  }, [scoresMap]);

  return { scoresMap, loaded, saveScore, deleteScore, getScoresForDate, getScore, getAllDates };
}
