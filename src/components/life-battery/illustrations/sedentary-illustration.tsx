"use client";

import { Figure } from "./figure";

const MAX_HOURS = 16;

/** A chair plus the shared spine-bend figure — slump deepens as sitting hours rise. */
export function SedentaryIllustration({ hours }: { hours: number }) {
  const slump = Math.min(1, Math.max(0, hours / MAX_HOURS));
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full" fill="none">
        <path d="M14 30V44M34 30V44M14 44H34M14 30H34" stroke="var(--surface-2)" strokeWidth={3} strokeLinecap="round" />
      </svg>
      <Figure slump={slump} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
