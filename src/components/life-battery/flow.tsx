"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { RiskFactorLevelRow, RiskFactorRow, Sex, StateRow } from "@/lib/data";
import { bmiFromImperial } from "@/lib/bmi";
import type { PredictResult } from "@/lib/predict";
import { LandingScreen } from "./landing-screen";
import { QuestionScreen } from "./question-screen";
import { ResultScreen } from "./result/result-screen";
import { StateSelect } from "./state-select";
import type { Answers, QuestionStep, Stage, Tier, UnitSystem } from "./types";

const DEFAULT_AGE = 30;
const DEFAULT_HEIGHT_INCHES = 67; // 5'7", roughly the population average
const DEFAULT_WEIGHT_LB = 160;

interface LifeBatteryFlowProps {
  states: StateRow[];
  riskFactors: RiskFactorRow[];
  riskFactorLevels: RiskFactorLevelRow[];
}

export function LifeBatteryFlow({ states, riskFactors, riskFactorLevels }: LifeBatteryFlowProps) {
  const [stage, setStage] = useState<Stage>("landing");
  const [tier, setTier] = useState<Tier>("quick");
  const [stateFips, setStateFips] = useState<string | null>(null);
  const [age, setAge] = useState(DEFAULT_AGE);
  const [sex, setSex] = useState<Sex | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [heightWeightUnit, setHeightWeightUnit] = useState<UnitSystem>("imperial");
  const [heightInches, setHeightInches] = useState(DEFAULT_HEIGHT_INCHES);
  const [weightLb, setWeightLb] = useState(DEFAULT_WEIGHT_LB);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Age and sex are fixed, then every risk_factors row for the chosen tier,
  // in sort_order. Rebuilds only when the tier toggle changes.
  const steps: QuestionStep[] = useMemo(() => {
    const riskSteps: QuestionStep[] = riskFactors
      .filter((rf) => rf.tier === tier)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((riskFactor) => ({ kind: "risk-factor", riskFactor }));
    return [{ kind: "age" }, { kind: "sex" }, ...riskSteps];
  }, [riskFactors, tier]);

  const hasHeightWeightStep = steps.some(
    (s) => s.kind === "risk-factor" && s.riskFactor.inputType === "height_weight"
  );

  function handleAnswerChange(riskFactorKey: string, value: string | number) {
    setAnswers((prev) => ({ ...prev, [riskFactorKey]: value }));
  }

  function handleSelectState(fips: string) {
    setStateFips(fips);
    setStepIndex(0);
    setStage("questions");
  }

  function handleBack() {
    if (stepIndex === 0) {
      setStage("select-state");
      return;
    }
    setStepIndex((i) => i - 1);
  }

  async function submit() {
    setStage("submitting");
    setErrorMessage(null);
    // The computed BMI never lives in `answers` during the flow (there's
    // nowhere for a live height/weight sub-form to put it that survives
    // Back navigation cleanly) — it's derived once, here, only when the
    // height_weight step was actually part of this tier's question set.
    const finalAnswers: Answers = hasHeightWeightStep
      ? { ...answers, bmi: bmiFromImperial(heightInches, weightLb) }
      : answers;
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: tier, age, sex, stateFips, answers: finalAnswers }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? `Request failed with status ${response.status}`);
      }
      const data: PredictResult = await response.json();
      setResult(data);
      setStage("result");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStage("error");
    }
  }

  function handleNext() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
      return;
    }
    void submit();
  }

  function handleStartOver() {
    setStage("landing");
    setStateFips(null);
    setAge(DEFAULT_AGE);
    setSex(null);
    setAnswers({});
    setHeightWeightUnit("imperial");
    setHeightInches(DEFAULT_HEIGHT_INCHES);
    setWeightLb(DEFAULT_WEIGHT_LB);
    setStepIndex(0);
    setResult(null);
    setErrorMessage(null);
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      {stage === "landing" ? (
        <LandingScreen tier={tier} onTierChange={setTier} onBegin={() => setStage("select-state")} />
      ) : null}

      {stage === "select-state" ? (
        <div className="flex w-full max-w-sm flex-col gap-4">
          <Button
            variant="ghost"
            className="w-fit"
            onClick={() => setStage("landing")}
          >
            Back
          </Button>
          <p className="text-sm text-muted-foreground">Where do you live?</p>
          <StateSelect states={states} value={stateFips} onSelect={handleSelectState} />
        </div>
      ) : null}

      {stage === "questions" ? (
        <QuestionScreen
          step={steps[stepIndex]}
          stepNumber={stepIndex + 1}
          totalSteps={steps.length}
          age={age}
          sex={sex}
          answers={answers}
          allLevels={riskFactorLevels}
          heightWeightUnit={heightWeightUnit}
          heightInches={heightInches}
          weightLb={weightLb}
          onAgeChange={setAge}
          onSexChange={setSex}
          onAnswerChange={handleAnswerChange}
          onHeightWeightUnitChange={setHeightWeightUnit}
          onHeightInchesChange={setHeightInches}
          onWeightLbChange={setWeightLb}
          onBack={handleBack}
          onNext={handleNext}
          isLast={stepIndex === steps.length - 1}
        />
      ) : null}

      {stage === "submitting" ? (
        <p className="text-sm text-muted-foreground">Crunching your numbers...</p>
      ) : null}

      {stage === "result" && result ? (
        <ResultScreen result={result} onStartOver={handleStartOver} />
      ) : null}

      {stage === "error" ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <p className="text-sm text-destructive">{errorMessage}</p>
          <Button onClick={() => void submit()}>Try again</Button>
        </div>
      ) : null}
    </div>
  );
}
