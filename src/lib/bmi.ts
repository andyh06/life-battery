/**
 * BMI is captured as height + weight (not typed in directly), so this is
 * the one place the conversion happens. Canonical storage is always
 * imperial (inches, pounds) — the metric toggle only changes how the value
 * is displayed/edited, converting back to canonical on every change, so
 * switching units never loses precision or drifts.
 */

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;

export function bmiFromImperial(heightInches: number, weightLb: number): number {
  if (heightInches <= 0) return 0;
  return (703 * weightLb) / (heightInches * heightInches);
}

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}
