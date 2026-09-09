import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContributionResult } from "@/lib/predict";
import { WaterfallChart } from "./waterfall-chart";

interface ContributionsPanelProps {
  baselineEx: number;
  adjustedEx: number;
  contributions: ContributionResult[];
}

/** contributions[] already arrives sorted biggest-impact-first from predict.ts. */
export function ContributionsPanel({ baselineEx, adjustedEx, contributions }: ContributionsPanelProps) {
  const nonZero = contributions.filter((c) => c.yearsImpact > 0);

  return (
    <Card className="w-full border-none bg-surface">
      <CardHeader>
        <CardTitle className="text-xl font-bold tracking-tight">What drove this</CardTitle>
      </CardHeader>
      <CardContent>
        {nonZero.length === 0 && Math.abs(baselineEx - adjustedEx) < 0.05 ? (
          <p className="text-sm text-muted-foreground">
            Nothing you answered is currently costing you years relative to the reference level.
          </p>
        ) : (
          <WaterfallChart baselineEx={baselineEx} adjustedEx={adjustedEx} contributions={nonZero} />
        )}
      </CardContent>
    </Card>
  );
}
