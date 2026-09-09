import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContributionResult } from "@/lib/predict";
import { AnimatedNumber } from "../animated-number";

interface ContributionsPanelProps {
  contributions: ContributionResult[];
}

/** contributions[] already arrives sorted biggest-impact-first from predict.ts. */
export function ContributionsPanel({ contributions }: ContributionsPanelProps) {
  const nonZero = contributions.filter((c) => c.yearsImpact > 0);

  return (
    <Card className="w-full border-none bg-surface">
      <CardHeader>
        <CardTitle className="text-xl font-bold tracking-tight">What drove this</CardTitle>
      </CardHeader>
      <CardContent>
        {nonZero.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing you answered is currently costing you years relative to the reference level.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {nonZero.map((c) => (
              <li
                key={c.riskFactorKey}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="font-medium">{c.label}</span>
                <AnimatedNumber
                  value={c.yearsImpact}
                  decimals={1}
                  prefix="-"
                  suffix=" yrs"
                  className="text-lg font-bold tabular-nums text-danger"
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
