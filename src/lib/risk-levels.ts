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
 * Normalizes a choice answer's hazard ratio to 0-1 within its own factor's
 * levels, for the reactive illustrations — hazard ratio (not sortOrder or
 * display order) is what actually tracks "worse," and it isn't always
 * monotonic with either (e.g. alcohol's lowest hazard is "light," not
 * "none"). Unanswered defaults to 0 (the least-severe visual state) rather
 * than guessing which level is "current."
 */
export function severityFromHazard(
  levels: RiskFactorLevelRow[],
  riskFactorKey: string,
  sex: Sex | null,
  levelKey: string | number | undefined
): number {
  const factorLevels = levels.filter(
    (l) => l.riskFactorKey === riskFactorKey && (l.appliesToSex === "all" || l.appliesToSex === sex)
  );
  if (factorLevels.length === 0 || typeof levelKey !== "string") return 0;
  const hazards = factorLevels.map((l) => l.hazardRatio);
  const min = Math.min(...hazards);
  const max = Math.max(...hazards);
  if (max === min) return 0;
  const current = factorLevels.find((l) => l.levelKey === levelKey);
  if (!current) return 0;
  return (current.hazardRatio - min) / (max - min);
}
