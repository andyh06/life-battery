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
 * children without touching the panels already here. Full-width rather than
 * a centered small card: the battery is the poster, the panels are a
 * two-column spread on anything wide enough for it.
 */
export function ResultScreen({ result, onStartOver }: ResultScreenProps) {
  return (
    <div className="flex w-full max-w-6xl flex-col gap-8 px-6">
      <BatteryGauge
        batteryPercent={result.batteryPercent}
        adjustedEx={result.adjustedEx}
        expectedAgeAtDeath={result.expectedAgeAtDeath}
      />
      <div className="hazard-stripes h-1.5 w-full opacity-60" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ContributionsPanel contributions={result.contributions} />
        <InterventionsPanel interventions={result.interventions} />
      </div>
      <DisclaimerPanel />
      <Button variant="outline" className="w-full" onClick={onStartOver}>
        Start over
      </Button>
    </div>
  );
}
