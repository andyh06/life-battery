"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { RiskFactorLevelRow } from "@/lib/data";
import { computeExerciseMinutesPerWeek, type ExerciseIntensity } from "@/lib/exercise";
import { matchNumericLevel } from "@/lib/risk-levels";

const INTENSITY_OPTIONS: { value: ExerciseIntensity; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "vigorous", label: "Vigorous" },
];

interface ExerciseInputProps {
  daysPerWeek: number;
  minutesPerSession: number;
  intensity: ExerciseIntensity;
  levels: RiskFactorLevelRow[];
  onDaysPerWeekChange: (days: number) => void;
  onMinutesPerSessionChange: (minutes: number) => void;
  onIntensityChange: (intensity: ExerciseIntensity) => void;
}

/**
 * Two questions ("how many days" / "how long each time") plus an intensity
 * selector, rather than one abstract "how much do you move" slider — the
 * computed total (src/lib/exercise.ts) is what actually gets stored and
 * modeled, unchanged from the old slider's minutes/week.
 */
export function ExerciseInput({
  daysPerWeek,
  minutesPerSession,
  intensity,
  levels,
  onDaysPerWeekChange,
  onMinutesPerSessionChange,
  onIntensityChange,
}: ExerciseInputProps) {
  const totalMinutes = computeExerciseMinutesPerWeek(daysPerWeek, minutesPerSession, intensity);
  const matched = matchNumericLevel(levels, totalMinutes);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="exercise-days">
            Days a week you do something that gets you breathing harder
          </Label>
          <Input
            id="exercise-days"
            type="number"
            min={0}
            max={7}
            value={daysPerWeek}
            onChange={(e) =>
              onDaysPerWeekChange(Math.min(7, Math.max(0, Number(e.target.value || 0))))
            }
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="exercise-minutes">Roughly how long each time (min)</Label>
          <Input
            id="exercise-minutes"
            type="number"
            min={0}
            value={minutesPerSession}
            onChange={(e) => onMinutesPerSessionChange(Math.max(0, Number(e.target.value || 0)))}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Intensity</Label>
        <RadioGroup
          value={intensity}
          onValueChange={(v) => onIntensityChange(v as ExerciseIntensity)}
          className="flex flex-row gap-5"
        >
          {INTENSITY_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
              <RadioGroupItem value={opt.value} id={`exercise-intensity-${opt.value}`} />
              <Label htmlFor={`exercise-intensity-${opt.value}`}>{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      <p className="text-sm text-muted-foreground">
        About <span className="font-medium text-foreground">{Math.round(totalMinutes)}</span>{" "}
        min/week{matched ? ` - ${matched.label}` : null}
      </p>
    </div>
  );
}
