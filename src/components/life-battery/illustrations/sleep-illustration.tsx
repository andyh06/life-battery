"use client";

import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";

const spring = { type: "spring" as const, stiffness: 100, damping: 18 };
const MAX_HOURS = 14;

/**
 * Moon and Sun sit at opposite ends of a rotating bar, pivoting around a
 * fixed horizon line — as hours change, the bar rotates and the proportion
 * of "dark" (moon side) to "light" (sun side) above the horizon shifts.
 */
export function SleepIllustration({ hours }: { hours: number }) {
  const fraction = Math.min(1, Math.max(0, hours / MAX_HOURS));
  // Moon sits at the left end, Sun at the right — rotating clockwise (positive
  // CSS deg) swings the right end (Sun) up and the left end (Moon) down, so
  // this must go from +90 (moon dominant, short sleep) to -90 (sun dominant,
  // oversleeping into daylight), not the other way.
  const angle = 90 - fraction * 180;

  return (
    <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden">
      <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-surface-2" />
      <motion.div
        className="absolute flex w-20 items-center justify-between"
        initial={false}
        animate={{ rotate: angle }}
        transition={spring}
      >
        <Moon className="size-7 text-paper" strokeWidth={2} />
        <Sun className="size-7 text-brand" strokeWidth={2} />
      </motion.div>
    </div>
  );
}
