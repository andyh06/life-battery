"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import type { SurvivalMilestone, UncertaintyBand } from "@/lib/predict";
import { AnimatedNumber } from "../animated-number";

interface BatteryGaugeProps {
  batteryPercent: number;
  adjustedEx: number;
  expectedAgeAtDeath: number;
  uncertaintyBand: UncertaintyBand;
  survivalMilestones: SurvivalMilestone[];
}

/** Slight overshoot on the way in (spring, not an eased tween) so the fill feels charged rather than merely filled. */
const OVERSHOOT_TRANSITION = { type: "spring" as const, stiffness: 90, damping: 14 };

export function BatteryGauge({
  batteryPercent,
  adjustedEx,
  expectedAgeAtDeath,
  uncertaintyBand,
  survivalMilestones,
}: BatteryGaugeProps) {
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
        <div className="relative">
          <Progress
            value={Math.min(100, Math.max(0, displayedPercent))}
            trackClassName="h-8 rounded-none hazard-stripes"
            indicatorClassName="rounded-none bg-brand transition-none"
          >
            <ProgressLabel className="text-[clamp(4rem,14vw,8rem)] leading-none font-extrabold tracking-tight text-brand">
              {Math.round(displayedPercent)}%
            </ProgressLabel>
          </Progress>
          {/* The fill edge is a single point estimate standing in for a whole
              range of plausible outcomes — this band (the interquartile
              range of the age-at-death distribution) replaces the hard edge
              with a visible width, in the red/yellow stripe reserved for
              "this is a range," not a status. */}
          <div
            aria-hidden="true"
            className="hazard-stripes-band pointer-events-none absolute inset-y-0 h-8"
            style={{
              left: `${uncertaintyBand.lowerBatteryPercent}%`,
              width: `${Math.max(0, uncertaintyBand.upperBatteryPercent - uncertaintyBand.lowerBatteryPercent)}%`,
            }}
          />
        </div>
        <p className="text-lg text-muted-foreground">
          About <AnimatedNumber value={adjustedEx} decimals={1} className="font-semibold text-foreground" /> years
          of remaining life expectancy - an expected age at death of roughly{" "}
          <AnimatedNumber value={expectedAgeAtDeath} decimals={0} className="font-semibold text-foreground" />.
        </p>
        {survivalMilestones.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {survivalMilestones.map((m, i) => (
              <span key={m.age}>
                {i > 0 ? <span className="px-2 text-border">·</span> : null}
                <AnimatedNumber value={m.probabilityPercent} decimals={0} suffix="%" className="font-semibold text-foreground" />{" "}
                chance of reaching {m.age}
              </span>
            ))}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
