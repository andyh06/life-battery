import { describe, expect, it } from "vitest";
import type { RiskFactorRow } from "@/lib/data";
import { buildQuestionSteps } from "./steps";

function makeFactor(overrides: Partial<RiskFactorRow> & Pick<RiskFactorRow, "key">): RiskFactorRow {
  return {
    label: overrides.key,
    question: `Question for ${overrides.key}`,
    helpText: null,
    category: null,
    tier: "quick",
    inputType: "choice",
    minInput: null,
    maxInput: null,
    step: null,
    unit: null,
    optional: false,
    sensitiveNote: null,
    sortOrder: 0,
    ...overrides,
  };
}

// Mirrors the real shape closely enough to catch a filter that silently
// excludes a factor by input_type, key, or anything besides tier — the
// exact class of bug this file exists to guard against (see the "activity
// question disappeared" incident this test was added for).
const ALL_FACTORS: RiskFactorRow[] = [
  makeFactor({ key: "smoking", tier: "quick", inputType: "choice", sortOrder: 10 }),
  makeFactor({ key: "bmi", tier: "quick", inputType: "height_weight", sortOrder: 20 }),
  makeFactor({ key: "activity", tier: "quick", inputType: "slider", sortOrder: 30 }),
  makeFactor({ key: "sleep", tier: "quick", inputType: "slider", sortOrder: 40 }),
  makeFactor({ key: "alcohol", tier: "advanced", inputType: "choice", sortOrder: 50 }),
  makeFactor({ key: "sedentary", tier: "advanced", inputType: "slider", sortOrder: 70 }),
  makeFactor({ key: "driving", tier: "advanced", inputType: "choice", sortOrder: 180 }),
];

describe("buildQuestionSteps", () => {
  it("always starts with age and sex", () => {
    const steps = buildQuestionSteps(ALL_FACTORS, "quick");
    expect(steps[0]).toEqual({ kind: "age" });
    expect(steps[1]).toEqual({ kind: "sex" });
  });

  it("renders every risk_factors row for the quick tier, and none from advanced", () => {
    const steps = buildQuestionSteps(ALL_FACTORS, "quick");
    const renderedKeys = steps.filter((s) => s.kind === "risk-factor").map((s) => s.riskFactor.key);
    const expectedKeys = ALL_FACTORS.filter((rf) => rf.tier === "quick").map((rf) => rf.key);

    // Order-independent set equality: a factor silently missing (or an
    // extra one leaking in from the other tier) fails this regardless of
    // sort_order.
    expect(new Set(renderedKeys)).toEqual(new Set(expectedKeys));
    expect(renderedKeys).toHaveLength(expectedKeys.length);
  });

  it("advanced is cumulative: it renders every quick-tier row plus every advanced-tier row", () => {
    const steps = buildQuestionSteps(ALL_FACTORS, "advanced");
    const renderedKeys = steps.filter((s) => s.kind === "risk-factor").map((s) => s.riskFactor.key);
    const expectedKeys = ALL_FACTORS.map((rf) => rf.key); // every row, regardless of tier

    expect(new Set(renderedKeys)).toEqual(new Set(expectedKeys));
    expect(renderedKeys).toHaveLength(expectedKeys.length);
  });

  it("never drops the activity (exercise) factor from either tier", () => {
    for (const tier of ["quick", "advanced"] as const) {
      const steps = buildQuestionSteps(ALL_FACTORS, tier);
      const keys = steps.filter((s) => s.kind === "risk-factor").map((s) => s.riskFactor.key);
      expect(keys).toContain("activity");
    }
  });

  it("orders risk-factor steps by sort_order", () => {
    const steps = buildQuestionSteps(ALL_FACTORS, "advanced");
    const orders = steps
      .filter((s) => s.kind === "risk-factor")
      .map((s) => s.riskFactor.sortOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});
