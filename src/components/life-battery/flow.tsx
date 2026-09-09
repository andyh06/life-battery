"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { RiskFactorLevelRow, RiskFactorRow, Sex, StateRow } from "@/lib/data";
import { bmiFromImperial } from "@/lib/bmi";
import { computeExerciseMinutesPerWeek, type ExerciseIntensity } from "@/lib/exercise";
import { LandingScreen } from "./landing-screen";
import { ModeSelectScreen } from "./mode-select-screen";
import { Progress } from "@/components/ui/progress";
import { QuestionScreen } from "./question-screen";
import { ResultScreen, type ResultData } from "./result/result-screen";
import { StatePicker } from "./state-picker";
import { buildQuestionSteps } from "./steps";
import type { Answers, QuestionStep, Stage, Tier, UnitSystem } from "./types";

const DEFAULT_AGE = 30;
const DEFAULT_HEIGHT_INCHES = 67; // 5'7", roughly the population average
const DEFAULT_WEIGHT_LB = 160;
const DEFAULT_EXERCISE_DAYS_PER_WEEK = 3;
const DEFAULT_EXERCISE_MINUTES_PER_SESSION = 30;

const questionVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 48 : -48,
    opacity: 0,
    scale: 0.98,
    filter: "blur(4px)",
  }),
  center: { x: 0, opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: (direction: number) => ({
    x: direction > 0 ? -48 : 48,
    opacity: 0,
    scale: 0.98,
    filter: "blur(4px)",
  }),
};

interface LifeBatteryFlowProps {
  states: StateRow[];
  riskFactors: RiskFactorRow[];
  riskFactorLevels: RiskFactorLevelRow[];
}

export function LifeBatteryFlow({ states, riskFactors, riskFactorLevels }: LifeBatteryFlowProps) {
  const prefersReducedMotion = useReducedMotion();
  const [stage, setStage] = useState<Stage>("landing");
  const [tier, setTier] = useState<Tier>("quick");
  const [stateFips, setStateFips] = useState<string | null>(null);
  const [age, setAge] = useState(DEFAULT_AGE);
  const [sex, setSex] = useState<Sex | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [heightWeightUnit, setHeightWeightUnit] = useState<UnitSystem>("imperial");
  const [heightInches, setHeightInches] = useState(DEFAULT_HEIGHT_INCHES);
  const [weightLb, setWeightLb] = useState(DEFAULT_WEIGHT_LB);
  const [exerciseDaysPerWeek, setExerciseDaysPerWeek] = useState(DEFAULT_EXERCISE_DAYS_PER_WEEK);
  const [exerciseMinutesPerSession, setExerciseMinutesPerSession] = useState(
    DEFAULT_EXERCISE_MINUTES_PER_SESSION
  );
  const [exerciseIntensity, setExerciseIntensity] = useState<ExerciseIntensity>("moderate");
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [result, setResult] = useState<ResultData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rebuilds only when the tier toggle changes — see steps.ts for the logic
  // itself (a plain function so it's unit-tested without mounting this).
  const steps: QuestionStep[] = useMemo(
    () => buildQuestionSteps(riskFactors, tier),
    [riskFactors, tier]
  );

  const hasHeightWeightStep = steps.some(
    (s) => s.kind === "risk-factor" && s.riskFactor.inputType === "height_weight"
  );
  const hasExerciseStep = steps.some(
    (s) => s.kind === "risk-factor" && s.riskFactor.key === "activity"
  );

  // 2 fixed steps (age, sex) + however many risk_factors rows carry that
  // tier. Advanced is cumulative (see steps.ts), so its count is every row,
  // not just the advanced-tier ones.
  const quickCount = 2 + riskFactors.filter((rf) => rf.tier === "quick").length;
  const advancedCount = 2 + riskFactors.length;

  const stateName = states.find((s) => s.fips === stateFips)?.name ?? "your state";

  function handleAnswerChange(riskFactorKey: string, value: string | number) {
    setAnswers((prev) => ({ ...prev, [riskFactorKey]: value }));
  }

  function handleSelectState(fips: string) {
    // No extra fade here on purpose — the map's own zoom-to-bounds animation
    // (see UsMap) is the entire transition into the questionnaire. Layering
    // a cross-fade on top would fight it rather than continue it.
    setStateFips(fips);
    setStepIndex(0);
    setDirection(1);
    setStage("questions");
  }

  function handleBack() {
    setDirection(-1);
    if (stepIndex === 0) {
      setStage("select-state");
      return;
    }
    setStepIndex((i) => i - 1);
  }

  async function submit() {
    setStage("submitting");
    setErrorMessage(null);
    // Sliders always show a value and never block Next (there's no "empty"
    // position), so a factor the user never actually dragged would
    // otherwise be silently missing from `answers` — indistinguishable
    // from an intentional skip. Backfill any untouched slider with the
    // same midpoint value it was displaying. The computed BMI has the same
    // problem plus nowhere to live in `answers` during the flow (no spot
    // for a live height/weight sub-form that survives Back navigation
    // cleanly), so it's derived fresh here too.
    const finalAnswers: Answers = { ...answers };
    for (const step of steps) {
      if (step.kind !== "risk-factor") continue;
      const rf = step.riskFactor;
      if (rf.inputType === "slider" && finalAnswers[rf.key] === undefined) {
        finalAnswers[rf.key] = ((rf.minInput ?? 0) + (rf.maxInput ?? 100)) / 2;
      }
    }
    if (hasHeightWeightStep) {
      finalAnswers.bmi = bmiFromImperial(heightInches, weightLb);
    }
    if (hasExerciseStep) {
      finalAnswers.activity = computeExerciseMinutesPerWeek(
        exerciseDaysPerWeek,
        exerciseMinutesPerSession,
        exerciseIntensity
      );
    }
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
      const data: ResultData = await response.json();
      setResult(data);
      setStage("result");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStage("error");
    }
  }

  function handleNext() {
    setDirection(1);
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
    setExerciseDaysPerWeek(DEFAULT_EXERCISE_DAYS_PER_WEEK);
    setExerciseMinutesPerSession(DEFAULT_EXERCISE_MINUTES_PER_SESSION);
    setExerciseIntensity("moderate");
    setStepIndex(0);
    setResult(null);
    setErrorMessage(null);
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {stage === "questions" ? (
        <div className="w-full px-4 pt-4">
          <Progress
            value={((stepIndex + 1) / steps.length) * 100}
            trackClassName="h-1.5 rounded-none bg-surface-2"
            indicatorClassName="rounded-none bg-brand transition-[width] duration-300 ease-out"
          />
        </div>
      ) : null}

      <div className="flex flex-1 items-center justify-center p-4">
        {/* Landing fades its text out as mode-select comes up; mode-select
            then fades/zooms into the map; each stage owns its own exit so
            the sequence reads as one continuous motion rather than
            screens finishing before the next starts. */}
        <AnimatePresence mode="popLayout" initial={false}>
          {stage === "landing" ? (
            <motion.div
              key="landing"
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
              className="w-full"
            >
              <LandingScreen onBegin={() => setStage("mode-select")} />
            </motion.div>
          ) : null}

          {stage === "mode-select" ? (
            <motion.div
              key="mode-select"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex w-full justify-center"
            >
              <ModeSelectScreen
                quickCount={quickCount}
                advancedCount={advancedCount}
                onSelect={(selectedTier) => {
                  setTier(selectedTier);
                  setStage("select-state");
                }}
              />
            </motion.div>
          ) : null}

          {stage === "select-state" ? (
            <motion.div
              key="select-state"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex w-full flex-col items-center gap-4"
            >
              <div className="flex w-full max-w-3xl items-center justify-between">
                <Button variant="ghost" onClick={() => setStage("mode-select")}>
                  Back
                </Button>
                <p className="text-sm text-muted-foreground">Select your state</p>
                <div className="w-16" />
              </div>
              <StatePicker states={states} value={stateFips} onSelect={handleSelectState} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {stage === "questions" ? (
          <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            <motion.div
              key={stepIndex}
              custom={direction}
              variants={questionVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: "easeOut" }}
              className="w-full max-w-3xl"
            >
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
                exerciseDaysPerWeek={exerciseDaysPerWeek}
                exerciseMinutesPerSession={exerciseMinutesPerSession}
                exerciseIntensity={exerciseIntensity}
                onAgeChange={setAge}
                onSexChange={setSex}
                onAnswerChange={handleAnswerChange}
                onHeightWeightUnitChange={setHeightWeightUnit}
                onHeightInchesChange={setHeightInches}
                onWeightLbChange={setWeightLb}
                onExerciseDaysPerWeekChange={setExerciseDaysPerWeek}
                onExerciseMinutesPerSessionChange={setExerciseMinutesPerSession}
                onExerciseIntensityChange={setExerciseIntensity}
                onBack={handleBack}
                onNext={handleNext}
                isLast={stepIndex === steps.length - 1}
              />
            </motion.div>
          </AnimatePresence>
        ) : null}

        {stage === "submitting" ? (
          <p className="text-sm text-muted-foreground">Crunching your numbers...</p>
        ) : null}

        {stage === "result" && result ? (
          <ResultScreen result={result} stateName={stateName} onStartOver={handleStartOver} />
        ) : null}

        {stage === "error" ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button onClick={() => void submit()}>Try again</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
