"use client";

import { Wine } from "lucide-react";
import { motion } from "motion/react";

const spring = { type: "spring" as const, stiffness: 120, damping: 20 };
const GLASS_COUNT = 5;

/** severity: 0 (none) to 1 (daily and heavily), ranked by dose — more glasses light up, each brighter, as intake rises. */
export function AlcoholIllustration({ severity }: { severity: number }) {
  const s = Math.min(1, Math.max(0, severity));
  const active = s * GLASS_COUNT;

  return (
    <div className="flex h-24 w-24 items-center justify-center gap-1 overflow-hidden">
      {Array.from({ length: GLASS_COUNT }, (_, i) => {
        const fill = Math.min(1, Math.max(0, active - i));
        return (
          <motion.div
            key={i}
            initial={false}
            animate={{ opacity: 0.15 + fill * 0.85, scale: 0.75 + fill * 0.35 }}
            transition={spring}
          >
            {/* 5 icons at size-3.5 (14px) + gap-1 (4px) = 86px at rest, with
                room to spare even at the 1.1x max scale — a size-7 row (the
                other illustrations' default) would be 164px, well past the
                96px frame. */}
            <Wine className="size-3.5 text-brand" strokeWidth={2} />
          </motion.div>
        );
      })}
    </div>
  );
}
