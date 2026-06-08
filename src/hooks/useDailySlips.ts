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

// ─── Data fetcher ─────────────────────────────────────────────────────────────

interface GameData {
  gamePk: number;
  homeBatters: RosterBatter[];
  awayBatters: RosterBatter[];
  homePitcher: PitcherStats | null;
  awayPitcher: PitcherStats | null;
  homePitcherName: string;
  awayPitcherName: string;
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
  };
}

// ─── Prop builder ─────────────────────────────────────────────────────────────

function buildAllLegs(allData: GameData[]): {
  safe: DailySlipLeg[];
  longshot: DailySlipLeg[];
  kLegs: DailySlipLeg[];
} {
  const hitLegs: DailySlipLeg[] = [];
  const twoHitsLegs: DailySlipLeg[] = [];
  const hrLegs: DailySlipLeg[] = [];
  const kLegs: DailySlipLeg[] = [];
  const seenIds = new Set<string>();

  for (const gd of allData) {
    // Away batters facing home pitcher
    if (gd.homePitcher) {
      const era = parseFloat(gd.homePitcher.era) || 4.5;
      const whip = parseFloat(gd.homePitcher.whip) || 1.30;
      for (const b of gd.awayBatters.slice(0, 9)) {
        const ab = Math.max(b.stats.atBats ?? 1, 1);
        const avg = parseFloat(b.stats.avg) || 0.220;
        const ops = b.stats.ops;
        const addLeg = (type: string, pct: number, arr: DailySlipLeg[]) => {
          const id = `${b.id}-${type}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            arr.push({ id, playerName: b.fullName, propType: type, description: `${b.fullName} ${type} vs ${gd.homePitcherName}`, probability: pct });
          }
        };
        addLeg('Hit', hitProbability(avg, whip), hitLegs);
        addLeg('2+ Hits', twoHitsProbability(avg, whip), twoHitsLegs);
        addLeg('HR', hrNukeProbability(b.stats.homeRuns / ab, era, ops), hrLegs);
      }
      const kp = pitcherKLineProp(gd.homePitcher);
      if (kp.overPct >= 55) {
        const kid = `${gd.gamePk}-hp-k`;
        if (!seenIds.has(kid)) {
          seenIds.add(kid);
          kLegs.push({ id: kid, playerName: gd.homePitcherName, propType: "Pitcher K's", description: `${gd.homePitcherName} Over ${kp.line} K's`, probability: kp.overPct });
        }
      }
    }

    // Home batters facing away pitcher
    if (gd.awayPitcher) {
      const era = parseFloat(gd.awayPitcher.era) || 4.5;
      const whip = parseFloat(gd.awayPitcher.whip) || 1.30;
      for (const b of gd.homeBatters.slice(0, 9)) {
        const ab = Math.max(b.stats.atBats ?? 1, 1);
        const avg = parseFloat(b.stats.avg) || 0.220;
        const ops = b.stats.ops;
        const addLeg = (type: string, pct: number, arr: DailySlipLeg[]) => {
          const id = `${b.id}-${type}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            arr.push({ id, playerName: b.fullName, propType: type, description: `${b.fullName} ${type} vs ${gd.awayPitcherName}`, probability: pct });
          }
        };
        addLeg('Hit', hitProbability(avg, whip), hitLegs);
        addLeg('2+ Hits', twoHitsProbability(avg, whip), twoHitsLegs);
        addLeg('HR', hrNukeProbability(b.stats.homeRuns / ab, era, ops), hrLegs);
      }
      const kp = pitcherKLineProp(gd.awayPitcher);
      if (kp.overPct >= 55) {
        const kid = `${gd.gamePk}-ap-k`;
        if (!seenIds.has(kid)) {
          seenIds.add(kid);
          kLegs.push({ id: kid, playerName: gd.awayPitcherName, propType: "Pitcher K's", description: `${gd.awayPitcherName} Over ${kp.line} K's`, probability: kp.overPct });
        }
      }
    }
  }

  hitLegs.sort((a, b) => b.probability - a.probability);
  twoHitsLegs.sort((a, b) => b.probability - a.probability);
  hrLegs.sort((a, b) => b.probability - a.probability);
  kLegs.sort((a, b) => b.probability - a.probability);

  const safe = hitLegs.filter(l => l.probability >= 62);
  const longshot = [
    ...hrLegs.filter(l => l.probability >= 13).slice(0, 8),
    ...twoHitsLegs.filter(l => l.probability >= 35 && l.probability < 62).slice(0, 6),
  ].sort((a, b) => b.probability - a.probability);

  return { safe, longshot, kLegs };
}

function buildSlips(safe: DailySlipLeg[], longshot: DailySlipLeg[], kLegs: DailySlipLeg[]): DailySlip[] {
  const slips: DailySlip[] = [];

  const take = (arr: DailySlipLeg[], n: number) => arr.slice(0, n);
  const concat = (...arrs: DailySlipLeg[][]) => arrs.flat();

  // 2-Leg Safe
  if (safe.length >= 2)
    slips.push(makeSlip('2-safe', '2-Leg Safe Pick', 'safe', take(safe, 2)));

  // 2-Leg Long Shot
  if (longshot.length >= 2)
    slips.push(makeSlip('2-longshot', '2-Leg Long Shot', 'longshot', take(longshot, 2)));

  // 3-Leg Safe
  const s3 = dedupeByPlayer(concat(take(safe, 2), take(kLegs, 1)));
  if (s3.length >= 3) slips.push(makeSlip('3-safe', '3-Leg Safe Pick', 'safe', s3));
  else if (safe.length >= 3) slips.push(makeSlip('3-safe', '3-Leg Safe Pick', 'safe', take(safe, 3)));

  // 3-Leg Long Shot
  if (longshot.length >= 3)
    slips.push(makeSlip('3-longshot', '3-Leg Long Shot', 'longshot', take(longshot, 3)));

  // 4-Leg Safe
  const s4 = dedupeByPlayer(concat(take(safe, 3), take(kLegs, 1)));
  if (s4.length >= 4) slips.push(makeSlip('4-safe', '4-Leg Safe Pick', 'safe', s4));
  else if (safe.length >= 4) slips.push(makeSlip('4-safe', '4-Leg Safe Pick', 'safe', take(safe, 4)));

  // 4-Leg Long Shot
  if (longshot.length >= 4)
    slips.push(makeSlip('4-longshot', '4-Leg Long Shot', 'longshot', take(longshot, 4)));

  // 5-Leg Safe
  const s5 = dedupeByPlayer(concat(take(safe, 4), take(kLegs, 1)));
  if (s5.length >= 5) slips.push(makeSlip('5-safe', '5-Leg Safe Pick', 'safe', s5));
  else if (safe.length >= 5) slips.push(makeSlip('5-safe', '5-Leg Safe Pick', 'safe', take(safe, 5)));

  // 5-Leg Long Shot
  if (longshot.length >= 5)
    slips.push(makeSlip('5-longshot', '5-Leg Long Shot', 'longshot', take(longshot, 5)));

  return slips;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDailySlips(games: Game[]) {
  const topGames = games.slice(0, 6); // cap at 6 games to limit API calls
  const cacheKey = topGames.map(g => g.gamePk).join(',');

  return useQuery({
    queryKey: ['daily-slips', cacheKey],
    queryFn: async (): Promise<DailySlip[]> => {
      if (topGames.length === 0) return [];
      const allData = await Promise.all(topGames.map(loadGameData));
      const { safe, longshot, kLegs } = buildAllLegs(allData);
      return buildSlips(safe, longshot, kLegs);
    },
    enabled: topGames.length > 0,
    staleTime: 20 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}
