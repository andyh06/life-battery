"use client";

import { Armchair } from "lucide-react";
import { motion } from "motion/react";

const spring = { type: "spring" as const, stiffness: 130, damping: 16 };
const MAX_HOURS = 16;

/** The armchair grows and the ground it sits on tilts further as sitting hours rise — dominating the frame at the high end. */
export function SedentaryIllustration({ hours }: { hours: number }) {
  const s = Math.min(1, Math.max(0, hours / MAX_HOURS));
  const scale = 0.75 + s * 0.85;
  const tilt = s * 10;

  return (
    <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden">
      <motion.div
        className="absolute inset-x-3 bottom-7 h-1 rounded-full bg-surface-2"
        initial={false}
        animate={{ rotate: tilt }}
        transition={spring}
      />
      <motion.div initial={false} animate={{ scale }} transition={spring}>
        <Armchair className="size-12 text-brand" strokeWidth={2} />
      </motion.div>
    </div>
  );
}
