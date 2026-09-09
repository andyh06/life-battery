"use client";

import { motion } from "motion/react";

const spring = { type: "spring" as const, stiffness: 120, damping: 20 };

/** severity: 0 (never smoked) to 1 (current, heaviest) — the cigarette burns shorter and the ember/smoke grow as it rises. Geometry only: a rectangle, a circle, a path. */
export function SmokingIllustration({ severity }: { severity: number }) {
  const s = Math.min(1, Math.max(0, severity));
  const length = 34 - s * 20; // full unburned length at 0, mostly consumed at 1
  const startX = 6;
  const endX = startX + length;

  return (
    <svg viewBox="0 0 48 48" className="h-24 w-24" fill="none">
      <motion.rect
        y={20}
        height={8}
        rx={2.5}
        fill="var(--paper)"
        initial={false}
        animate={{ x: startX, width: length }}
        transition={spring}
      />
      {/* filter tip, fixed */}
      <rect x={0} y={20} width={7} height={8} rx={2.5} fill="var(--surface-2)" />
      <motion.circle
        r={4}
        fill="var(--danger)"
        initial={false}
        animate={{ cx: endX, cy: 24, opacity: 0.4 + s * 0.6 }}
        transition={spring}
      />
      <motion.path
        stroke="var(--muted-foreground)"
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
        initial={false}
        animate={{
          d: `M ${endX + 2} 19 Q ${endX + 8} ${8 - s * 8} ${endX + 14} ${12 - s * 14}`,
          opacity: 0.3 + s * 0.5,
        }}
        transition={spring}
      />
    </svg>
  );
}
