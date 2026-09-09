"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { RiskFactorLevelRow, Sex } from "@/lib/data";
import { bmiFromImperial } from "@/lib/bmi";
import { computeExerciseMinutesPerWeek, type ExerciseIntensity } from "@/lib/exercise";
import { matchNumericLevel, severityFromSortOrder, SKIP_ANSWER } from "@/lib/risk-levels";
import { ExerciseInput } from "./exercise-input";
import { HeightWeightInput } from "./height-weight-input";
import { AgeIllustration } from "./illustrations/age-illustration";
import { ActivityIllustration } from "./illustrations/activity-illustration";
import { AlcoholIllustration } from "./illustrations/alcohol-illustration";
import { BmiGauge } from "./illustrations/bmi-gauge";
import { DrivingIllustration } from "./illustrations/driving-illustration";
import { SedentaryIllustration } from "./illustrations/sedentary-illustration";
import { SleepIllustration } from "./illustrations/sleep-illustration";
import { SmokingIllustration } from "./illustrations/smoking-illustration";
import { SocialIllustration } from "./illustrations/social-illustration";
import type { Answers, QuestionStep, UnitSystem } from "./types";

const AGE_MIN = 18;
const AGE_MAX = 100;

/** The shadcn Slider wrapper's Value type isn't narrowed per-usage, so it stays a union even though we only ever pass single-thumb arrays. */
function firstSliderValue(v: number | readonly number[]): number {
  return typeof v === "number" ? v : v[0];
}

/** "1 hours" reads wrong. Units are plural by convention in the DB (e.g. "hours"); singularize at exactly 1. */
function pluralizeUnit(value: number, unit: string): string {
  return Math.abs(value) === 1 && unit.endsWith("s") ? unit.slice(0, -1) : unit;
}

/** Small info icon that reveals `text` on hover AND keyboard focus (Base UI's Tooltip trigger handles both natively). */
function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="More information"
          >
            <Info className="size-3.5" />
          </button>
        }
      />
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

interface QuestionScreenProps {
  step: QuestionStep;
  stepNumber: number;
  totalSteps: number;
  age: number;
  sex: Sex | null;
  answers: Answers;
  allLevels: RiskFactorLevelRow[];
  heightWeightUnit: UnitSystem;
  heightInches: number;
  weightLb: number;
  exerciseDaysPerWeek: number;
  exerciseMinutesPerSession: number;
  exerciseIntensity: ExerciseIntensity;
  onAgeChange: (age: number) => void;
  onSexChange: (sex: Sex) => void;
  onAnswerChange: (riskFactorKey: string, value: string | number) => void;
  onHeightWeightUnitChange: (unit: UnitSystem) => void;
  onHeightInchesChange: (inches: number) => void;
  onWeightLbChange: (lb: number) => void;
  onExerciseDaysPerWeekChange: (days: number) => void;
  onExerciseMinutesPerSessionChange: (minutes: number) => void;
  onExerciseIntensityChange: (intensity: ExerciseIntensity) => void;
  onBack: () => void;
  onNext: () => void;
  isLast: boolean;
}

export function QuestionScreen({
  step,
  stepNumber,
  totalSteps,
  age,
  sex,
  answers,
  allLevels,
  heightWeightUnit,
  heightInches,
  weightLb,
  exerciseDaysPerWeek,
  exerciseMinutesPerSession,
  exerciseIntensity,
  onAgeChange,
  onSexChange,
  onAnswerChange,
  onHeightWeightUnitChange,
  onHeightInchesChange,
  onWeightLbChange,
  onExerciseDaysPerWeekChange,
  onExerciseMinutesPerSessionChange,
  onExerciseIntensityChange,
  onBack,
  onNext,
  isLast,
}: QuestionScreenProps) {
  let question: string;
  let helpText: string | null = null;
  let sensitiveNote: string | null = null;
  // Sliders and height/weight always have a value (there's no "empty"
  // position), so unlike choice/number questions, Next is enabled from the
  // moment the screen renders — the whole point is a live readout the user
  // can adjust, not something to submit blank.
  let canProceed = true;
  let body: ReactNode;
  let illustration: ReactNode = null;

  if (step.kind === "age") {
    illustration = <AgeIllustration age={age} />;
    question = "How old are you?";
    // Don't clamp on every keystroke — that fights the browser's own
    // editing of the field (typing "45" one digit at a time briefly holds
    // "4", clamping it to 18 mid-edit, then appending "5" onto "18"
    // instead of "4"). Let the field hold whatever the user is typing and
    // only gate proceeding on it being in range.
    canProceed = age >= AGE_MIN && age <= AGE_MAX;
    body = (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Slider
            className="flex-1"
            value={[Math.min(AGE_MAX, Math.max(AGE_MIN, age))]}
            min={AGE_MIN}
            max={AGE_MAX}
            step={1}
            onValueChange={(v) => onAgeChange(firstSliderValue(v))}
          />
          <Input
            type="number"
            min={AGE_MIN}
            max={AGE_MAX}
            value={age}
            onChange={(e) => {
              const raw = e.target.value;
              const parsed = Number(raw);
              if (raw !== "" && Number.isFinite(parsed)) {
                onAgeChange(parsed);
              }
            }}
            className="w-20 text-center"
          />
        </div>
        {!canProceed ? (
          <p className="text-xs text-destructive">Age must be between 18 and 100.</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          The risk estimates in this model come from adult cohort studies and do not apply to
          anyone under 18.
        </p>
      </div>
    );
  } else if (step.kind === "sex") {
    question = "What sex were you assigned at birth?";
    helpText =
      "Used to pick the matching state life table — this app's mortality tables are published separately for males and females.";
    canProceed = sex !== null;
    body = (
      <RadioGroup value={sex ?? ""} onValueChange={(v) => onSexChange(v as Sex)}>
        <div className="flex items-center gap-3">
          <RadioGroupItem value="male" id="sex-male" />
          <Label htmlFor="sex-male">Male</Label>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroupItem value="female" id="sex-female" />
          <Label htmlFor="sex-female">Female</Label>
        </div>
      </RadioGroup>
    );
  } else {
    const { riskFactor } = step;
    question = riskFactor.question;
    helpText = riskFactor.helpText;
    sensitiveNote = riskFactor.sensitiveNote;
    const levels = allLevels
      .filter((l) => l.riskFactorKey === riskFactor.key)
      .filter((l) => l.appliesToSex === "all" || l.appliesToSex === sex)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const currentAnswer = answers[riskFactor.key];

    if (riskFactor.inputType === "choice") {
      canProceed = currentAnswer !== undefined;
      const severity = severityFromSortOrder(allLevels, riskFactor.key, sex, currentAnswer);
      if (riskFactor.key === "smoking") illustration = <SmokingIllustration severity={severity} />;
      else if (riskFactor.key === "alcohol") illustration = <AlcoholIllustration severity={severity} />;
      else if (riskFactor.key === "social") illustration = <SocialIllustration severity={severity} />;
      else if (riskFactor.key === "driving") illustration = <DrivingIllustration severity={severity} />;
      body = (
        <RadioGroup
          value={typeof currentAnswer === "string" ? currentAnswer : ""}
          onValueChange={(v) => onAnswerChange(riskFactor.key, v as string)}
        >
          {levels.map((level) => (
            <div key={level.levelKey} className="flex items-center gap-2">
              <RadioGroupItem
                value={level.levelKey}
                id={`${riskFactor.key}-${level.levelKey}`}
              />
              <Label htmlFor={`${riskFactor.key}-${level.levelKey}`}>{level.label}</Label>
              {level.description ? <InfoTooltip text={level.description} /> : null}
            </div>
          ))}
          {/* Always last — never let "Prefer not to say" outrank a real option. */}
          {riskFactor.optional ? (
            <div className="flex items-center gap-2 border-t pt-2">
              <RadioGroupItem value={SKIP_ANSWER} id={`${riskFactor.key}-skip`} />
              <Label htmlFor={`${riskFactor.key}-skip`} className="text-muted-foreground">
                Prefer not to say
              </Label>
            </div>
          ) : null}
        </RadioGroup>
      );
    } else if (riskFactor.inputType === "slider" && riskFactor.key === "activity") {
      // Asked as days/week x minutes/session x intensity rather than one
      // abstract slider — see src/lib/exercise.ts. The computed total is
      // what actually gets stored (in finalAnswers, at submit time — see
      // flow.tsx), so this branch never calls onAnswerChange itself.
      const totalMinutes = computeExerciseMinutesPerWeek(
        exerciseDaysPerWeek,
        exerciseMinutesPerSession,
        exerciseIntensity
      );
      illustration = <ActivityIllustration minutesPerWeek={totalMinutes} />;
      body = (
        <ExerciseInput
          daysPerWeek={exerciseDaysPerWeek}
          minutesPerSession={exerciseMinutesPerSession}
          intensity={exerciseIntensity}
          levels={levels}
          onDaysPerWeekChange={onExerciseDaysPerWeekChange}
          onMinutesPerSessionChange={onExerciseMinutesPerSessionChange}
          onIntensityChange={onExerciseIntensityChange}
        />
      );
    } else if (riskFactor.inputType === "slider") {
      const min = riskFactor.minInput ?? 0;
      const max = riskFactor.maxInput ?? 100;
      const step = riskFactor.step ?? 1;
      const value = typeof currentAnswer === "number" ? currentAnswer : (min + max) / 2;
      const matched = matchNumericLevel(levels, value);
      if (riskFactor.key === "sleep") illustration = <SleepIllustration hours={value} />;
      else if (riskFactor.key === "sedentary") illustration = <SedentaryIllustration hours={value} />;
      body = (
        <div className="flex flex-col gap-3">
          <p className="text-2xl font-semibold">
            {value} {riskFactor.unit ? pluralizeUnit(value, riskFactor.unit) : null}
          </p>
          <Slider
            value={[value]}
            min={min}
            max={max}
            step={step}
            onValueChange={(v) => onAnswerChange(riskFactor.key, firstSliderValue(v))}
          />
          {matched ? <p className="text-sm text-muted-foreground">{matched.label}</p> : null}
        </div>
      );
    } else if (riskFactor.inputType === "height_weight") {
      const bmi = bmiFromImperial(heightInches, weightLb);
      const matched = matchNumericLevel(levels, bmi);
      canProceed = bmi > 0;
      illustration = <BmiGauge bmi={bmi} />;
      body = (
        <div className="flex flex-col gap-3">
          <HeightWeightInput
            unit={heightWeightUnit}
            heightInches={heightInches}
            weightLb={weightLb}
            onUnitChange={onHeightWeightUnitChange}
            onHeightInchesChange={onHeightInchesChange}
            onWeightLbChange={onWeightLbChange}
          />
          <p className="text-sm text-muted-foreground">
            BMI: <span className="font-medium text-foreground">{bmi.toFixed(1)}</span>
            {matched ? ` — ${matched.label}` : null}
          </p>
        </div>
      );
    } else {
      // input_type = 'number': a plain numeric field. No current risk_factors
      // row uses this after the Stage 1.5 migration, but the schema still
      // allows it, so it's kept working rather than removed.
      canProceed = typeof currentAnswer === "number" && Number.isFinite(currentAnswer);
      const bounds = levels.reduce(
        (acc, l) => ({
          min: l.minValue !== null ? Math.min(acc.min, l.minValue) : acc.min,
          max: l.maxValue !== null ? Math.max(acc.max, l.maxValue) : acc.max,
        }),
        { min: Infinity, max: -Infinity }
      );
      body = (
        <Input
          type="number"
          value={typeof currentAnswer === "number" ? currentAnswer : ""}
          onChange={(e) => {
            const raw = e.target.value;
            onAnswerChange(riskFactor.key, raw === "" ? Number.NaN : Number(raw));
          }}
          placeholder={
            Number.isFinite(bounds.min) && Number.isFinite(bounds.max)
              ? `Typically ${bounds.min}-${bounds.max}`
              : undefined
          }
        />
      );
    }
  }

  return (
    <Card className="w-full max-w-3xl border-none bg-surface">
      <CardContent className="flex flex-col gap-8 sm:flex-row sm:items-center">
        {illustration ? (
          <div className="flex shrink-0 items-center justify-center self-center rounded-md bg-surface-2 p-4 sm:self-start">
            {illustration}
          </div>
        ) : null}
        <div className="flex flex-1 flex-col gap-4">
          <CardHeader className="p-0">
            <CardDescription>
              Question {stepNumber} of {totalSteps}
            </CardDescription>
            {sensitiveNote ? (
              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                {sensitiveNote}
              </p>
            ) : null}
            <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
              {question}
            </CardTitle>
            {helpText ? <CardDescription>{helpText}</CardDescription> : null}
          </CardHeader>
          <div>{body}</div>
          <CardFooter className="flex justify-between p-0 pt-2">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button onClick={onNext} disabled={!canProceed}>
              {isLast ? "See my result" : "Next"}
            </Button>
          </CardFooter>
        </div>
      </CardContent>
    </Card>
  );
}
