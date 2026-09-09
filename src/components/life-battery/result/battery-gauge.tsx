"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { AnimatedNumber } from "../animated-number";

interface BatteryGaugeProps {
  batteryPercent: number;
  adjustedEx: number;
  expectedAgeAtDeath: number;
}

/** Slight overshoot on the way in (spring, not an eased tween) so the fill feels charged rather than merely filled. */
const OVERSHOOT_TRANSITION = { type: "spring" as const, stiffness: 90, damping: 14 };

export function BatteryGauge({ batteryPercent, adjustedEx, expectedAgeAtDeath }: BatteryGaugeProps) {
  const prefersReducedMotion = useReducedMotion();
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const displayedPercent = prefersReducedMotion ? batteryPercent : animatedPercent;

  useEffect(() => {
    if (prefersReducedMotion) return;
    const controls = animate(0, batteryPercent, {
      ...OVERSHOOT_TRANSITION,
      onUpdate: setAnimatedPercent,
    });
    return () => controls.stop();
  }, [batteryPercent, prefersReducedMotion]);

  return (
    <Card className="w-full border-none bg-transparent shadow-none">
      <CardHeader className="px-0">
        <CardTitle className="text-lg font-normal tracking-wide text-muted-foreground uppercase">
          Life Battery
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-0">
        {/* The battery never turns red at low values — yellow is the fill at every level, so the number is never read as a status. */}
        <Progress
          value={Math.min(100, Math.max(0, displayedPercent))}
          trackClassName="h-8 rounded-none hazard-stripes"
          indicatorClassName="rounded-none bg-brand transition-none"
        >
          <ProgressLabel className="text-[clamp(4rem,14vw,8rem)] leading-none font-extrabold tracking-tight text-brand">
            {Math.round(displayedPercent)}%
          </ProgressLabel>
        </Progress>
        <p className="text-lg text-muted-foreground">
          About <AnimatedNumber value={adjustedEx} decimals={1} className="font-semibold text-foreground" /> years
          of remaining life expectancy - an expected age at death of roughly{" "}
          <AnimatedNumber value={expectedAgeAtDeath} decimals={0} className="font-semibold text-foreground" />.
        </p>
      </CardContent>
    </Card>
  );
}
