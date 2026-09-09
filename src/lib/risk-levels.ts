/**
 * Shared between src/app/api/predict/route.ts (authoritative matching) and
 * the question-screen slider/BMI previews (showing the user which band
 * they're about to land in as they drag) — one implementation so the live
 * preview can never drift from what the API actually computes.
 */
import type { RiskFactorLevelRow } from "./data";

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
