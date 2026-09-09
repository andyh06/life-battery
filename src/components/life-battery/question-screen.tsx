"use client";

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
import type { RiskFactorLevelRow, Sex } from "@/lib/data";
import { bmiFromImperial } from "@/lib/bmi";
import { matchNumericLevel } from "@/lib/risk-levels";
import { HeightWeightInput } from "./height-weight-input";
import type { Answers, QuestionStep, UnitSystem } from "./types";

const AGE_MIN = 18;
const AGE_MAX = 100;

/** The shadcn Slider wrapper's Value type isn't narrowed per-usage, so it stays a union even though we only ever pass single-thumb arrays. */
function firstSliderValue(v: number | readonly number[]): number {
  return typeof v === "number" ? v : v[0];
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
  onAgeChange: (age: number) => void;
  onSexChange: (sex: Sex) => void;
  onAnswerChange: (riskFactorKey: string, value: string | number) => void;
  onHeightWeightUnitChange: (unit: UnitSystem) => void;
  onHeightInchesChange: (inches: number) => void;
  onWeightLbChange: (lb: number) => void;
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
  onAgeChange,
  onSexChange,
  onAnswerChange,
  onHeightWeightUnitChange,
  onHeightInchesChange,
  onWeightLbChange,
  onBack,
  onNext,
  isLast,
}: QuestionScreenProps) {
  let question: string;
  let helpText: string | null = null;
  // Sliders and height/weight always have a value (there's no "empty"
  // position), so unlike choice/number questions, Next is enabled from the
  // moment the screen renders — the whole point is a live readout the user
  // can adjust, not something to submit blank.
  let canProceed = true;
  let body: ReactNode;

  if (step.kind === "age") {
    question = "How old are you?";
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-2xl font-semibold">{age} years</p>
        <Slider
          value={[age]}
          min={AGE_MIN}
          max={AGE_MAX}
          step={1}
          onValueChange={(v) => onAgeChange(firstSliderValue(v))}
        />
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
    const levels = allLevels
      .filter((l) => l.riskFactorKey === riskFactor.key)
      .filter((l) => l.appliesToSex === "all" || l.appliesToSex === sex)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const currentAnswer = answers[riskFactor.key];

    if (riskFactor.inputType === "choice") {
      canProceed = currentAnswer !== undefined;
      body = (
        <RadioGroup
          value={typeof currentAnswer === "string" ? currentAnswer : ""}
          onValueChange={(v) => onAnswerChange(riskFactor.key, v as string)}
        >
          {levels.map((level) => (
            <div key={level.levelKey} className="flex items-center gap-3">
              <RadioGroupItem
                value={level.levelKey}
                id={`${riskFactor.key}-${level.levelKey}`}
              />
              <Label htmlFor={`${riskFactor.key}-${level.levelKey}`}>{level.label}</Label>
            </div>
          ))}
        </RadioGroup>
      );
    } else if (riskFactor.inputType === "slider") {
      const min = riskFactor.minInput ?? 0;
      const max = riskFactor.maxInput ?? 100;
      const step = riskFactor.step ?? 1;
      const value = typeof currentAnswer === "number" ? currentAnswer : (min + max) / 2;
      const matched = matchNumericLevel(levels, value);
      body = (
        <div className="flex flex-col gap-3">
          <p className="text-2xl font-semibold">
            {value} {riskFactor.unit}
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardDescription>
          Question {stepNumber} of {totalSteps}
        </CardDescription>
        <CardTitle className="text-xl">{question}</CardTitle>
        {helpText ? <CardDescription>{helpText}</CardDescription> : null}
      </CardHeader>
      <CardContent>{body}</CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          {isLast ? "See my result" : "Next"}
        </Button>
      </CardFooter>
    </Card>
  );
}
