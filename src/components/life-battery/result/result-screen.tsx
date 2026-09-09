import { Button } from "@/components/ui/button";
import type { PredictResult } from "@/lib/predict";
import { BatteryGauge } from "./battery-gauge";
import { ContributionsPanel } from "./contributions-panel";
import { DisclaimerPanel } from "./disclaimer-panel";
import { InterventionsPanel } from "./interventions-panel";

interface ResultScreenProps {
  result: PredictResult;
  onStartOver: () => void;
}

/**
 * A composition of independent panels — later stages (leading-causes panel
 * in Stage 4, county comparison in Stage 5) slot in here as additional
 * children without touching the panels already here.
 */
export function ResultScreen({ result, onStartOver }: ResultScreenProps) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <BatteryGauge
        batteryPercent={result.batteryPercent}
        adjustedEx={result.adjustedEx}
        expectedAgeAtDeath={result.expectedAgeAtDeath}
      />
      <ContributionsPanel contributions={result.contributions} />
      <InterventionsPanel interventions={result.interventions} />
      <DisclaimerPanel />
      <Button variant="outline" className="w-full" onClick={onStartOver}>
        Start over
      </Button>
    </div>
  );
}
