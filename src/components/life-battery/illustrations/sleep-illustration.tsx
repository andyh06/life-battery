"use client";

import { motion } from "motion/react";

const MAX_HOURS = 14;
const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

/** A moon-to-sun arc; a marker sweeps along it as hours change, filling behind it. */
export function SleepIllustration({ hours }: { hours: number }) {
  const fraction = Math.min(1, Math.max(0, hours / MAX_HOURS));
  const angle = fraction * Math.PI;
  const markerX = 24 - 20 * Math.cos(angle);
  const markerY = 32 - 20 * Math.sin(angle);

  return (
    <svg viewBox="0 0 48 40" className="h-24 w-24" fill="none">
      <path
        d="M4 32 A20 20 0 0 1 44 32"
        stroke="var(--surface-2)"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <motion.path
        d="M4 32 A20 20 0 0 1 44 32"
        stroke="var(--brand)"
        strokeWidth={3}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        initial={false}
        animate={{ strokeDashoffset: 1 - fraction }}
        transition={spring}
      />
      <circle cx={4} cy={32} r={4} fill="var(--paper)" />
      <circle cx={44} cy={32} r={4} fill="var(--brand)" />
      <motion.circle
        r={3.5}
        fill="var(--paper)"
        initial={false}
        animate={{ cx: markerX, cy: markerY }}
        transition={spring}
      />
    </svg>
  );
}
