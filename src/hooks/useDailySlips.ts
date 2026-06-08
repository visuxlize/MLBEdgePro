import { useQuery } from '@tanstack/react-query';
import {
  fetchTeamBatters,
  fetchPitcherStats,
  type Game,
  type RosterBatter,
  type PitcherStats,
} from '@/src/api/mlb';
import {
  hrNukeProbability,
  hitProbability,
  twoHitsProbability,
  pitcherKLineProp,
} from '@/src/utils/predictions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailySlipLeg {
  id: string;
  playerName: string;
  propType: string;
  description: string;
  probability: number;
  playerId?: number;
  teamId?: number;
  teamName?: string;
  gamePk?: number;
}

export interface DailySlip {
  id: string;
  label: string;
  tier: 'safe' | 'longshot';
  legCount: number;
  legs: DailySlipLeg[];
  combinedPct: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function legCombinedPct(legs: DailySlipLeg[]): number {
  if (legs.length === 0) return 0;
  return legs.reduce((acc, l) => acc * (l.probability / 100), 1) * 100;
}

function dedupeByPlayer(legs: DailySlipLeg[]): DailySlipLeg[] {
  const seen = new Set<string>();
  const out: DailySlipLeg[] = [];
  for (const l of legs) {
    if (!seen.has(l.playerName)) { seen.add(l.playerName); out.push(l); }
  }
  return out;
}

function makeSlip(
  id: string,
  label: string,
  tier: 'safe' | 'longshot',
  legs: DailySlipLeg[],
): DailySlip {
  const unique = dedupeByPlayer(legs);
  return { id, label, tier, legCount: unique.length, legs: unique, combinedPct: legCombinedPct(unique) };
}

// Pick legs preferring one per game for diversity
function spreadAcrossGames(legs: DailySlipLeg[], count: number): DailySlipLeg[] {
  const result: DailySlipLeg[] = [];
  const usedGames = new Set<number>();
  const usedPlayers = new Set<string>();

  for (const leg of legs) {
    if (result.length >= count) break;
    const gk = leg.gamePk ?? 0;
    if (!usedGames.has(gk) && !usedPlayers.has(leg.playerName)) {
      usedGames.add(gk);
      usedPlayers.add(leg.playerName);
      result.push(leg);
    }
  }
  // Fill remaining without game restriction
  for (const leg of legs) {
    if (result.length >= count) break;
    if (!usedPlayers.has(leg.playerName)) {
      usedPlayers.add(leg.playerName);
      result.push(leg);
    }
  }
  return result;
}

// Merge arrays preserving unique players
function mergeUnique(...arrs: DailySlipLeg[][]): DailySlipLeg[] {
  const seen = new Set<string>();
  const result: DailySlipLeg[] = [];
  for (const arr of arrs) {
    for (const leg of arr) {
      if (!seen.has(leg.playerName)) {
        seen.add(leg.playerName);
        result.push(leg);
      }
    }
  }
  return result;
}

// ─── Data fetcher ─────────────────────────────────────────────────────────────

interface GameData {
  gamePk: number;
  homeBatters: RosterBatter[];
  awayBatters: RosterBatter[];
  homePitcher: PitcherStats | null;
  awayPitcher: PitcherStats | null;
  homePitcherName: string;
  awayPitcherName: string;
  homeTeamId: number;
  awayTeamId: number;
  homePitcherId: number;
  awayPitcherId: number;
}

async function loadGameData(game: Game): Promise<GameData> {
  const [hb, ab, hp, ap] = await Promise.all([
    fetchTeamBatters(game.teams.home.team.id).catch(() => [] as RosterBatter[]),
    fetchTeamBatters(game.teams.away.team.id).catch(() => [] as RosterBatter[]),
    game.teams.home.probablePitcher?.id
      ? fetchPitcherStats(game.teams.home.probablePitcher.id).catch(() => null)
      : Promise.resolve(null as PitcherStats | null),
    game.teams.away.probablePitcher?.id
      ? fetchPitcherStats(game.teams.away.probablePitcher.id).catch(() => null)
      : Promise.resolve(null as PitcherStats | null),
  ]);
  return {
    gamePk: game.gamePk,
    homeBatters: hb,
    awayBatters: ab,
    homePitcher: hp,
    awayPitcher: ap,
    homePitcherName: game.teams.home.probablePitcher?.fullName ?? 'TBD',
    awayPitcherName: game.teams.away.probablePitcher?.fullName ?? 'TBD',
    homeTeamId: game.teams.home.team.id,
    awayTeamId: game.teams.away.team.id,
    homePitcherId: game.teams.home.probablePitcher?.id ?? 0,
    awayPitcherId: game.teams.away.probablePitcher?.id ?? 0,
  };
}

// ─── Leg builder ──────────────────────────────────────────────────────────────

interface AllLegs {
  hitLegs: DailySlipLeg[];      // 1+ Hit, high probability
  twoHitLegs: DailySlipLeg[];   // 2+ Hits, mid probability
  hrLegs: DailySlipLeg[];       // Home Run, low-mid probability
  kOverLegs: DailySlipLeg[];    // Pitcher K Over
  kUnderLegs: DailySlipLeg[];   // Pitcher K Under
}

function buildAllLegs(allData: GameData[]): AllLegs {
  const hitLegs: DailySlipLeg[] = [];
  const twoHitLegs: DailySlipLeg[] = [];
  const hrLegs: DailySlipLeg[] = [];
  const kOverLegs: DailySlipLeg[] = [];
  const kUnderLegs: DailySlipLeg[] = [];
  const seenIds = new Set<string>();

  for (const gd of allData) {
    const processBatters = (
      batters: RosterBatter[],
      pitcher: PitcherStats,
      pitcherName: string,
      batterTeamId: number,
    ) => {
      const era = parseFloat(pitcher.era) || 4.5;
      const whip = parseFloat(pitcher.whip) || 1.30;

      for (const b of batters.slice(0, 9)) {
        const ab = Math.max(b.stats.atBats ?? 1, 1);
        const avg = parseFloat(b.stats.avg) || 0.220;
        const ops = b.stats.ops;

        const addLeg = (type: string, label: string, pct: number, arr: DailySlipLeg[]) => {
          const id = `${b.id}-${type}-${gd.gamePk}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            arr.push({
              id,
              playerName: b.fullName,
              propType: type,
              description: `${b.fullName} ${label} vs ${pitcherName}`,
              probability: pct,
              playerId: b.id,
              teamId: batterTeamId,
              gamePk: gd.gamePk,
            });
          }
        };

        addLeg('Hit', '1+ Hit', hitProbability(avg, whip), hitLegs);
        addLeg('2+ Hits', '2+ Hits', twoHitsProbability(avg, whip), twoHitLegs);
        addLeg('HR', 'Home Run', hrNukeProbability(b.stats.homeRuns / ab, era, ops), hrLegs);
      }
    };

    if (gd.homePitcher) {
      processBatters(gd.awayBatters, gd.homePitcher, gd.homePitcherName, gd.awayTeamId);

      const kp = pitcherKLineProp(gd.homePitcher);
      const overId = `${gd.gamePk}-hp-k-over`;
      const underId = `${gd.gamePk}-hp-k-under`;
      if (!seenIds.has(overId)) {
        seenIds.add(overId);
        kOverLegs.push({ id: overId, playerName: gd.homePitcherName, propType: "Pitcher K's", description: `${gd.homePitcherName} Over ${kp.line} K's`, probability: kp.overPct, playerId: gd.homePitcherId, teamId: gd.homeTeamId, gamePk: gd.gamePk });
      }
      if (!seenIds.has(underId)) {
        seenIds.add(underId);
        kUnderLegs.push({ id: underId, playerName: gd.homePitcherName, propType: "K Under", description: `${gd.homePitcherName} Under ${kp.line} K's`, probability: kp.underPct, playerId: gd.homePitcherId, teamId: gd.homeTeamId, gamePk: gd.gamePk });
      }
    }

    if (gd.awayPitcher) {
      processBatters(gd.homeBatters, gd.awayPitcher, gd.awayPitcherName, gd.homeTeamId);

      const kp = pitcherKLineProp(gd.awayPitcher);
      const overId = `${gd.gamePk}-ap-k-over`;
      const underId = `${gd.gamePk}-ap-k-under`;
      if (!seenIds.has(overId)) {
        seenIds.add(overId);
        kOverLegs.push({ id: overId, playerName: gd.awayPitcherName, propType: "Pitcher K's", description: `${gd.awayPitcherName} Over ${kp.line} K's`, probability: kp.overPct, playerId: gd.awayPitcherId, teamId: gd.awayTeamId, gamePk: gd.gamePk });
      }
      if (!seenIds.has(underId)) {
        seenIds.add(underId);
        kUnderLegs.push({ id: underId, playerName: gd.awayPitcherName, propType: "K Under", description: `${gd.awayPitcherName} Under ${kp.line} K's`, probability: kp.underPct, playerId: gd.awayPitcherId, teamId: gd.awayTeamId, gamePk: gd.gamePk });
      }
    }
  }

  hitLegs.sort((a, b) => b.probability - a.probability);
  twoHitLegs.sort((a, b) => b.probability - a.probability);
  hrLegs.sort((a, b) => b.probability - a.probability);
  kOverLegs.sort((a, b) => b.probability - a.probability);
  kUnderLegs.sort((a, b) => b.probability - a.probability);

  return {
    hitLegs: hitLegs.filter(l => l.probability >= 62),
    twoHitLegs: twoHitLegs.filter(l => l.probability >= 30 && l.probability < 62),
    hrLegs: hrLegs.filter(l => l.probability >= 10),
    kOverLegs: kOverLegs.filter(l => l.probability >= 52),
    kUnderLegs: kUnderLegs.filter(l => l.probability >= 40),
  };
}

// ─── Slip builder — diverse cross-game strategies ─────────────────────────────

function buildSlips({ hitLegs, twoHitLegs, hrLegs, kOverLegs, kUnderLegs }: AllLegs): DailySlip[] {
  const slips: DailySlip[] = [];

  // ── SAFE PICKS: Hit props spread across games, mixed with Pitcher Ks ─────

  // 2-safe: 2 hit props from different games
  const s2 = spreadAcrossGames(hitLegs, 2);
  if (s2.length >= 2) slips.push(makeSlip('2-safe', '2-Leg Safe Pick', 'safe', s2));

  // 3-safe: 2 spread hits + best Pitcher K Over
  const s3 = mergeUnique(spreadAcrossGames(hitLegs, 2), kOverLegs.slice(0, 1));
  if (s3.length >= 3) slips.push(makeSlip('3-safe', '3-Leg Safe Pick', 'safe', s3.slice(0, 3)));
  else {
    const alt = spreadAcrossGames(hitLegs, 3);
    if (alt.length >= 3) slips.push(makeSlip('3-safe', '3-Leg Safe Pick', 'safe', alt));
  }

  // 4-safe: 3 spread hits (3 different games) + best Pitcher K Over
  const s4 = mergeUnique(spreadAcrossGames(hitLegs, 3), kOverLegs.slice(0, 1));
  if (s4.length >= 4) slips.push(makeSlip('4-safe', '4-Leg Safe Pick', 'safe', s4.slice(0, 4)));
  else {
    const alt = spreadAcrossGames(hitLegs, 4);
    if (alt.length >= 4) slips.push(makeSlip('4-safe', '4-Leg Safe Pick', 'safe', alt));
  }

  // 5-safe: 4 spread hits + best Pitcher K Over
  const s5 = mergeUnique(spreadAcrossGames(hitLegs, 4), kOverLegs.slice(0, 1));
  if (s5.length >= 5) slips.push(makeSlip('5-safe', '5-Leg Safe Pick', 'safe', s5.slice(0, 5)));
  else {
    const alt = spreadAcrossGames(hitLegs, 5);
    if (alt.length >= 5) slips.push(makeSlip('5-safe', '5-Leg Safe Pick', 'safe', alt));
  }

  // ── LONG SHOTS: HR + 2-Hit combos, spread across games ───────────────────

  // 2-long: best HR + best 2-Hit from different game
  const l2 = mergeUnique(spreadAcrossGames(hrLegs, 1), spreadAcrossGames(twoHitLegs, 1));
  if (l2.length >= 2) {
    slips.push(makeSlip('2-longshot', '2-Leg Long Shot', 'longshot', l2.slice(0, 2)));
  } else {
    const combined = [...hrLegs, ...twoHitLegs].sort((a, b) => b.probability - a.probability);
    const alt = spreadAcrossGames(combined, 2);
    if (alt.length >= 2) slips.push(makeSlip('2-longshot', '2-Leg Long Shot', 'longshot', alt));
  }

  // 3-long: best HR + 2 spread 2-Hit picks
  const l3 = mergeUnique(spreadAcrossGames(hrLegs, 1), spreadAcrossGames(twoHitLegs, 2));
  if (l3.length >= 3) {
    slips.push(makeSlip('3-longshot', '3-Leg Long Shot', 'longshot', l3.slice(0, 3)));
  } else {
    const combined = [...hrLegs, ...twoHitLegs].sort((a, b) => b.probability - a.probability);
    const alt = spreadAcrossGames(combined, 3);
    if (alt.length >= 3) slips.push(makeSlip('3-longshot', '3-Leg Long Shot', 'longshot', alt));
  }

  // 4-long: 2 spread HR + 2 spread 2-Hit from different games
  const l4 = mergeUnique(spreadAcrossGames(hrLegs, 2), spreadAcrossGames(twoHitLegs, 2));
  if (l4.length >= 4) {
    slips.push(makeSlip('4-longshot', '4-Leg Long Shot', 'longshot', l4.slice(0, 4)));
  } else {
    const combined = [...hrLegs, ...twoHitLegs].sort((a, b) => b.probability - a.probability);
    const alt = spreadAcrossGames(combined, 4);
    if (alt.length >= 4) slips.push(makeSlip('4-longshot', '4-Leg Long Shot', 'longshot', alt));
  }

  // 5-long: 2 spread HR + 2 spread 2-Hit + best Pitcher K Under
  const l5 = mergeUnique(spreadAcrossGames(hrLegs, 2), spreadAcrossGames(twoHitLegs, 2), kUnderLegs.slice(0, 1));
  if (l5.length >= 5) {
    slips.push(makeSlip('5-longshot', '5-Leg Long Shot', 'longshot', l5.slice(0, 5)));
  } else {
    const combined = [...hrLegs, ...twoHitLegs].sort((a, b) => b.probability - a.probability);
    const alt = mergeUnique(spreadAcrossGames(combined, 4), kUnderLegs.slice(0, 1));
    if (alt.length >= 5) slips.push(makeSlip('5-longshot', '5-Leg Long Shot', 'longshot', alt.slice(0, 5)));
    else {
      const alt2 = spreadAcrossGames(combined, 5);
      if (alt2.length >= 5) slips.push(makeSlip('5-longshot', '5-Leg Long Shot', 'longshot', alt2));
    }
  }

  return slips;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDailySlips(games: Game[]) {
  const topGames = games.slice(0, 6);
  const cacheKey = topGames.map(g => g.gamePk).join(',');

  return useQuery({
    queryKey: ['daily-slips', cacheKey],
    queryFn: async (): Promise<DailySlip[]> => {
      if (topGames.length === 0) return [];
      const allData = await Promise.all(topGames.map(loadGameData));
      const legs = buildAllLegs(allData);
      return buildSlips(legs);
    },
    enabled: topGames.length > 0,
    staleTime: 20 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}
