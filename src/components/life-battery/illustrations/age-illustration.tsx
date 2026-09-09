"use client";

import { Figure } from "./figure";

const MIN_AGE = 18;
const MAX_AGE = 90;

/** Upright and lean at 20, gradually stooped by 90 — same spine-bend primitive as activity/sedentary. */
export function AgeIllustration({ age }: { age: number }) {
  const slump = (age - MIN_AGE) / (MAX_AGE - MIN_AGE);
  return <Figure slump={slump} className="h-24 w-24" />;
}
