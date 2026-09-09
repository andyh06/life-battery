import { predict, type AnsweredFactor, type InterventionOption } from "@/lib/predict";
import {
  getInterventions,
  getRiskFactorLevels,
  getRiskFactors,
  getStateLifeTable,
  logEstimate,
  type RiskFactorLevelRow,
  type Sex,
} from "@/lib/data";
import { matchNumericLevel } from "@/lib/risk-levels";

interface PredictRequestBody {
  mode?: "quick" | "advanced";
  age: number;
  sex: Sex;
  stateFips: string;
  /**
   * risk_factor_key -> level_key for 'choice' factors, or a raw number for
   * everything else ('slider' factors, and 'height_weight' whose BMI is
   * computed client-side before it ever reaches this route).
   */
  answers: Record<string, string | number>;
}

function isSex(value: unknown): value is Sex {
  return value === "male" || value === "female";
}

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  let body: PredictRequestBody;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be JSON.");
  }

  const { age, sex, stateFips, answers } = body;
  const mode: "quick" | "advanced" = body.mode === "advanced" ? "advanced" : "quick";

  if (typeof age !== "number" || !Number.isInteger(age) || age < 18 || age > 100) {
    return badRequest("age must be an integer between 18 and 100.");
  }
  if (!isSex(sex)) {
    return badRequest('sex must be "male" or "female".');
  }
  if (typeof stateFips !== "string" || stateFips.length !== 2) {
    return badRequest("stateFips must be a 2-character FIPS code.");
  }
  if (!answers || typeof answers !== "object") {
    return badRequest("answers must be an object of risk_factor_key -> answer.");
  }

  const [lifeTable, riskFactors, levels, interventionRows] = await Promise.all([
    getStateLifeTable(stateFips, sex),
    getRiskFactors(),
    getRiskFactorLevels(),
    getInterventions(),
  ]);

  const riskFactorByKey = new Map(riskFactors.map((r) => [r.key, r]));

  const levelsByFactor = new Map<string, RiskFactorLevelRow[]>();
  for (const level of levels) {
    if (level.appliesToSex !== "all" && level.appliesToSex !== sex) continue;
    const list = levelsByFactor.get(level.riskFactorKey) ?? [];
    list.push(level);
    levelsByFactor.set(level.riskFactorKey, list);
  }

  // Resolve each raw answer to a specific hazard ratio + its factor's
  // reference hazard ratio. This is the one place request shape meets
  // reference data — predict.ts never sees risk_factor_levels rows, only
  // the resolved numbers.
  const factors: AnsweredFactor[] = [];
  for (const [riskFactorKey, answer] of Object.entries(answers)) {
    const riskFactor = riskFactorByKey.get(riskFactorKey);
    const candidateLevels = levelsByFactor.get(riskFactorKey);
    if (!riskFactor || !candidateLevels || candidateLevels.length === 0) continue;

    const referenceLevel = candidateLevels.find((l) => l.hazardRatio === 1);

    // Every input_type except 'choice' resolves to a plain number by the
    // time it reaches here — 'number' and 'slider' answers directly, and
    // 'height_weight' as the client-computed BMI value.
    const matched =
      riskFactor.inputType === "choice"
        ? candidateLevels.find((l) => l.levelKey === answer)
        : matchNumericLevel(candidateLevels, typeof answer === "number" ? answer : Number(answer));
    if (!matched) continue;

    factors.push({
      riskFactorKey,
      label: riskFactor.label,
      levelKey: matched.levelKey,
      hazardRatio: matched.hazardRatio,
      referenceHazardRatio: referenceLevel?.hazardRatio ?? 1,
    });
  }

  // Resolve each intervention's to_level to a hazard ratio the same way.
  const levelLookup = new Map(levels.map((l) => [`${l.riskFactorKey}:${l.levelKey}`, l]));
  const interventions: InterventionOption[] = [];
  for (const row of interventionRows) {
    const toLevel = levelLookup.get(`${row.riskFactorKey}:${row.toLevel}`);
    if (!toLevel) continue;
    interventions.push({
      key: row.key,
      label: row.label,
      detail: row.detail,
      riskFactorKey: row.riskFactorKey,
      fromLevel: row.fromLevel,
      toLevel: row.toLevel,
      toHazardRatio: toLevel.hazardRatio,
      evidenceNote: row.evidenceNote,
    });
  }

  const result = predict({ age, lifeTable, factors, interventions });

  await logEstimate({
    mode,
    stateFips,
    age,
    sex,
    inputs: answers,
    baselineEx: result.baselineEx,
    adjustedEx: result.adjustedEx,
    batteryPercent: result.batteryPercent,
  });

  return Response.json(result);
}
