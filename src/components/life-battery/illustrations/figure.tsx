"use client";

import { motion } from "motion/react";

interface FigureProps {
  /** 0 = upright and lean, 1 = fully stooped/slumped. */
  slump: number;
  color?: string;
  className?: string;
}

/**
 * Shared geometric humanoid used by the age, activity, and sedentary
 * illustrations — only the `slump` parameter differs per question. A single
 * quadratic spine bends forward and the head drops as slump increases;
 * motion springs the transition whenever the caller's value changes.
 */
export function Figure({ slump, color = "var(--paper)", className }: FigureProps) {
  const s = Math.min(1, Math.max(0, slump));
  const headX = 24 + s * 7;
  const headY = 9 + s * 9;
  const neckX = 24 + s * 4;
  const neckY = 15 + s * 6;
  const hipX = 24;
  const hipY = 34;
  const ctrlX = 24 + s * 12;
  const ctrlY = (neckY + hipY) / 2 + s * 2;

  const spring = { type: "spring" as const, stiffness: 140, damping: 22 };

  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <motion.circle
        r={5}
        fill={color}
        initial={false}
        animate={{ cx: headX, cy: headY }}
        transition={spring}
      />
      <motion.path
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        initial={false}
        animate={{ d: `M ${neckX} ${neckY} Q ${ctrlX} ${ctrlY} ${hipX} ${hipY}` }}
        transition={spring}
      />
      <path d={`M ${hipX} ${hipY} L 17 46`} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <path d={`M ${hipX} ${hipY} L 31 46`} stroke={color} strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}
