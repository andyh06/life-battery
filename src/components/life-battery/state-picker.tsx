"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import type { StateRow } from "@/lib/data";
import { StateSelect } from "./state-select";
import { UsMap } from "./us-map";

interface StatePickerProps {
  states: StateRow[];
  value: string | null;
  onSelect: (stateFips: string) => void;
}

/**
 * The single entry point for picking a state — same {states, value, onSelect}
 * contract as the plain Select it wraps, so callers never know which UI is
 * live. Below ~640px the map is too small to hit individual states
 * reliably, so it falls back to the dropdown instead of trying to make the
 * map itself responsive.
 */
export function StatePicker({ states, value, onSelect }: StatePickerProps) {
  const isSmallScreen = useMediaQuery("(max-width: 639px)");

  if (isSmallScreen) {
    return <StateSelect states={states} value={value} onSelect={onSelect} />;
  }
  return <UsMap states={states} onSelect={onSelect} />;
}
