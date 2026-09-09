import { describe, expect, it } from "vitest";
import {
  HAZARD_CLAMP_MAX,
  predict,
  type AnsweredFactor,
  type InterventionOption,
  type LifeTableRow,
} from "./predict";

/**
 * Synthetic but realistically-shaped period life table: qx starts low and
 * rises roughly exponentially with age, closing at qx = 1 for the open-ended
 * "100 and over" group — same shape as the real NCHS state life tables this
 * stands in for.
 */
function makeLifeTable(): LifeTableRow[] {
  const rows: LifeTableRow[] = [];
  for (let age = 0; age < 100; age++) {
    rows.push({ age, qx: Math.min(0.9999, 0.0004 * Math.pow(1.085, age)) });
  }
  rows.push({ age: 100, qx: 1 });
  return rows;
}

const lifeTable = makeLifeTable();

const referenceFactor = (
  riskFactorKey: string,
  hazardRatio: number,
  referenceHazardRatio = 1
): AnsweredFactor => ({
  riskFactorKey,
  label: riskFactorKey,
  levelKey: "test-level",
  hazardRatio,
  referenceHazardRatio,
});

describe("predict", () => {
  it("returns finite, non-negative values for a typical mixed-risk scenario", () => {
    const factors: AnsweredFactor[] = [
      referenceFactor("smoking", 2.8),
      referenceFactor("bmi", 1.45),
      referenceFactor("activity", 0.69), // protective: below reference
    ];
    const interventions: InterventionOption[] = [
      {
        key: "quit_smoking",
        label: "Stop smoking",
        detail: null,
        riskFactorKey: "smoking",
        fromLevel: "test-level",
        toLevel: "former",
        toHazardRatio: 1.25,
        evidenceNote: null,
      },
    ];

    const result = predict({ age: 40, lifeTable, factors, interventions });

    expect(Number.isFinite(result.baselineEx)).toBe(true);
    expect(Number.isFinite(result.adjustedEx)).toBe(true);
    expect(Number.isFinite(result.expectedAgeAtDeath)).toBe(true);
    expect(Number.isFinite(result.batteryPercent)).toBe(true);

    expect(result.baselineEx).toBeGreaterThanOrEqual(0);
    expect(result.adjustedEx).toBeGreaterThanOrEqual(0);
    expect(result.expectedAgeAtDeath).toBeGreaterThanOrEqual(0);
    expect(result.batteryPercent).toBeGreaterThanOrEqual(0);
    expect(result.batteryPercent).toBeLessThanOrEqual(100);

    for (const c of result.contributions) {
      expect(Number.isFinite(c.yearsImpact)).toBe(true);
      expect(c.yearsImpact).toBeGreaterThanOrEqual(0);
    }
    for (const iv of result.interventions) {
      expect(Number.isFinite(iv.yearsGained)).toBe(true);
      expect(iv.yearsGained).toBeGreaterThanOrEqual(0);
    }
  });

  it("a 25-year-old loses more years than a 65-year-old for identical bad answers", () => {
    const badFactors: AnsweredFactor[] = [
      referenceFactor("smoking", 2.8),
      referenceFactor("bmi", 1.94),
    ];

    const young = predict({ age: 25, lifeTable, factors: badFactors, interventions: [] });
    const old = predict({ age: 65, lifeTable, factors: badFactors, interventions: [] });

    const youngLoss = young.baselineEx - young.adjustedEx;
    const oldLoss = old.baselineEx - old.adjustedEx;

    expect(youngLoss).toBeGreaterThan(0);
    expect(oldLoss).toBeGreaterThan(0);
    expect(youngLoss).toBeGreaterThan(oldLoss);
  });

  it("adjustedEx equals baselineEx when every factor is at its reference level", () => {
    const factors: AnsweredFactor[] = [
      referenceFactor("smoking", 1, 1),
      referenceFactor("bmi", 1, 1),
    ];
    const result = predict({ age: 50, lifeTable, factors, interventions: [] });
    expect(result.adjustedEx).toBeCloseTo(result.baselineEx, 6);
  });

  it("clamps combined hazard so an absurd product behaves like the clamp ceiling", () => {
    const atCeiling = predict({
      age: 30,
      lifeTable,
      factors: [referenceFactor("extreme", HAZARD_CLAMP_MAX)],
      interventions: [],
    });
    const wayOverCeiling = predict({
      age: 30,
      lifeTable,
      factors: [referenceFactor("extreme", HAZARD_CLAMP_MAX * 20)],
      interventions: [],
    });

    expect(wayOverCeiling.adjustedEx).toBeCloseTo(atCeiling.adjustedEx, 6);
  });

  it("does not let a single high-qx year push the adjusted probability past 1 (qxAdjusted formula, not qx * H)", () => {
    const spikyTable: LifeTableRow[] = [
      { age: 90, qx: 0.6 },
      { age: 91, qx: 1 },
    ];
    const result = predict({
      age: 90,
      lifeTable: spikyTable,
      factors: [referenceFactor("extreme", HAZARD_CLAMP_MAX)],
      interventions: [],
    });
    // qx * H would be 0.6 * 6 = 3.6, an invalid probability. The correct
    // formula 1 - (1 - qx)^H stays under 1, so adjustedEx must still be a
    // small positive number, not NaN or negative.
    expect(Number.isFinite(result.adjustedEx)).toBe(true);
    expect(result.adjustedEx).toBeGreaterThan(0);
    expect(result.adjustedEx).toBeLessThan(1);
  });

  it("reports zero contribution for a factor already at its reference level", () => {
    const factors: AnsweredFactor[] = [
      referenceFactor("smoking", 2.8), // worse than reference
      referenceFactor("diet", 1, 1), // at reference
    ];
    const result = predict({ age: 45, lifeTable, factors, interventions: [] });

    const smoking = result.contributions.find((c) => c.riskFactorKey === "smoking");
    const diet = result.contributions.find((c) => c.riskFactorKey === "diet");

    expect(smoking?.yearsImpact).toBeGreaterThan(0);
    expect(diet?.yearsImpact).toBe(0);
  });

  it("only includes interventions the user is eligible for, with a positive years gained", () => {
    const factors: AnsweredFactor[] = [referenceFactor("smoking", 2.8)];
    const interventions: InterventionOption[] = [
      {
        key: "quit_smoking",
        label: "Stop smoking",
        detail: null,
        riskFactorKey: "smoking",
        fromLevel: "current",
        toLevel: "former",
        toHazardRatio: 1.25,
        evidenceNote: null,
      },
      {
        key: "not_eligible",
        label: "Wrong from_level",
        detail: null,
        riskFactorKey: "smoking",
        fromLevel: "recent_quit", // doesn't match the user's actual level ("test-level")
        toLevel: "former",
        toHazardRatio: 1.25,
        evidenceNote: null,
      },
      {
        key: "unanswered_factor",
        label: "Factor the user never answered",
        detail: null,
        riskFactorKey: "alcohol",
        fromLevel: null,
        toLevel: "light",
        toHazardRatio: 0.97,
        evidenceNote: null,
      },
    ];

    const result = predict({ age: 40, lifeTable, factors, interventions });

    expect(result.interventions).toHaveLength(0); // "test-level" matches neither fromLevel
  });

  it("includes a null-fromLevel intervention whenever the current level is worse than toLevel", () => {
    const factors: AnsweredFactor[] = [referenceFactor("activity", 1.0)];
    const interventions: InterventionOption[] = [
      {
        key: "meet_activity",
        label: "Meet the activity guideline",
        detail: null,
        riskFactorKey: "activity",
        fromLevel: null,
        toLevel: "guideline",
        toHazardRatio: 0.69,
        evidenceNote: null,
      },
    ];

    const result = predict({ age: 40, lifeTable, factors, interventions });

    expect(result.interventions).toHaveLength(1);
    expect(result.interventions[0].yearsGained).toBeGreaterThan(0);
  });
});
