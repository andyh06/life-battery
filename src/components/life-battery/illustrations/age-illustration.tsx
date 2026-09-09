"use client";

import { MapPin } from "lucide-react";
import { motion } from "motion/react";

const spring = { type: "spring" as const, stiffness: 140, damping: 20 };

const MIN_AGE = 20;
const MAX_AGE = 100;
const DECADE_MARKS = [20, 30, 40, 50, 60, 70, 80, 90, 100];

/** A row of decade marks — filled ones are lived — with a marker sliding to your position. No morphing body. */
export function AgeIllustration({ age }: { age: number }) {
  const a = Math.min(MAX_AGE, Math.max(MIN_AGE, age));
  const fraction = (a - MIN_AGE) / (MAX_AGE - MIN_AGE);

  return (
    // px-3.5 insets the track by half the marker icon's width (size-7 = 28px)
    // so the marker's centered position at 0%/100% stays inside the 96px
    // frame instead of hanging its far half off the edge — the dot row below
    // doesn't strictly need it (flex items never exceed their container),
    // but sharing the inset keeps the marker aligned with its decade dot.
    <div className="flex h-24 w-24 flex-col items-center justify-center gap-3 overflow-hidden px-3.5">
      <div className="relative h-7 w-full">
        <motion.div
          className="absolute top-0"
          initial={false}
          animate={{ left: `${fraction * 100}%` }}
          transition={spring}
          style={{ translateX: "-50%" }}
        >
          <MapPin className="size-7 text-brand" strokeWidth={2.25} />
        </motion.div>
      </div>
      <div className="flex w-full items-center justify-between">
        {DECADE_MARKS.map((m) => (
          <span
            key={m}
            className={`block size-2.5 rounded-full transition-colors duration-300 ${
              m <= a ? "bg-brand" : "bg-surface-2"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
