"use client";

import { Footprints } from "lucide-react";
import { motion } from "motion/react";

const MAX_MIN_PER_WEEK = 500;
const MAX_STEPS = 6;
const FRAME_PX = 96;
const GAP_PX = 4;
const MAX_ICON_PX = 28; // matches the size-7 used elsewhere

/** Footprints multiply and bounce faster as weekly activity minutes rise. */
export function ActivityIllustration({ minutesPerWeek }: { minutesPerWeek: number }) {
  const fraction = Math.min(1, Math.max(0, minutesPerWeek / MAX_MIN_PER_WEEK));
  const stepCount = 1 + Math.round(fraction * (MAX_STEPS - 1));
  const bounceDuration = 1.1 - fraction * 0.7;
  // 6 icons at the normal size-7 (28px) would be 188px wide — nowhere near
  // fitting the 96px frame. Shrink icons as the count grows instead of
  // clipping them; a single icon still gets the full size-7 treatment.
  const iconPx = Math.min(
    MAX_ICON_PX,
    Math.floor((FRAME_PX - (stepCount - 1) * GAP_PX) / stepCount)
  );

  return (
    <div
      className="flex h-24 w-24 items-center justify-center overflow-hidden"
      style={{ gap: GAP_PX }}
    >
      {Array.from({ length: stepCount }, (_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -4, 0],
            rotate: i % 2 === 0 ? -14 : 14,
          }}
          transition={{
            opacity: { duration: 0.2 },
            scale: { duration: 0.2 },
            rotate: { duration: 0.2 },
            y: {
              duration: bounceDuration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.08,
            },
          }}
        >
          <Footprints
            className="text-brand"
            style={{ width: iconPx, height: iconPx }}
            strokeWidth={2}
          />
        </motion.div>
      ))}
    </div>
  );
}
