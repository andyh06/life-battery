"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";

interface BatteryGaugeProps {
  batteryPercent: number;
  adjustedEx: number;
  expectedAgeAtDeath: number;
}

export function BatteryGauge({ batteryPercent, adjustedEx, expectedAgeAtDeath }: BatteryGaugeProps) {
  const prefersReducedMotion = useReducedMotion();
  const [animatedPercent, setAnimatedPercent] = useState(0);
  // Reduced motion: skip the tween and render the real value directly,
  // rather than syncing it into state from an effect.
  const displayedPercent = prefersReducedMotion ? batteryPercent : animatedPercent;

  useEffect(() => {
    if (prefersReducedMotion) return;
    const controls = animate(0, batteryPercent, {
      duration: 1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setAnimatedPercent,
    });
    return () => controls.stop();
  }, [batteryPercent, prefersReducedMotion]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-normal text-muted-foreground">Life Battery</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Progress value={displayedPercent}>
          <ProgressLabel className="text-7xl font-semibold tracking-tight text-brand">
            {Math.round(displayedPercent)}%
          </ProgressLabel>
        </Progress>
        <p className="text-sm text-muted-foreground">
          About {adjustedEx.toFixed(1)} years of remaining life expectancy — an expected age at
          death of roughly {expectedAgeAtDeath.toFixed(0)}.
        </p>
      </CardContent>
    </Card>
  );
}
