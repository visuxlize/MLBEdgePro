import { BatterStats, PitcherStats } from "../api/mlb";

export interface EdgeScore {
  score: number; // 0-100
  label: "Strong Edge" | "Slight Edge" | "Neutral" | "Avoid";
  color: string;
  factors: { label: string; impact: "positive" | "negative" | "neutral" }[];
}

export function calculateBatterEdge(
  batter: BatterStats,
  pitcher: PitcherStats,
  matchupHistory?: { avg: string; atBats: number } | null,
  weatherPenalty = 0,
): EdgeScore {
  let score = 50; // start neutral
  const factors = [];

  // ERA impact — lower ERA = harder pitcher
  const era = parseFloat(pitcher.era);
  if (era < 3.0) {
    score -= 15;
    factors.push({
      label: `Elite ERA (${pitcher.era})`,
      impact: "negative" as const,
    });
  } else if (era > 4.5) {
    score += 12;
    factors.push({
      label: `Hittable ERA (${pitcher.era})`,
      impact: "positive" as const,
    });
  }

  // Batter AVG
  const avg = parseFloat(batter.avg);
  if (avg > 0.285) {
    score += 10;
    factors.push({
      label: `High AVG (.${batter.avg})`,
      impact: "positive" as const,
    });
  }

  // K rate risk for batter props
  const strikeoutRate = batter.strikeOuts / 162; // rough per-game rate
  if (parseFloat(pitcher.whip) < 1.1) {
    score -= 8;
    factors.push({
      label: `Low WHIP pitcher (${pitcher.whip})`,
      impact: "negative" as const,
    });
  }

  // Career matchup history
  if (matchupHistory && matchupHistory.atBats >= 10) {
    const histAvg = parseFloat(matchupHistory.avg);
    if (histAvg > 0.3) {
      score += 15;
      factors.push({
        label: `Owns pitcher (.${matchupHistory.avg} career)`,
        impact: "positive" as const,
      });
    } else if (histAvg < 0.2) {
      score -= 12;
      factors.push({
        label: `Struggles vs pitcher (.${matchupHistory.avg} career)`,
        impact: "negative" as const,
      });
    }
  }

  // Weather penalty (from Lesson 10)
  score -= weatherPenalty;
  if (weatherPenalty > 5) {
    factors.push({
      label: `Weather conditions (-${weatherPenalty})`,
      impact: "negative" as const,
    });
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    label:
      score >= 70
        ? "Strong Edge"
        : score >= 55
          ? "Slight Edge"
          : score >= 40
            ? "Neutral"
            : "Avoid",
    color:
      score >= 70
        ? "#3fb950"
        : score >= 55
          ? "#f97316"
          : score >= 40
            ? "#8b949e"
            : "#f85149",
    factors,
  };
}
