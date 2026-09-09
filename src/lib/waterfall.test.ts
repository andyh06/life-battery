import { describe, expect, it } from "vitest";
import { buildWaterfallSteps } from "./waterfall";

describe("buildWaterfallSteps", () => {
  it("starts at baseline and lands exactly on adjustedEx", () => {
    const steps = buildWaterfallSteps(20, 15, [
      { riskFactorKey: "smoking", label: "Smoking", yearsImpact: 3 },
      { riskFactorKey: "bmi", label: "Body mass index", yearsImpact: 1 },
    ]);

    expect(steps[0]).toMatchObject({ kind: "baseline", from: 0, to: 20 });
    expect(steps.at(-1)).toMatchObject({ kind: "final", from: 0, to: 15 });
  });

  it("adds an interaction-effect step to reconcile when contributions don't sum to the true gap", () => {
    // 3 + 1 = 4, but the real gap is 20 - 15 = 5 — marginal effects
    // understate the combined loss here, so a cost-direction residual step
    // must appear.
    const steps = buildWaterfallSteps(20, 15, [
      { riskFactorKey: "smoking", label: "Smoking", yearsImpact: 3 },
      { riskFactorKey: "bmi", label: "Body mass index", yearsImpact: 1 },
    ]);

    const interaction = steps.find((s) => s.key === "interaction");
    expect(interaction).toBeDefined();
    expect(interaction?.kind).toBe("cost");
    expect(interaction?.delta).toBeCloseTo(-1, 5);
  });

  it("uses a benefit-direction residual when marginal effects overstate the combined loss", () => {
    // 3 + 3 = 6 summed, but the real gap is only 4 — overlapping marginal
    // effects, so the residual must correct upward.
    const steps = buildWaterfallSteps(20, 16, [
      { riskFactorKey: "smoking", label: "Smoking", yearsImpact: 3 },
      { riskFactorKey: "bmi", label: "Body mass index", yearsImpact: 3 },
    ]);

    const interaction = steps.find((s) => s.key === "interaction");
    expect(interaction).toBeDefined();
    expect(interaction?.kind).toBe("benefit");
    expect(interaction?.delta).toBeCloseTo(2, 5);
  });

  it("every step's bar is non-negative in height (from <= to)", () => {
    const steps = buildWaterfallSteps(20, 16, [
      { riskFactorKey: "smoking", label: "Smoking", yearsImpact: 3 },
      { riskFactorKey: "bmi", label: "Body mass index", yearsImpact: 3 },
    ]);
    for (const step of steps) {
      expect(step.from).toBeLessThanOrEqual(step.to);
    }
  });

  it("skips zero-impact contributions but still reconciles exactly", () => {
    const steps = buildWaterfallSteps(10, 10, [
      { riskFactorKey: "diet", label: "Diet pattern", yearsImpact: 0 },
    ]);
    expect(steps.map((s) => s.key)).toEqual(["baseline", "final"]);
    expect(steps.at(-1)?.to).toBe(10);
  });

  it("omits the interaction step when the reconciliation gap is negligible", () => {
    const steps = buildWaterfallSteps(20, 17, [
      { riskFactorKey: "smoking", label: "Smoking", yearsImpact: 3 },
    ]);
    expect(steps.some((s) => s.key === "interaction")).toBe(false);
  });
});
