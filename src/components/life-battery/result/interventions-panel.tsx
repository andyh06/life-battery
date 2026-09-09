import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InterventionResult } from "@/lib/predict";
import { AnimatedNumber } from "../animated-number";

interface InterventionsPanelProps {
  interventions: InterventionResult[];
}

/**
 * Footnote shape: the headline carries the voice, the number is the payoff,
 * and detail/evidenceNote are the facts underneath — in that order, so the
 * pitch reads before the citation. interventions[] already arrives sorted
 * biggest-gain-first from predict.ts. A responsive grid rather than a single
 * divided-list column, so this reads fine whether there's 1 eligible swap or
 * all 8 — a lone card just occupies one cell instead of being stretched
 * across a lopsided full-width column.
 */
export function InterventionsPanel({ interventions }: InterventionsPanelProps) {
  return (
    <Card className="w-full border-none bg-surface">
      <CardHeader>
        <CardTitle className="text-xl font-bold tracking-tight">What you can still change</CardTitle>
      </CardHeader>
      <CardContent>
        {interventions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No computed swap gains you years beyond what you&apos;re already doing.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {interventions.map((iv) => (
              <li key={iv.key} className="flex flex-col gap-2 rounded-md border-l-2 border-brand bg-surface-2 p-4">
                <p className="text-lg leading-snug font-bold text-foreground">
                  {iv.headline ?? iv.label}
                </p>
                <AnimatedNumber
                  value={iv.yearsGained}
                  decimals={1}
                  prefix="+"
                  suffix=" years"
                  className="text-2xl font-extrabold text-brand"
                />
                {iv.detail ? <p className="text-sm text-muted-foreground">{iv.detail}</p> : null}
                {iv.evidenceNote ? (
                  <p className="text-xs text-muted-foreground italic">{iv.evidenceNote}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
