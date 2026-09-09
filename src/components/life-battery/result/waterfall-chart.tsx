"use client";

import { motion, useReducedMotion } from "motion/react";
import { buildWaterfallSteps, type WaterfallStep, type WaterfallStepKind } from "@/lib/waterfall";

interface WaterfallChartProps {
  baselineEx: number;
  adjustedEx: number;
  contributions: { riskFactorKey: string; label: string; yearsImpact: number }[];
}

const CANVAS_HEIGHT_PX = 200;

function barColor(kind: WaterfallStepKind): string {
  switch (kind) {
    case "baseline":
      return "bg-surface-2";
    case "cost":
      return "bg-danger";
    case "benefit":
      return "bg-brand";
    case "final":
      return "bg-brand";
  }
}

function valueLabel(step: WaterfallStep): string {
  if (step.delta === null) return `${step.to.toFixed(1)} yrs`;
  const sign = step.delta > 0 ? "+" : "-";
  return `${sign}${Math.abs(step.delta).toFixed(1)} yrs`;
}

/**
 * Baseline life expectancy on the left, each factor stepping the running
 * total down (or, for the reconciling interaction-effect step, occasionally
 * up), landing on the final adjusted number on the right. See
 * src/lib/waterfall.ts for why that reconciliation step exists.
 */
export function WaterfallChart({ baselineEx, adjustedEx, contributions }: WaterfallChartProps) {
  const prefersReducedMotion = useReducedMotion();
  const steps = buildWaterfallSteps(baselineEx, adjustedEx, contributions);
  const maxValue = Math.max(baselineEx, adjustedEx, ...steps.map((s) => s.to), 1);

  return (
    <div className="flex w-full items-end gap-1.5 overflow-x-auto pb-1 sm:gap-3" style={{ height: CANVAS_HEIGHT_PX + 56 }}>
      {steps.map((step, i) => {
        const barPx = Math.max(2, ((step.to - step.from) / maxValue) * CANVAS_HEIGHT_PX);
        const bottomPx = (step.from / maxValue) * CANVAS_HEIGHT_PX;
        return (
          <div key={step.key} className="flex min-w-14 flex-1 flex-col items-center sm:min-w-20">
            <div className="relative w-full" style={{ height: CANVAS_HEIGHT_PX }}>
              <motion.div
                className={`absolute inset-x-0 rounded-sm ${barColor(step.kind)}`}
                style={{ bottom: bottomPx }}
                initial={prefersReducedMotion ? false : { height: 0 }}
                animate={{ height: barPx }}
                transition={{
                  type: "spring",
                  stiffness: 120,
                  damping: 18,
                  delay: prefersReducedMotion ? 0 : i * 0.08,
                }}
              />
            </div>
            <p className="mt-2 text-center text-xs font-semibold tabular-nums text-foreground">
              {valueLabel(step)}
            </p>
            <p className="mt-0.5 line-clamp-2 text-center text-[11px] leading-tight text-muted-foreground">
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
