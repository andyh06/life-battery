"use client";

import { motion } from "motion/react";

const spring = { type: "spring" as const, stiffness: 110, damping: 20 };

/** severity: 0 (under 5,000 mi) to 1 (over 15,000 mi) — the road stretches further into the distance and gains more dashes. */
export function DrivingIllustration({ severity }: { severity: number }) {
  const s = Math.min(1, Math.max(0, severity));
  const vanishX = 24 + s * 6; // road narrows toward a vanishing point further away as distance grows
  const dashCount = 2 + Math.round(s * 4);

  return (
    <svg viewBox="0 0 48 32" className="h-24 w-24" fill="none">
      <motion.path
        stroke="var(--surface-2)"
        strokeWidth={0}
        fill="var(--surface-2)"
        initial={false}
        animate={{ d: `M4 30 L${vanishX - 2} 6 L${vanishX + 2} 6 L44 30 Z` }}
        transition={spring}
      />
      {Array.from({ length: dashCount }, (_, i) => {
        const t = (i + 0.5) / dashCount;
        const y = 30 - t * 22;
        const width = 2.5 - t * 2;
        return (
          <motion.rect
            key={i}
            width={width}
            height={1.5}
            fill="var(--brand)"
            initial={false}
            animate={{ x: 24 - width / 2, y }}
            transition={spring}
          />
        );
      })}
    </svg>
  );
}
