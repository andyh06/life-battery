"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** Counts up from zero whenever `value` changes; collapses to the final value under prefers-reduced-motion. */
export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 1,
  prefix = "",
  suffix = "",
  className,
}: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  const [animatedValue, setAnimatedValue] = useState(0);
  const display = prefersReducedMotion ? value : animatedValue;

  useEffect(() => {
    if (prefersReducedMotion) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setAnimatedValue,
    });
    return () => controls.stop();
  }, [value, duration, prefersReducedMotion]);

  return (
    <span className={className}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
