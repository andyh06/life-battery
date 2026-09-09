import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContributionResult } from "@/lib/predict";

interface ContributionsPanelProps {
  contributions: ContributionResult[];
}

/** contributions[] already arrives sorted biggest-impact-first from predict.ts. */
export function ContributionsPanel({ contributions }: ContributionsPanelProps) {
  const nonZero = contributions.filter((c) => c.yearsImpact > 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">What drove this</CardTitle>
      </CardHeader>
      <CardContent>
        {nonZero.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing you answered is currently costing you years relative to the reference level.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {nonZero.map((c) => (
              <li
                key={c.riskFactorKey}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>{c.label}</span>
                <Badge variant="secondary">-{c.yearsImpact.toFixed(1)} yrs</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
