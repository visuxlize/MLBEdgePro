import type { PitcherStats } from '../api/mlb';

// Sigmoid approximation of the standard normal CDF — accurate to ±0.01
function normalCDF(z: number): number {
  return 1 / (1 + Math.exp(-1.7 * z));
}

export interface PredictionFactor {
  name: string;
  weight: number; // % of model
  winner: string; // team name or 'Neutral'
  detail: string;
  advantage: 'home' | 'away' | 'neutral';
}

export interface GamePrediction {
  homeWinPct: number;
  awayWinPct: number;
  confidence: 'High' | 'Medium' | 'Low';
  predictedWinner: string;
  predictedWinnerPct: number;
  factors: PredictionFactor[];
  inputs: {
    awayEra: string;
    homeEra: string;
    awayWhip: string;
    homeWhip: string;
    awayK9: string;
    homeK9: string;
  };
}

function k9(stats: PitcherStats): number {
  const ip = parseFloat(stats.inningsPitched) || 1;
  return stats.strikeOuts / (ip / 9);
}

export function buildGamePrediction(
  homePitcher: PitcherStats,
  awayPitcher: PitcherStats,
  homeTeamName: string,
  awayTeamName: string,
  weatherPenalty = 0,
): GamePrediction {
  const homeEra = parseFloat(homePitcher.era) || 4.5;
  const awayEra = parseFloat(awayPitcher.era) || 4.5;
  const homeWhip = parseFloat(homePitcher.whip) || 1.3;
  const awayWhip = parseFloat(awayPitcher.whip) || 1.3;
  const homeK9 = k9(homePitcher);
  const awayK9 = k9(awayPitcher);

  // Start at 50/50
  let homeAdj = 0;

  // ERA factor (weight 30%): lower ERA = better pitcher for that team's opponent...
  // wait: home pitcher faces away batters. Better home pitcher → home team wins.
  // ERA advantage: if home pitcher ERA < away pitcher ERA → home advantage
  const eraEdge = (awayEra - homeEra) / 6; // normalized -1 to +1
  homeAdj += eraEdge * 12; // ±12 pts

  // WHIP factor (weight 15%)
  const whipEdge = (awayWhip - homeWhip) / 1.5;
  homeAdj += whipEdge * 8;

  // K/9 factor (weight 10%)
  const k9Edge = (homeK9 - awayK9) / 10;
  homeAdj += k9Edge * 5;

  // Home field advantage (weight 10%): ~54% historical
  homeAdj += 4;

  // Weather (applies to both equally when outdoor)
  // High weather penalty hurts offense (favors pitchers, lowers run scoring)
  // Slight additional boost to home team who knows their park better
  if (weatherPenalty > 5) homeAdj += 1;

  const homeWinPct = Math.round(Math.min(85, Math.max(15, 50 + homeAdj)));
  const awayWinPct = 100 - homeWinPct;

  const eraWinner = homeEra < awayEra ? homeTeamName : awayEra < homeEra ? awayTeamName : 'Neutral';
  const whipWinner = homeWhip < awayWhip ? homeTeamName : awayWhip < homeWhip ? awayTeamName : 'Neutral';
  const k9Winner = homeK9 > awayK9 ? homeTeamName : awayK9 > homeK9 ? awayTeamName : 'Neutral';

  const factors: PredictionFactor[] = [
    {
      name: 'Starting Pitcher ERA',
      weight: 30,
      winner: eraWinner,
      detail: `${homeTeamName} ERA ${homePitcher.era} vs ${awayTeamName} ERA ${awayPitcher.era}`,
      advantage: homeEra < awayEra ? 'home' : homeEra > awayEra ? 'away' : 'neutral',
    },
    {
      name: 'Pitcher WHIP',
      weight: 15,
      winner: whipWinner,
      detail: `${homeTeamName} WHIP ${homePitcher.whip} limits baserunners ${homeWhip < awayWhip ? 'better' : homeWhip > awayWhip ? 'worse' : 'equally'}`,
      advantage: homeWhip < awayWhip ? 'home' : homeWhip > awayWhip ? 'away' : 'neutral',
    },
    {
      name: 'Strikeout Rate',
      weight: 10,
      winner: k9Winner,
      detail: `${homeTeamName} K/9 ${homeK9.toFixed(1)} vs ${awayTeamName} K/9 ${awayK9.toFixed(1)}`,
      advantage: homeK9 > awayK9 ? 'home' : homeK9 < awayK9 ? 'away' : 'neutral',
    },
    {
      name: 'Home Field',
      weight: 10,
      winner: homeTeamName,
      detail: 'Home teams win ~54% of MLB games historically',
      advantage: 'home',
    },
    {
      name: 'Park / Weather',
      weight: 10,
      winner: weatherPenalty > 8 ? 'Neutral' : homeTeamName,
      detail: weatherPenalty > 8 ? 'Adverse conditions affect both teams' : 'No significant weather impact today',
      advantage: weatherPenalty > 8 ? 'neutral' : 'home',
    },
  ];

  const diff = Math.abs(homeWinPct - 50);
  const confidence: 'High' | 'Medium' | 'Low' = diff >= 18 ? 'High' : diff >= 10 ? 'Medium' : 'Low';

  return {
    homeWinPct,
    awayWinPct,
    confidence,
    predictedWinner: homeWinPct >= awayWinPct ? homeTeamName : awayTeamName,
    predictedWinnerPct: Math.max(homeWinPct, awayWinPct),
    factors,
    inputs: {
      homeEra: homePitcher.era,
      awayEra: awayPitcher.era,
      homeWhip: homePitcher.whip,
      awayWhip: awayPitcher.whip,
      homeK9: homeK9.toFixed(2),
      awayK9: awayK9.toFixed(2),
    },
  };
}

// HR probability for a batter based on opposing pitcher
export function hrProbability(batterHrPerAb: number, pitcherEra: number): number {
  // Base HR rate vs ERA-adjusted difficulty
  const leagueHrRate = 0.033;
  const pitcherFactor = pitcherEra / 4.5; // 1.0 = league avg, >1 = hittable
  const prob = batterHrPerAb * pitcherFactor;
  return Math.min(0.35, Math.max(0.04, prob));
}

// Hit probability (single game, 4 PA assumption)
export function hitProbability(avg: number, pitcherWhip: number): number {
  const leagueAvgWhip = 1.30;
  const adj = leagueAvgWhip / Math.max(0.8, pitcherWhip);
  // P(0 hits in 4 PA) with adjusted avg
  const adjAvg = Math.min(0.38, Math.max(0.15, avg * adj));
  const pNoHit = Math.pow(1 - adjAvg, 4);
  return Math.round((1 - pNoHit) * 100);
}

// 2+ hits probability
export function twoHitsProbability(avg: number, pitcherWhip: number): number {
  const leagueAvgWhip = 1.30;
  const adj = leagueAvgWhip / Math.max(0.8, pitcherWhip);
  const adjAvg = Math.min(0.38, Math.max(0.15, avg * adj));
  // P(at least 2 hits in 4 PA)
  const p0 = Math.pow(1 - adjAvg, 4);
  const p1 = 4 * adjAvg * Math.pow(1 - adjAvg, 3);
  return Math.round((1 - p0 - p1) * 100);
}

// Strikeout probability (single game, 4 PA)
export function strikeoutProbability(batterKRate: number, pitcherK9: number): number {
  const leagueK9 = 8.5;
  const adj = pitcherK9 / leagueK9;
  const adjKRate = Math.min(0.45, Math.max(0.1, batterKRate * adj));
  // P(at least 1 K in 4 PA)
  const pNoK = Math.pow(1 - adjKRate, 4);
  return Math.round((1 - pNoK) * 100);
}

// Walk (BB) probability for a batter vs a specific pitcher (single game, 4 PA)
export function walkProbability(batterBbPerPa: number, pitcherBb9: number): number {
  const leagueBb9 = 3.2; // MLB average BB/9
  const adj = Math.max(0.4, pitcherBb9 / leagueBb9); // wilder pitcher → higher adj
  const adjBbRate = Math.min(0.22, Math.max(0.03, batterBbPerPa * adj));
  // P(at least 1 walk in 4 PA)
  const pNoWalk = Math.pow(1 - adjBbRate, 4);
  return Math.round((1 - pNoWalk) * 100);
}

// Pitcher strikeout over/under prop
export function pitcherKLineProp(stats: PitcherStats): {
  projectedKs: number;
  line: number;
  overPct: number;
  underPct: number;
} {
  const ip = parseFloat(stats.inningsPitched) || 1;
  const starts = Math.max(stats.gamesStarted, 1);
  // Average innings per start, capped at 7 (starters rarely go deeper)
  const avgIpPerStart = Math.min(ip / starts, 7);

  const k9 = stats.strikeOuts / (ip / 9);
  // Expected Ks this start = K/9 rate scaled to avg IP
  const projectedKs = k9 * (avgIpPerStart / 9);
  const projectedKsRounded = Math.round(projectedKs * 10) / 10;

  // Standard Vegas half-line below projected
  const line = Math.floor(projectedKsRounded) + 0.5;

  // Poisson approximation — variance ≈ mean, use continuity correction
  const lambda = Math.max(projectedKs, 0.5);
  const z = (line + 0.5 - lambda) / Math.max(Math.sqrt(lambda), 0.5);
  const overPct = Math.round(100 * (1 - normalCDF(z)));

  return {
    projectedKs: projectedKsRounded,
    line,
    overPct: Math.min(82, Math.max(18, overPct)),
    underPct: Math.min(82, Math.max(18, 100 - overPct)),
  };
}
