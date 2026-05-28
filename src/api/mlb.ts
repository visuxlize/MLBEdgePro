import axios from 'axios';
import { localDateString } from '@/src/utils/formatters';

const mlbApi = axios.create({
  baseURL: 'https://statsapi.mlb.com/api/v1',
  timeout: 10000,
});

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface GameScore {
  runs: number;
  hits: number;
  errors: number;
}

export interface Game {
  gamePk: number;
  gameDate: string;
  status: { detailedState: string; abstractGameState?: string };
  teams: {
    home: { team: { id: number; name: string }; probablePitcher?: Player; score?: number };
    away: { team: { id: number; name: string }; probablePitcher?: Player; score?: number };
  };
  venue: { id: number; name: string };
  linescore?: {
    currentInning?: number;
    currentInningOrdinal?: string;
    inningState?: string;
    teams: { home: GameScore; away: GameScore };
  };
}

export interface Player {
  id: number;
  fullName: string;
}

export interface PitcherStats {
  era: string;
  strikeOuts: number;
  whip: string;
  wins: number;
  losses: number;
  inningsPitched: string;
  homeRuns: number;
  baseOnBalls: number; // walks issued — used for BB/9 & walk prop calculations
  gamesStarted: number; // used for avg K/start projection
}

export interface BatterStats {
  avg: string;
  homeRuns: number;
  rbi: number;
  strikeOuts: number;
  baseOnBalls: number;
  ops: string;
  atBats?: number;
  plateAppearances?: number;
}

export interface RosterBatter {
  id: number;
  fullName: string;
  position: string;
  teamId: number;
  stats: BatterStats;
}

// ─── API FUNCTIONS ──────────────────────────────────────────────────────────

export async function fetchTodaysGames(): Promise<Game[]> {
  const today = localDateString(); // local calendar date, not UTC
  const { data } = await mlbApi.get('/schedule/games/', {
    params: {
      sportId: 1,
      date: today,
      hydrate: 'team,venue,probablePitcher(note),linescore',
    },
  });
  return data.dates[0]?.games ?? [];
}

export async function fetchPitcherStats(playerId: number): Promise<PitcherStats> {
  const { data } = await mlbApi.get(`/people/${playerId}/stats`, {
    params: { stats: 'season', group: 'pitching', season: new Date().getFullYear() },
  });
  const stat = data.stats[0]?.splits[0]?.stat ?? {};
  return {
    era: stat.era ?? '-.--',
    strikeOuts: stat.strikeOuts ?? 0,
    whip: stat.whip ?? '-.--',
    wins: stat.wins ?? 0,
    losses: stat.losses ?? 0,
    inningsPitched: stat.inningsPitched ?? '0.0',
    homeRuns: stat.homeRuns ?? 0,
    baseOnBalls: stat.baseOnBalls ?? 0,
    gamesStarted: stat.gamesStarted ?? 1,
  };
}

export async function fetchBatterStats(playerId: number): Promise<BatterStats> {
  const { data } = await mlbApi.get(`/people/${playerId}/stats`, {
    params: { stats: 'season', group: 'hitting', season: new Date().getFullYear() },
  });
  const stat = data.stats[0]?.splits[0]?.stat ?? {};
  return {
    avg: stat.avg ?? '.000',
    homeRuns: stat.homeRuns ?? 0,
    rbi: stat.rbi ?? 0,
    strikeOuts: stat.strikeOuts ?? 0,
    baseOnBalls: stat.baseOnBalls ?? 0,
    ops: stat.ops ?? '.000',
    atBats: stat.atBats ?? 0,
    plateAppearances: stat.plateAppearances ?? 0,
  };
}

// Fetches active roster with seasonal batting stats in one API call
export async function fetchTeamBatters(teamId: number): Promise<RosterBatter[]> {
  const season = new Date().getFullYear();
  const { data } = await mlbApi.get(`/teams/${teamId}/roster`, {
    params: {
      rosterType: 'active',
      season,
      hydrate: `person(stats(type=season,group=hitting,season=${season}))`,
    },
  });

  const batters: RosterBatter[] = [];
  for (const entry of data.roster ?? []) {
    const person = entry.person;
    const pos = entry.position?.abbreviation ?? '';
    if (pos === 'P' || pos === 'TWP') continue; // skip pitchers

    const stat = person.stats?.[0]?.splits?.[0]?.stat ?? {};
    const ab = stat.atBats ?? 0;
    if (ab < 10) continue; // skip players with too few at-bats

    batters.push({
      id: person.id,
      fullName: person.fullName,
      position: pos,
      teamId,
      stats: {
        avg: stat.avg ?? '.000',
        homeRuns: stat.homeRuns ?? 0,
        rbi: stat.rbi ?? 0,
        strikeOuts: stat.strikeOuts ?? 0,
        baseOnBalls: stat.baseOnBalls ?? 0,
        ops: stat.ops ?? '.000',
        atBats: ab,
        plateAppearances: stat.plateAppearances ?? ab,
      },
    });
  }

  // Sort by OPS descending
  return batters.sort((a, b) => parseFloat(b.stats.ops) - parseFloat(a.stats.ops));
}

export async function fetchGamesForDate(date: string): Promise<Game[]> {
  const { data } = await mlbApi.get('/schedule/games/', {
    params: { sportId: 1, date, hydrate: 'team,venue,probablePitcher(note),linescore' },
  });
  return data.dates[0]?.games ?? [];
}

/** Fetch a single game by its gamePk — works regardless of which date it was scheduled on. */
export async function fetchGameScheduleByPk(gamePk: number): Promise<Game | null> {
  const { data } = await mlbApi.get('/schedule/games/', {
    params: { gamePk, hydrate: 'team,venue,probablePitcher(note),linescore' },
  });
  return data.dates[0]?.games[0] ?? null;
}

export async function fetchPlayerProfile(playerId: number) {
  const season = new Date().getFullYear();

  // Three parallel calls: bio, season stats, career stats
  const [bioRes, seasonRes, careerRes] = await Promise.all([
    mlbApi.get(`/people/${playerId}`, {
      params: { hydrate: `stats(group=hitting,type=season,season=${season})` },
    }),
    mlbApi.get(`/people/${playerId}/stats`, {
      params: { stats: 'season', group: 'hitting', season },
    }),
    mlbApi.get(`/people/${playerId}/stats`, {
      params: { stats: 'career', group: 'hitting' },
    }),
  ]);

  const person = bioRes.data.people[0];
  if (!person) throw new Error('Player not found');

  // Season stats — try hydrated first, fall back to direct endpoint
  const hydratedSeason = person.stats?.find((s: any) => s.type?.displayName === 'season')?.splits?.[0]?.stat ?? {};
  const directSeason = seasonRes.data.stats?.[0]?.splits?.[0]?.stat ?? {};
  const ss = Object.keys(hydratedSeason).length > 2 ? hydratedSeason : directSeason;

  const cs = careerRes.data.stats?.[0]?.splits?.[0]?.stat ?? {};

  return {
    id: person.id,
    fullName: person.fullName,
    firstName: person.firstName,
    lastName: person.lastName,
    primaryNumber: person.primaryNumber ?? '',
    birthDate: person.birthDate ?? '',
    currentAge: person.currentAge ?? null,
    birthCity: person.birthCity ?? '',
    birthCountry: person.birthCountry ?? '',
    height: person.height ?? '',
    weight: person.weight ?? null,
    primaryPosition: person.primaryPosition?.abbreviation ?? person.primaryPosition?.name ?? '',
    batSide: person.batSide?.code ?? '',
    pitchHand: person.pitchHand?.code ?? '',
    currentTeam: person.currentTeam?.name ?? '',
    currentTeamId: person.currentTeam?.id ?? 0,
    seasonStats: {
      avg: ss.avg ?? '.---',
      obp: ss.obp ?? '.---',
      slg: ss.slg ?? '.---',
      ops: ss.ops ?? '.---',
      homeRuns: ss.homeRuns ?? 0,
      rbi: ss.rbi ?? 0,
      runs: ss.runs ?? 0,
      hits: ss.hits ?? 0,
      doubles: ss.doubles ?? 0,
      triples: ss.triples ?? 0,
      strikeOuts: ss.strikeOuts ?? 0,
      baseOnBalls: ss.baseOnBalls ?? 0,
      stolenBases: ss.stolenBases ?? 0,
      atBats: ss.atBats ?? 0,
      gamesPlayed: ss.gamesPlayed ?? 0,
    },
    careerStats: {
      avg: cs.avg ?? '.---',
      obp: cs.obp ?? '.---',
      slg: cs.slg ?? '.---',
      ops: cs.ops ?? '.---',
      homeRuns: cs.homeRuns ?? 0,
      rbi: cs.rbi ?? 0,
      runs: cs.runs ?? 0,
      hits: cs.hits ?? 0,
      stolenBases: cs.stolenBases ?? 0,
      gamesPlayed: cs.gamesPlayed ?? 0,
    },
  };
}

export async function fetchMatchupStats(batterId: number, pitcherId: number) {
  const { data } = await mlbApi.get(`/people/${batterId}/stats`, {
    params: { stats: 'vsPlayerTotal', opposingPlayerId: pitcherId, group: 'hitting' },
  });
  return data.stats[0]?.splits[0]?.stat ?? null;
}

export async function fetchGameDetails(gamePk: number) {
  const { data } = await mlbApi.get(`/game/${gamePk}/linescore`);
  return data;
}
