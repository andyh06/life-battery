"use client";

import { motion } from "motion/react";

const GAUGE_MIN = 15;
const GAUGE_MAX = 45;
/** Band boundaries from the bmi risk_factor_levels bounds — ticks only, no color-coding by band. */
const TICKS = [18.5, 25, 30, 35, 40];

/**
 * A neutral dial, not a body silhouette — morphing a figure's width by
 * someone's own weight answer is the question people are most
 * self-conscious about, so this shows the number against its bands instead.
 */
export function BmiGauge({ bmi }: { bmi: number }) {
  const clamped = Math.min(GAUGE_MAX, Math.max(GAUGE_MIN, bmi));
  const fraction = (clamped - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN);
  const angle = Math.PI * (1 - fraction); // π (left) at min, 0 (right) at max
  const cx = 24;
  const cy = 30;
  const r = 20;
  const needleX = cx - r * Math.cos(angle);
  const needleY = cy - r * Math.sin(angle);

  return (
    <svg viewBox="0 0 48 34" className="h-24 w-24" fill="none">
      <path d="M4 30 A20 20 0 0 1 44 30" stroke="var(--surface-2)" strokeWidth={3} strokeLinecap="round" />
      {TICKS.map((tick) => {
        const tFraction = (tick - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN);
        const tAngle = Math.PI * (1 - tFraction);
        const x1 = cx - (r - 2) * Math.cos(tAngle);
        const y1 = cy - (r - 2) * Math.sin(tAngle);
        const x2 = cx - (r + 2) * Math.cos(tAngle);
        const y2 = cy - (r + 2) * Math.sin(tAngle);
        return (
          <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted-foreground)" strokeWidth={1} />
        );
      })}
      <motion.line
        x1={cx}
        y1={cy}
        stroke="var(--brand)"
        strokeWidth={2.5}
        strokeLinecap="round"
        initial={false}
        animate={{ x2: needleX, y2: needleY }}
        transition={{ type: "spring", stiffness: 130, damping: 18 }}
      />
      <circle cx={cx} cy={cy} r={2.5} fill="var(--paper)" />
    </svg>
  );
}
