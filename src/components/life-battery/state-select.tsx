"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StateRow } from "@/lib/data";

interface StateSelectProps {
  states: StateRow[];
  value: string | null;
  onSelect: (stateFips: string) => void;
}

/**
 * Stage 2 replaces this with an animated US map. Keep this exact prop
 * contract (states in, a single onSelect(stateFips) callback out) so the
 * swap is a one-file change in the parent, not a rewrite of the flow.
 */
export function StateSelect({ states, value, onSelect }: StateSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onSelect(v as string)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select your state" />
      </SelectTrigger>
      <SelectContent>
        {states.map((state) => (
          <SelectItem key={state.fips} value={state.fips}>
            {state.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
