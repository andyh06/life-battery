import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeadingCausesResult } from "@/lib/data";

interface LeadingCausesPanelProps {
  stateName: string;
  leadingCauses: LeadingCausesResult | null;
}

/**
 * leading_causes has no age or sex breakdown (see src/lib/data.ts) — this is
 * whole-state, all-ages, both-sexes data, not anything matched to the user.
 * The line above the card exists specifically to keep that honest. No
 * mascot commentary belongs anywhere near this panel: some states'
 * top-5 includes suicide, accidents, or homicide, and those rows get a
 * quiet factual note, never a quip.
 */
export function LeadingCausesPanel({ stateName, leadingCauses }: LeadingCausesPanelProps) {
  if (!leadingCauses || leadingCauses.causes.length === 0) return null;

  const hasSuicide = leadingCauses.causes.some((c) => c.causeName === "Suicide");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        This is population data about everyone in {stateName} - all ages, both sexes. It is not a
        claim about you specifically.
      </p>
      <Card className="w-full border-none bg-surface">
        <CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight">
            In {stateName}, the most common causes of death are
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-3">
            {leadingCauses.causes.map((cause) => (
              <li key={cause.causeName} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{cause.causeName}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {cause.sharePercent.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.min(100, cause.sharePercent)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Share of all deaths in {stateName}, {leadingCauses.year} — CDC/NCHS.
          </p>
        </CardContent>
      </Card>
      {hasSuicide ? (
        <p className="text-xs text-muted-foreground">
          If you or someone you know is struggling, the 988 Suicide and Crisis Lifeline is
          available by call or text, 24/7.
        </p>
      ) : null}
    </div>
  );
}
