import type { RiskFactorRow } from "@/lib/data";
import type { QuestionStep, Tier } from "./types";

/**
 * Age and sex are fixed, then every risk_factors row for the chosen tier, in
 * sort_order. Advanced is cumulative — it asks everything Quick does, plus
 * its own extra questions — rather than a disjoint set, so switching to
 * Advanced can only add questions, never silently drop ones Quick would
 * have asked (smoking and BMI included). Pulled out of flow.tsx as a pure
 * function specifically so it's unit-testable without mounting the
 * component — a factor silently missing from this list (e.g. from a bad
 * filter condition) is a correctness bug, not a cosmetic one: anything left
 * out here never enters the model's H.
 */
export function buildQuestionSteps(riskFactors: RiskFactorRow[], tier: Tier): QuestionStep[] {
  const includedTiers: Tier[] = tier === "advanced" ? ["quick", "advanced"] : ["quick"];
  const riskSteps: QuestionStep[] = riskFactors
    .filter((rf) => includedTiers.includes(rf.tier))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((riskFactor) => ({ kind: "risk-factor", riskFactor }));
  return [{ kind: "age" }, { kind: "sex" }, ...riskSteps];
}
