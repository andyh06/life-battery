/**
 * All Supabase reads live here — this is the only module (besides
 * src/lib/supabase.ts) that talks to the database. Nothing in here does
 * math; that's src/lib/predict.ts. Reference data (life tables, risk
 * factors, levels, interventions, quips) changes rarely, so the read
 * functions are wrapped in unstable_cache to avoid re-querying Supabase on
 * every request.
 */
import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";
import type { LifeTableRow } from "./predict";

const REFERENCE_DATA_REVALIDATE_SECONDS = 3600;

export type Sex = "male" | "female";

export interface StateRow {
  fips: string;
  code: string;
  name: string;
}

export interface RiskFactorRow {
  key: string;
  label: string;
  question: string;
  helpText: string | null;
  category: string | null;
  tier: "quick" | "advanced";
  inputType: "choice" | "number" | "slider" | "height_weight";
  /** Only set for input_type = 'slider': the Slider's range, granularity, and display unit. */
  minInput: number | null;
  maxInput: number | null;
  step: number | null;
  unit: string | null;
  /** When true, the questionnaire offers "Prefer not to say" and shows sensitiveNote above the question. */
  optional: boolean;
  sensitiveNote: string | null;
  sortOrder: number;
}

export interface RiskFactorLevelRow {
  riskFactorKey: string;
  levelKey: string;
  label: string;
  hazardRatio: number;
  appliesToSex: Sex | "all";
  minValue: number | null;
  maxValue: number | null;
  /** One-line explanation shown in a tooltip next to this option, when present. */
  description: string | null;
  sortOrder: number;
}

export interface InterventionRow {
  key: string;
  label: string;
  /** Voice: a one-line, punchy statement. evidenceNote carries the fact underneath it. */
  headline: string | null;
  detail: string | null;
  category: string | null;
  riskFactorKey: string;
  fromLevel: string | null;
  toLevel: string;
  evidenceNote: string | null;
  sortOrder: number;
}

export interface MascotQuipRow {
  trigger: "intro" | "answer" | "result" | "idle";
  riskFactorKey: string | null;
  levelKey: string | null;
  minValue: number | null;
  maxValue: number | null;
  minPercent: number | null;
  maxPercent: number | null;
  text: string;
  mood: string;
  priority: number;
}

/** All 50 states + DC, for the state selector (a plain Select in Stage 1, an animated map from Stage 2 on). */
export const getStates = unstable_cache(
  async (): Promise<StateRow[]> => {
    const { data, error } = await supabase
      .from("states")
      .select("fips, code, name")
      .order("name", { ascending: true });

    if (error) throw new Error(`states query failed: ${error.message}`);
    return data ?? [];
  },
  ["states"],
  { revalidate: REFERENCE_DATA_REVALIDATE_SECONDS }
);

/**
 * Per-state, per-sex life table (CDC/NCHS NVSR 71-02, 2020), qx by age.
 * Cached per (stateFips, sex) pair — unstable_cache includes function
 * arguments in the cache key automatically.
 */
export const getStateLifeTable = unstable_cache(
  async (stateFips: string, sex: Sex): Promise<LifeTableRow[]> => {
    const { data, error } = await supabase
      .from("state_life_table")
      .select("age, qx")
      .eq("state_fips", stateFips)
      .eq("sex", sex)
      .order("age", { ascending: true });

    if (error) {
      throw new Error(`state_life_table query failed: ${error.message}`);
    }
    if (!data || data.length === 0) {
      throw new Error(`No state_life_table rows for state_fips=${stateFips}, sex=${sex}`);
    }
    return data;
  },
  ["state-life-table"],
  { revalidate: REFERENCE_DATA_REVALIDATE_SECONDS }
);

export const getRiskFactors = unstable_cache(
  async (): Promise<RiskFactorRow[]> => {
    const { data, error } = await supabase
      .from("risk_factors")
      .select(
        "key, label, question, help_text, category, tier, input_type, min_input, max_input, step, unit, optional, sensitive_note, sort_order"
      )
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`risk_factors query failed: ${error.message}`);
    return (data ?? []).map((r) => ({
      key: r.key,
      label: r.label,
      question: r.question,
      helpText: r.help_text,
      category: r.category,
      tier: r.tier,
      inputType: r.input_type,
      minInput: r.min_input,
      maxInput: r.max_input,
      step: r.step,
      unit: r.unit,
      optional: r.optional,
      sensitiveNote: r.sensitive_note,
      sortOrder: r.sort_order,
    }));
  },
  ["risk-factors"],
  { revalidate: REFERENCE_DATA_REVALIDATE_SECONDS }
);

export const getRiskFactorLevels = unstable_cache(
  async (): Promise<RiskFactorLevelRow[]> => {
    const { data, error } = await supabase
      .from("risk_factor_levels")
      .select(
        "risk_factor_key, level_key, label, hazard_ratio, applies_to_sex, min_value, max_value, description, sort_order"
      )
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`risk_factor_levels query failed: ${error.message}`);
    return (data ?? []).map((r) => ({
      riskFactorKey: r.risk_factor_key,
      levelKey: r.level_key,
      label: r.label,
      hazardRatio: r.hazard_ratio,
      appliesToSex: r.applies_to_sex,
      minValue: r.min_value,
      maxValue: r.max_value,
      description: r.description,
      sortOrder: r.sort_order,
    }));
  },
  ["risk-factor-levels"],
  { revalidate: REFERENCE_DATA_REVALIDATE_SECONDS }
);

export const getInterventions = unstable_cache(
  async (): Promise<InterventionRow[]> => {
    const { data, error } = await supabase
      .from("interventions")
      .select(
        "key, label, headline, detail, category, risk_factor_key, from_level, to_level, evidence_note, sort_order"
      )
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`interventions query failed: ${error.message}`);
    return (data ?? []).map((r) => ({
      key: r.key,
      label: r.label,
      headline: r.headline,
      detail: r.detail,
      category: r.category,
      riskFactorKey: r.risk_factor_key,
      fromLevel: r.from_level,
      toLevel: r.to_level,
      evidenceNote: r.evidence_note,
      sortOrder: r.sort_order,
    }));
  },
  ["interventions"],
  { revalidate: REFERENCE_DATA_REVALIDATE_SECONDS }
);

export const getMascotQuips = unstable_cache(
  async (): Promise<MascotQuipRow[]> => {
    const { data, error } = await supabase
      .from("mascot_quips")
      .select(
        "trigger, risk_factor_key, level_key, min_value, max_value, min_percent, max_percent, text, mood, priority"
      )
      .eq("active", true);

    if (error) throw new Error(`mascot_quips query failed: ${error.message}`);
    return (data ?? []).map((r) => ({
      trigger: r.trigger,
      riskFactorKey: r.risk_factor_key,
      levelKey: r.level_key,
      minValue: r.min_value,
      maxValue: r.max_value,
      minPercent: r.min_percent,
      maxPercent: r.max_percent,
      text: r.text,
      mood: r.mood,
      priority: r.priority,
    }));
  },
  ["mascot-quips"],
  { revalidate: REFERENCE_DATA_REVALIDATE_SECONDS }
);

export interface EstimateLogEntry {
  mode: "quick" | "advanced";
  stateFips: string;
  age: number;
  sex: Sex;
  inputs: Record<string, string | number>;
  baselineEx: number;
  adjustedEx: number;
  batteryPercent: number;
}

/** Not cached — this is a write, logged once per prediction request. */
export async function logEstimate(entry: EstimateLogEntry): Promise<void> {
  const { error } = await supabase.from("estimates").insert({
    mode: entry.mode,
    state_fips: entry.stateFips,
    age: entry.age,
    sex: entry.sex,
    inputs: entry.inputs,
    baseline_ex: entry.baselineEx,
    adjusted_ex: entry.adjustedEx,
    battery_percent: entry.batteryPercent,
  });
  if (error) {
    throw new Error(`estimates insert failed: ${error.message}`);
  }
}
