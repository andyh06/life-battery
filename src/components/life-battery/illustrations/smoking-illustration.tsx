"use client";

import { motion } from "motion/react";

const spring = { type: "spring" as const, stiffness: 120, damping: 20 };

/** severity: 0 (never smoked) to 1 (current, heaviest) — the cigarette burns shorter and the ember/smoke grow as it rises. */
export function SmokingIllustration({ severity }: { severity: number }) {
  const s = Math.min(1, Math.max(0, severity));
  const length = 30 - s * 18; // full unburned length at 0, mostly consumed at 1
  const startX = 10;
  const endX = startX + length;

  return (
    <svg viewBox="0 0 48 24" className="h-24 w-24" fill="none">
      <motion.rect
        y={9}
        height={6}
        rx={2}
        fill="var(--paper)"
        initial={false}
        animate={{ x: startX, width: length }}
        transition={spring}
      />
      {/* filter tip, fixed */}
      <rect x={2} y={9} width={8} height={6} rx={2} fill="var(--surface-2)" />
      <motion.circle
        r={3}
        fill="var(--danger)"
        initial={false}
        animate={{ cx: endX, cy: 12, opacity: 0.4 + s * 0.6 }}
        transition={spring}
      />
      <motion.path
        stroke="var(--muted-foreground)"
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
        initial={false}
        animate={{
          d: `M ${endX + 2} 9 Q ${endX + 6} ${2 - s * 4} ${endX + 10} ${6 - s * 8}`,
          opacity: 0.3 + s * 0.5,
        }}
        transition={spring}
      />
    </svg>
  );
}
