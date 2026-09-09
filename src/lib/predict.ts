/**
 * Pure life-expectancy math. No I/O, no framework imports — this module is
 * lifted out verbatim into a standalone model API in Homework 4, so it must
 * not import Supabase, Next.js, or anything else app-specific. Every input
 * it needs (life table, resolved risk factor levels, resolved interventions)
 * is assembled by the caller — see src/lib/data.ts for Supabase reads and
 * src/app/api/predict/route.ts for how the two are wired together.
 */

/** One row of a per-state, per-sex period life table. */
export interface LifeTableRow {
  /** Exact age in whole years. The last row (100) is the open-ended "100 and over" group. */
  age: number;
  /** Probability of dying between age x and age x + 1. */
  qx: number;
}

/** A risk factor the user answered, already resolved to a specific hazard ratio. */
export interface AnsweredFactor {
  riskFactorKey: string;
  /** Human label, passed through untouched for display — predict.ts never reads it. */
  label: string;
  levelKey: string;
  hazardRatio: number;
  /**
   * Hazard ratio of this risk factor's reference level (the level in
   * risk_factor_levels with hazard_ratio === 1). Needed to compute this
   * factor's individual contribution without predict.ts touching the DB.
   */
  referenceHazardRatio: number;
}

/** A possible "what you can still change" swap, already resolved to a target hazard ratio. */
export interface InterventionOption {
  key: string;
  label: string;
  headline: string | null;
  detail: string | null;
  riskFactorKey: string;
  /** null means "applies whenever the user's current level is worse than toLevel". */
  fromLevel: string | null;
  toLevel: string;
  toHazardRatio: number;
  evidenceNote: string | null;
}

export interface PredictInput {
  /** User's current age in whole years, 0-100. */
  age: number;
  /** Per-state, per-sex life table. Any age range is fine — predict.ts only walks from `age` up. */
  lifeTable: LifeTableRow[];
  factors: AnsweredFactor[];
  interventions: InterventionOption[];
}

export interface ContributionResult {
  riskFactorKey: string;
  label: string;
  levelKey: string;
  /** Years of remaining life this factor is currently costing, relative to its reference level. Never negative — see note on predict(). */
  yearsImpact: number;
}

export interface InterventionResult {
  key: string;
  label: string;
  headline: string | null;
  detail: string | null;
  riskFactorKey: string;
  evidenceNote: string | null;
  /** Years of remaining life gained by making this swap, holding everything else constant. */
  yearsGained: number;
}

/** One "X% chance of reaching age N" data point, computed from the adjusted table. */
export interface SurvivalMilestone {
  age: number;
  probabilityPercent: number;
}

/**
 * The battery fill's edge is a single point estimate, but the underlying
 * table implies a whole distribution of plausible ages at death. This is
 * that distribution's interquartile range, expressed on the same 0-100
 * battery scale as batteryPercent: lowerBatteryPercent is where the fill
 * would land in the pessimistic (25th-percentile age-at-death) scenario,
 * upperBatteryPercent the optimistic (75th-percentile) one.
 */
export interface UncertaintyBand {
  lowerBatteryPercent: number;
  upperBatteryPercent: number;
}

export interface PredictResult {
  baselineEx: number;
  adjustedEx: number;
  expectedAgeAtDeath: number;
  /** 0-100. Fraction of total lifespan (age + remaining years) still ahead. */
  batteryPercent: number;
  contributions: ContributionResult[];
  interventions: InterventionResult[];
  /** At most two milestones, chosen to be the most informative for this person — see pickInformativeMilestones. */
  survivalMilestones: SurvivalMilestone[];
  uncertaintyBand: UncertaintyBand;
}

/**
 * Hazard ratios in risk_factor_levels come from multivariable-adjusted
 * studies, so each is a marginal effect estimated in isolation. Multiplying
 * several together, as if independent, can compound past what any single
 * study observed — especially since real-world factors correlate (smoking
 * and low income, poor sleep and chronic stress, etc). This clamp is a
 * safety rail against that compounding producing an absurd output, not a
 * claim that combined hazard is capped at these values in reality.
 */
export const HAZARD_CLAMP_MIN = 0.4;
export const HAZARD_CLAMP_MAX = 6;

function clampHazard(h: number): number {
  return Math.min(HAZARD_CLAMP_MAX, Math.max(HAZARD_CLAMP_MIN, h));
}

function combinedHazard(factors: { hazardRatio: number }[]): number {
  return factors.reduce((product, f) => product * f.hazardRatio, 1);
}

/**
 * Remaining life expectancy from `fromAge`, walking the life table forward
 * one year at a time and summing survivor-years. Assumes deaths are
 * uniformly distributed within each age band (the standard actuarial "UDD"
 * assumption used to derive Lx from lx in the source tables) — someone who
 * dies during age band [a, a+1) lives, on average, half that year, hence
 * `1 - 0.5 * qx`. This is re-derived from qx directly (rather than reading
 * the table's own ex column) so the hazard multiplier can be folded into qx
 * before summing.
 */
function remainingLifeExpectancy(
  qxByAge: Map<number, number>,
  fromAge: number,
  hazard: number
): number {
  if (qxByAge.size === 0) return 0;
  const maxAge = Math.max(...qxByAge.keys());
  let survivorsAtStartOfYear = 1;
  let years = 0;
  for (let a = fromAge; a <= maxAge; a++) {
    const qx = qxByAge.get(a);
    if (qx === undefined) break;
    // qxAdjusted = 1 - (1 - qx)^H scales the underlying hazard rate itself,
    // so it stays in [0, 1] for any H > 0. Using qx * H instead can exceed 1
    // at old ages where qx is already large, which is nonsense for a
    // probability.
    const qxAdjusted = 1 - Math.pow(1 - qx, hazard);
    years += survivorsAtStartOfYear * (1 - 0.5 * qxAdjusted);
    survivorsAtStartOfYear *= 1 - qxAdjusted;
  }
  return years;
}

/** Ages the result screen offers to check survival against — not every one is shown; see pickInformativeMilestones. */
const SURVIVAL_MILESTONE_AGES = [70, 80, 90, 100];

/**
 * P(alive at `toAge` | alive at `fromAge`) under the adjusted hazard — the
 * same qxAdjusted = 1 - (1-qx)^H used by remainingLifeExpectancy, just
 * multiplied through as a survivorship product instead of summed into
 * years.
 */
function survivalProbability(
  qxByAge: Map<number, number>,
  fromAge: number,
  toAge: number,
  hazard: number
): number {
  let survivors = 1;
  for (let a = fromAge; a < toAge; a++) {
    const qx = qxByAge.get(a);
    if (qx === undefined) return survivors;
    const qxAdjusted = 1 - Math.pow(1 - qx, hazard);
    survivors *= 1 - qxAdjusted;
  }
  return survivors;
}

/**
 * Inverse of survivalProbability: the age at which cumulative survival from
 * `fromAge` first drops to `targetProbability`, linearly interpolated
 * within the one-year band it crosses in. Used to turn a percentile (e.g.
 * "the 25th-percentile age at death") into an actual age for the
 * uncertainty band.
 */
function ageAtSurvivalProbability(
  qxByAge: Map<number, number>,
  fromAge: number,
  targetProbability: number,
  hazard: number
): number {
  const maxAge = Math.max(...qxByAge.keys());
  let survivors = 1;
  for (let a = fromAge; a <= maxAge; a++) {
    const qx = qxByAge.get(a);
    if (qx === undefined) break;
    const qxAdjusted = 1 - Math.pow(1 - qx, hazard);
    const survivorsAfter = survivors * (1 - qxAdjusted);
    if (survivorsAfter <= targetProbability) {
      const span = survivors - survivorsAfter;
      const fraction = span === 0 ? 0 : (survivors - targetProbability) / span;
      return a + Math.min(1, Math.max(0, fraction));
    }
    survivors = survivorsAfter;
  }
  // Never dropped to target within the table (e.g. a very young, very
  // low-hazard person and a demanding target) — treat as "past the table".
  return maxAge + 1;
}

/**
 * Always showing "reaching 70/80/90/100" is uninformative once several are
 * near-certain or near-impossible for this person — a 30-year-old's "99%
 * chance of reaching 70" says nothing. Picks the milestone closest to a
 * coin-flip (most informative on its own) plus its neighbor, so the pair
 * brackets the person's actual likely range rather than always being the
 * same four ages.
 */
function pickInformativeMilestones(milestones: SurvivalMilestone[]): SurvivalMilestone[] {
  if (milestones.length <= 2) return milestones;
  let bestIndex = 0;
  let bestDistance = Infinity;
  milestones.forEach((m, i) => {
    const distance = Math.abs(m.probabilityPercent - 50);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  });
  const partnerIndex = bestIndex + 1 < milestones.length ? bestIndex + 1 : bestIndex - 1;
  return [bestIndex, partnerIndex].sort((a, b) => a - b).map((i) => milestones[i]);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * contributions[] and interventions[] report years relative to the user's
 * actual adjustedEx. A factor where the user is already at (or better than)
 * the comparison level would otherwise produce a negative "impact"/"gain",
 * which isn't a meaningful thing to show in either list — floored at 0
 * rather than surfaced as a negative number.
 */
function nonNegativeRound(value: number, decimals: number): number {
  return Math.max(0, round(value, decimals));
}

export function predict(input: PredictInput): PredictResult {
  const { age, lifeTable, factors, interventions } = input;

  const qxByAge = new Map(lifeTable.map((row) => [row.age, row.qx]));

  const hazard = clampHazard(combinedHazard(factors));

  const baselineExRaw = remainingLifeExpectancy(qxByAge, age, 1);
  const adjustedExRaw = remainingLifeExpectancy(qxByAge, age, hazard);
  const lifespan = age + adjustedExRaw;
  const batteryPercent =
    lifespan > 0 ? Math.min(100, Math.max(0, (adjustedExRaw / lifespan) * 100)) : 0;

  const maxTableAge = qxByAge.size > 0 ? Math.max(...qxByAge.keys()) : age;
  const allMilestones: SurvivalMilestone[] = SURVIVAL_MILESTONE_AGES.filter(
    (m) => m > age && m <= maxTableAge
  ).map((m) => ({
    age: m,
    probabilityPercent: round(survivalProbability(qxByAge, age, m, hazard) * 100, 0),
  }));
  const survivalMilestones = pickInformativeMilestones(allMilestones);

  let uncertaintyBand: UncertaintyBand = { lowerBatteryPercent: 0, upperBatteryPercent: 0 };
  if (lifespan > 0 && qxByAge.size > 0) {
    // Pessimistic: age at which only 75% of people like this are still
    // alive (25th percentile of age at death). Optimistic: the 25%-survival
    // age (75th percentile). Expressed as battery-percent positions using
    // the same denominator (expectedAgeAtDeath) as the fill itself, so the
    // band sits on the same scale as the point estimate.
    const pessimisticAge = ageAtSurvivalProbability(qxByAge, age, 0.75, hazard);
    const optimisticAge = ageAtSurvivalProbability(qxByAge, age, 0.25, hazard);
    const toBatteryPercent = (deathAge: number) =>
      Math.min(100, Math.max(0, ((deathAge - age) / lifespan) * 100));
    const lower = toBatteryPercent(pessimisticAge);
    const upper = toBatteryPercent(optimisticAge);
    uncertaintyBand = {
      lowerBatteryPercent: round(Math.min(lower, upper), 1),
      upperBatteryPercent: round(Math.max(lower, upper), 1),
    };
  }

  const contributions: ContributionResult[] = factors
    .map((factor) => {
      const withoutFactor = factors.map((f) =>
        f.riskFactorKey === factor.riskFactorKey
          ? { ...f, hazardRatio: f.referenceHazardRatio }
          : f
      );
      const hazardWithout = clampHazard(combinedHazard(withoutFactor));
      const exWithout = remainingLifeExpectancy(qxByAge, age, hazardWithout);
      return {
        riskFactorKey: factor.riskFactorKey,
        label: factor.label,
        levelKey: factor.levelKey,
        yearsImpact: nonNegativeRound(exWithout - adjustedExRaw, 2),
      };
    })
    .sort((a, b) => b.yearsImpact - a.yearsImpact);

  const interventionResults: InterventionResult[] = interventions
    .map((option): InterventionResult | null => {
      const current = factors.find((f) => f.riskFactorKey === option.riskFactorKey);
      if (!current) return null;

      const eligible =
        option.fromLevel !== null
          ? current.levelKey === option.fromLevel
          : current.hazardRatio > option.toHazardRatio;
      if (!eligible) return null;

      const withIntervention = factors.map((f) =>
        f.riskFactorKey === option.riskFactorKey ? { ...f, hazardRatio: option.toHazardRatio } : f
      );
      const hazardWith = clampHazard(combinedHazard(withIntervention));
      const exWith = remainingLifeExpectancy(qxByAge, age, hazardWith);

      return {
        key: option.key,
        label: option.label,
        headline: option.headline,
        detail: option.detail,
        riskFactorKey: option.riskFactorKey,
        evidenceNote: option.evidenceNote,
        yearsGained: nonNegativeRound(exWith - adjustedExRaw, 2),
      };
    })
    .filter((r): r is InterventionResult => r !== null)
    .sort((a, b) => b.yearsGained - a.yearsGained);

  return {
    baselineEx: round(baselineExRaw, 2),
    adjustedEx: round(adjustedExRaw, 2),
    expectedAgeAtDeath: round(age + adjustedExRaw, 1),
    batteryPercent: round(batteryPercent, 1),
    contributions,
    interventions: interventionResults,
    survivalMilestones,
    uncertaintyBand,
  };
}
