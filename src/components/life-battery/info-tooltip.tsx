"use client";

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Small info icon that reveals `text` on hover AND keyboard focus (Base UI's Tooltip trigger handles both natively). */
export function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="More information"
          >
            <Info className="size-3.5" />
          </button>
        }
      />
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
