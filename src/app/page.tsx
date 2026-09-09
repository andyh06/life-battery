import { LifeBatteryFlow } from "@/components/life-battery/flow";
import { getRiskFactorLevels, getRiskFactors, getStates } from "@/lib/data";

export default async function Home() {
  const [states, riskFactors, riskFactorLevels] = await Promise.all([
    getStates(),
    getRiskFactors(),
    getRiskFactorLevels(),
  ]);

  return (
    <LifeBatteryFlow states={states} riskFactors={riskFactors} riskFactorLevels={riskFactorLevels} />
  );
}
