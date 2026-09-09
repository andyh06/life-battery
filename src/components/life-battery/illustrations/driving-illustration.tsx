"use client";

import { Car } from "lucide-react";
import { motion } from "motion/react";

const spring = { type: "spring" as const, stiffness: 110, damping: 18 };

const BOX = 96;
const PAD = 12;
const CAR_HALF_WIDTH = 20; // size-10 (40px) / 2, since the car is centered on its road-end position
const MAX_ROAD = BOX - PAD * 2 - CAR_HALF_WIDTH; // stop short so the car never exits the frame
const ROAD_Y = 62;

/** severity: 0 (under 5,000 mi) to 1 (over 15,000 mi) — the car drives further down a growing road as annual mileage rises. */
export function DrivingIllustration({ severity }: { severity: number }) {
  const s = Math.min(1, Math.max(0, severity));
  const roadWidth = 16 + s * (MAX_ROAD - 16);

  return (
    <div className="relative h-24 w-24 overflow-hidden">
      {/* Full-range guide, faint — shows how much further the road could go. */}
      <div
        className="absolute h-0.5 border-b-2 border-dashed border-surface-2"
        style={{ left: PAD, top: ROAD_Y, width: MAX_ROAD }}
      />
      <motion.div
        className="absolute h-1 rounded-full bg-brand"
        style={{ left: PAD, top: ROAD_Y }}
        initial={false}
        animate={{ width: roadWidth }}
        transition={spring}
      />
      <motion.div
        className="absolute"
        initial={false}
        animate={{ x: PAD + roadWidth, y: ROAD_Y }}
        transition={spring}
        style={{ translateX: "-50%", translateY: "-100%" }}
      >
        <Car className="size-10 text-brand" strokeWidth={2.25} />
      </motion.div>
    </div>
  );
}
