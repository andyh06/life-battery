import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { InterventionResult } from "@/lib/predict";

interface InterventionsPanelProps {
  interventions: InterventionResult[];
}

/** interventions[] already arrives sorted biggest-gain-first from predict.ts. */
export function InterventionsPanel({ interventions }: InterventionsPanelProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">What you can still change</CardTitle>
      </CardHeader>
      <CardContent>
        {interventions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No computed swap gains you years beyond what you&apos;re already doing.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {interventions.map((iv, i) => (
              <li key={iv.key} className="flex flex-col gap-1">
                {i > 0 ? <Separator className="mb-2" /> : null}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{iv.label}</span>
                  <Badge>+{iv.yearsGained.toFixed(1)} yrs</Badge>
                </div>
                {iv.detail ? (
                  <p className="text-sm text-muted-foreground">{iv.detail}</p>
                ) : null}
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
