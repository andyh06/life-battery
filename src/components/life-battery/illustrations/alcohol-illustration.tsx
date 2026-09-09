"use client";

import { motion } from "motion/react";

const GLASS_COUNT = 5;
const spring = { type: "spring" as const, stiffness: 120, damping: 20 };

/** severity: 0 (none) to 1 (daily and heavily) — more glasses fill, and each fills higher. */
export function AlcoholIllustration({ severity }: { severity: number }) {
  const s = Math.min(1, Math.max(0, severity));
  const filledGlasses = s * GLASS_COUNT;

  return (
    <svg viewBox="0 0 50 30" className="h-24 w-24" fill="none">
      {Array.from({ length: GLASS_COUNT }, (_, i) => {
        const x = 3 + i * 10;
        const glassFill = Math.min(1, Math.max(0, filledGlasses - i));
        const fillHeight = glassFill * 16;
        return (
          <g key={i}>
            <path
              d={`M${x} 4 L${x + 2} 24 L${x + 6} 24 L${x + 8} 4 Z`}
              stroke="var(--surface-2)"
              strokeWidth={1.5}
              fill="none"
            />
            <motion.rect
              x={x + 1}
              width={6}
              fill="var(--danger)"
              initial={false}
              animate={{ y: 24 - fillHeight, height: fillHeight }}
              transition={spring}
            />
          </g>
        );
      })}
    </svg>
  );
}
