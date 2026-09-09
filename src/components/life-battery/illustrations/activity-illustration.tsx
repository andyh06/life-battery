"use client";

import { motion } from "motion/react";

const MAX_MIN_PER_WEEK = 500;

/** Crossfades between three fixed poses (slumped, walking, running) rather than one continuous morph — a stride can't be interpolated from a slump the way a spine bend can. */
export function ActivityIllustration({ minutesPerWeek }: { minutesPerWeek: number }) {
  const fraction = Math.min(1, Math.max(0, minutesPerWeek / MAX_MIN_PER_WEEK));
  // Three overlapping triangular weights so the transition still feels
  // continuous as the slider moves, even though the poses are discrete.
  const chairWeight = Math.max(0, 1 - fraction * 3);
  const walkWeight = Math.max(0, 1 - Math.abs(fraction - 0.5) * 3);
  const runWeight = Math.max(0, fraction * 3 - 2);

  return (
    <svg viewBox="0 0 48 48" className="h-24 w-24" fill="none">
      <motion.g animate={{ opacity: chairWeight }} transition={{ duration: 0.2 }}>
        <path d="M12 44V24h4v20M28 44V24h4v20M12 24h20" stroke="var(--surface-2)" strokeWidth={3} strokeLinecap="round" />
        <circle cx={26} cy={12} r={5} fill="var(--paper)" />
        <path d="M22 30 Q24 20 26 17" stroke="var(--paper)" strokeWidth={3} strokeLinecap="round" />
      </motion.g>

      <motion.g animate={{ opacity: walkWeight }} transition={{ duration: 0.2 }}>
        <circle cx={22} cy={9} r={5} fill="var(--paper)" />
        <path d="M22 14v14" stroke="var(--paper)" strokeWidth={3} strokeLinecap="round" />
        <path d="M22 28 12 40M22 28 32 36" stroke="var(--paper)" strokeWidth={3} strokeLinecap="round" />
        <path d="M22 18 14 24M22 18 32 22" stroke="var(--paper)" strokeWidth={3} strokeLinecap="round" />
      </motion.g>

      <motion.g animate={{ opacity: runWeight }} transition={{ duration: 0.2 }}>
        <circle cx={16} cy={9} r={5} fill="var(--brand)" />
        <path d="M16 14 22 26" stroke="var(--brand)" strokeWidth={3} strokeLinecap="round" />
        <path d="M22 26 34 18M22 26 14 40" stroke="var(--brand)" strokeWidth={3} strokeLinecap="round" />
        <path d="M16 14 6 20M16 14 24 10" stroke="var(--brand)" strokeWidth={3} strokeLinecap="round" />
      </motion.g>
    </svg>
  );
}
