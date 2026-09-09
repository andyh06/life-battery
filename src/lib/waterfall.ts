/**
 * Turns baselineEx/adjustedEx/contributions into a sequence of bridge-chart
 * steps: baseline on the left, each factor's marginal cost stepping the
 * running total down, landing on the final adjusted number.
 *
 * Individual contributions are each computed holding every other factor at
 * its answered level (see predict.ts) — since combined hazard is
 * multiplicative, those marginal effects don't literally sum to
 * (baselineEx - adjustedEx). Rather than silently letting the chart land on
 * the wrong number, or silently rescaling the per-factor values shown
 * elsewhere on the page, the gap is surfaced as its own labeled step
 * ("Interaction effect") so the chart still reconciles exactly, honestly.
 */

export type WaterfallStepKind = "baseline" | "cost" | "benefit" | "final";

export interface WaterfallStep {
  key: string;
  label: string;
  kind: WaterfallStepKind;
  /** The bar spans [from, to] on the shared value axis; from <= to always. */
  from: number;
  to: number;
  /** Signed change this step represents (negative for cost, positive for benefit); null for baseline/final, which show an absolute value instead. */
  delta: number | null;
}

export interface WaterfallContribution {
  riskFactorKey: string;
  label: string;
  yearsImpact: number;
}

/** Below this, the interaction-effect step is skipped rather than showing a step that rounds to +/-0.0. */
const RESIDUAL_EPSILON_YEARS = 0.05;

export function buildWaterfallSteps(
  baselineEx: number,
  adjustedEx: number,
  contributions: WaterfallContribution[]
): WaterfallStep[] {
  const steps: WaterfallStep[] = [
    { key: "baseline", label: "Baseline", kind: "baseline", from: 0, to: baselineEx, delta: null },
  ];

  let cumulative = baselineEx;
  for (const c of contributions) {
    if (c.yearsImpact <= 0) continue;
    const next = cumulative - c.yearsImpact;
    steps.push({
      key: c.riskFactorKey,
      label: c.label,
      kind: "cost",
      from: next,
      to: cumulative,
      delta: -c.yearsImpact,
    });
    cumulative = next;
  }

  const residual = cumulative - adjustedEx;
  if (Math.abs(residual) >= RESIDUAL_EPSILON_YEARS) {
    const next = cumulative - residual;
    steps.push({
      key: "interaction",
      label: "Interaction effect",
      kind: residual > 0 ? "cost" : "benefit",
      from: Math.min(next, cumulative),
      to: Math.max(next, cumulative),
      delta: -residual,
    });
    cumulative = next;
  }

  steps.push({ key: "final", label: "Your estimate", kind: "final", from: 0, to: adjustedEx, delta: null });

  return steps;
}
