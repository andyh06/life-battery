/**
 * Shared between src/app/api/predict/route.ts (authoritative matching) and
 * the question-screen slider/BMI previews (showing the user which band
 * they're about to land in as they drag) — one implementation so the live
 * preview can never drift from what the API actually computes.
 */
import type { RiskFactorLevelRow, Sex } from "./data";

/**
 * Finds the risk_factor_levels row whose [minValue, maxValue) band contains
 * `value`. Out-of-range values fall back to the nearest band rather than
 * being silently dropped (e.g. a BMI typo of 5 or 500 still resolves to
 * something instead of the whole factor vanishing from the model).
 */
export function matchNumericLevel(
  levels: RiskFactorLevelRow[],
  value: number
): RiskFactorLevelRow | undefined {
  if (levels.length === 0) return undefined;
  const sorted = [...levels].sort(
    (a, b) => (a.minValue ?? -Infinity) - (b.minValue ?? -Infinity)
  );
  const match = sorted.find((level) => {
    const min = level.minValue ?? -Infinity;
    const max = level.maxValue ?? Infinity;
    return value >= min && value < max;
  });
  if (match) return match;
  return value < (sorted[0].minValue ?? -Infinity) ? sorted[0] : sorted[sorted.length - 1];
}

/**
 * Sentinel value for a "Prefer not to say" choice on an optional risk
 * factor. It deliberately never matches a real level_key, so
 * matchNumericLevel/choice lookups both fail to resolve it and the caller's
 * existing "no match -> omit this factor" path handles it — no answer is
 * added to `factors`, so it never enters H. Exported (rather than left
 * implicit) so the skip is an explicit, documented behavior, not an
 * incidental side effect of an unmatched string.
 */
export const SKIP_ANSWER = "__prefer_not_to_say__";

/**
 * Normalizes a choice answer to 0-1 by its rank among its own factor's
 * levels, for the reactive illustrations — ranked by sort_order (the
 * authored dose/intensity order), not hazard ratio. Hazard ratio isn't
 * always monotonic with dose (alcohol's lowest hazard is "light," not
 * "none," from sick-quitter bias in the reference group), which previously
 * made "I don't drink" render as *more* severe than "a few times a year."
 * The illustrations are showing how much of the behavior someone reported,
 * not how epidemiologically risky it is, so rank order is the right axis.
 * Unanswered defaults to 0 (the least-severe visual state) rather than
 * guessing which level is "current."
 */
export function severityFromSortOrder(
  levels: RiskFactorLevelRow[],
  riskFactorKey: string,
  sex: Sex | null,
  levelKey: string | number | undefined
): number {
  const factorLevels = levels
    .filter((l) => l.riskFactorKey === riskFactorKey && (l.appliesToSex === "all" || l.appliesToSex === sex))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (factorLevels.length <= 1 || typeof levelKey !== "string") return 0;
  const index = factorLevels.findIndex((l) => l.levelKey === levelKey);
  if (index === -1) return 0;
  return index / (factorLevels.length - 1);
}
