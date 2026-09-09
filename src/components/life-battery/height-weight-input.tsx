"use client";

import { cmToInches, inchesToCm, kgToLb, lbToKg } from "@/lib/bmi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { UnitSystem } from "./types";

interface HeightWeightInputProps {
  unit: UnitSystem;
  heightInches: number;
  weightLb: number;
  onUnitChange: (unit: UnitSystem) => void;
  onHeightInchesChange: (inches: number) => void;
  onWeightLbChange: (lb: number) => void;
}

/**
 * Canonical storage is always imperial inches/pounds (see src/lib/bmi.ts) —
 * this component only converts for display and converts back immediately
 * on every keystroke, so toggling units mid-entry never loses precision.
 */
export function HeightWeightInput({
  unit,
  heightInches,
  weightLb,
  onUnitChange,
  onHeightInchesChange,
  onWeightLbChange,
}: HeightWeightInputProps) {
  const feet = Math.floor(heightInches / 12);
  const inches = Math.round(heightInches - feet * 12);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="unit-toggle" className="text-xs text-muted-foreground">
          {unit === "metric" ? "Metric" : "Imperial"}
        </Label>
        <Switch
          id="unit-toggle"
          checked={unit === "metric"}
          onCheckedChange={(checked) => onUnitChange(checked ? "metric" : "imperial")}
        />
      </div>

      {unit === "imperial" ? (
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="height-feet">Height (ft)</Label>
            <Input
              id="height-feet"
              type="number"
              min={0}
              value={feet}
              onChange={(e) => onHeightInchesChange(Number(e.target.value || 0) * 12 + inches)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="height-inches">Height (in)</Label>
            <Input
              id="height-inches"
              type="number"
              min={0}
              max={11}
              value={inches}
              onChange={(e) => onHeightInchesChange(feet * 12 + Number(e.target.value || 0))}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="weight-lb">Weight (lb)</Label>
            <Input
              id="weight-lb"
              type="number"
              min={0}
              value={Math.round(weightLb)}
              onChange={(e) => onWeightLbChange(Number(e.target.value || 0))}
            />
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="height-cm">Height (cm)</Label>
            <Input
              id="height-cm"
              type="number"
              min={0}
              value={Math.round(inchesToCm(heightInches))}
              onChange={(e) => onHeightInchesChange(cmToInches(Number(e.target.value || 0)))}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="weight-kg">Weight (kg)</Label>
            <Input
              id="weight-kg"
              type="number"
              min={0}
              value={Math.round(lbToKg(weightLb))}
              onChange={(e) => onWeightLbChange(kgToLb(Number(e.target.value || 0)))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
