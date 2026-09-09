"use client";

import { motion } from "motion/react";

const POINT_COUNT = 5;
const spring = { type: "spring" as const, stiffness: 100, damping: 18 };

/** severity: 0 (strong ties) to 1 (isolated) — dots drift apart from a tight cluster and their connecting lines fade. */
export function SocialIllustration({ severity }: { severity: number }) {
  const s = Math.min(1, Math.max(0, severity));
  // radius + dot radius (4) must stay within the 0-48 viewBox; 6+13=19, +4=23,
  // leaving a 1-unit margin against the 24-center/48-wide frame.
  const radius = 6 + s * 13;
  const center = 24;

  const points = Array.from({ length: POINT_COUNT }, (_, i) => {
    const angle = (i / POINT_COUNT) * Math.PI * 2 - Math.PI / 2;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  });

  return (
    <svg viewBox="0 0 48 48" className="h-24 w-24 overflow-hidden" fill="none">
      {points.map((a, i) =>
        points.slice(i + 1).map((b, j) => (
          <motion.line
            key={`${i}-${j}`}
            stroke="var(--paper)"
            strokeWidth={1}
            initial={false}
            animate={{ x1: a.x, y1: a.y, x2: b.x, y2: b.y, opacity: 0.6 - s * 0.55 }}
            transition={spring}
          />
        ))
      )}
      {points.map((p, i) => (
        <motion.circle
          key={i}
          r={4}
          fill="var(--brand)"
          initial={false}
          animate={{ cx: p.x, cy: p.y }}
          transition={spring}
        />
      ))}
    </svg>
  );
}
