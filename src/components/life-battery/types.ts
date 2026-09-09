import type { RiskFactorRow } from "@/lib/data";

/**
 * Quick vs Advanced literally filters risk_factors by its `tier` column
 * (see src/lib/data.ts getRiskFactors) — there is no client-side notion of
 * "quick factors plus advanced factors," by design, so this stays a single
 * value rather than a set.
 */
export type Tier = "quick" | "advanced";

export type Stage =
  | "landing"
  | "select-state"
  | "questions"
  | "submitting"
  | "result"
  | "error";

/**
 * Age and sex aren't rows in risk_factors — they're structural inputs every
 * prediction needs (to pick the right state_life_table) — so they're fixed
 * steps the flow prepends to the risk-factor steps built from the database.
 */
export type QuestionStep =
  | { kind: "age" }
  | { kind: "sex" }
  | { kind: "risk-factor"; riskFactor: RiskFactorRow };

export type Answers = Record<string, string | number>;

/** Only affects how height/weight are displayed and edited — see src/lib/bmi.ts. */
export type UnitSystem = "imperial" | "metric";
