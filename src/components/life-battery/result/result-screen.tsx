import { Button } from "@/components/ui/button";
import type { LeadingCausesResult } from "@/lib/data";
import type { PredictResult } from "@/lib/predict";
import { BatteryGauge } from "./battery-gauge";
import { ContributionsPanel } from "./contributions-panel";
import { DisclaimerPanel } from "./disclaimer-panel";
import { HowCalculated } from "./how-calculated";
import { InterventionsPanel } from "./interventions-panel";
import { LeadingCausesPanel } from "./leading-causes-panel";

/** What /api/predict actually returns: predict.ts's pure result plus the state-level leading-causes lookup merged on in route.ts. */
export interface ResultData extends PredictResult {
  leadingCauses: LeadingCausesResult | null;
}

interface ResultScreenProps {
  result: ResultData;
  stateName: string;
  onStartOver: () => void;
}

/**
 * A composition of independent panels — later stages (county comparison in
 * Stage 5) slot in here as additional children without touching the panels
 * already here. Full-width rather than a centered small card: the battery
 * is the poster, the panels are a two-column spread on anything wide enough
 * for it.
 */
export function ResultScreen({ result, stateName, onStartOver }: ResultScreenProps) {
  return (
    <div className="flex w-full max-w-6xl flex-col gap-8 px-6">
      <BatteryGauge
        batteryPercent={result.batteryPercent}
        adjustedEx={result.adjustedEx}
        expectedAgeAtDeath={result.expectedAgeAtDeath}
        uncertaintyBand={result.uncertaintyBand}
        survivalMilestones={result.survivalMilestones}
      />
      <div className="hazard-stripes h-1.5 w-full opacity-60" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ContributionsPanel contributions={result.contributions} />
        <InterventionsPanel interventions={result.interventions} />
      </div>
      <LeadingCausesPanel stateName={stateName} leadingCauses={result.leadingCauses} />
      <HowCalculated />
      <DisclaimerPanel />
      <Button variant="outline" className="w-full" onClick={onStartOver}>
        Start over
      </Button>
    </div>
  );
}
