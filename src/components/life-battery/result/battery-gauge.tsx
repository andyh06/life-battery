import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

interface BatteryGaugeProps {
  batteryPercent: number;
  adjustedEx: number;
  expectedAgeAtDeath: number;
}

export function BatteryGauge({ batteryPercent, adjustedEx, expectedAgeAtDeath }: BatteryGaugeProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Life Battery</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Progress value={batteryPercent}>
          <div className="flex w-full items-baseline justify-between">
            <ProgressLabel className="text-3xl font-semibold">
              {Math.round(batteryPercent)}%
            </ProgressLabel>
            <ProgressValue />
          </div>
        </Progress>
        <p className="text-sm text-muted-foreground">
          About {adjustedEx.toFixed(1)} years of remaining life expectancy — an expected age at
          death of roughly {expectedAgeAtDeath.toFixed(0)}.
        </p>
      </CardContent>
    </Card>
  );
}
