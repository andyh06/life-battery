/**
 * The "activity" risk factor is asked as days/week x minutes/session x
 * intensity, but stored and modeled as a single minutes/week number (the
 * risk_factor_levels bands and hazard ratios are calibrated to that unit,
 * unchanged from before this question was split up). This is the one place
 * the conversion happens, shared by the live question-screen preview and
 * flow.tsx's submit-time computation so they can never drift apart.
 */

export type ExerciseIntensity = "light" | "moderate" | "vigorous";

/**
 * Standard guideline equivalence: 150 min/week moderate = 75 min/week
 * vigorous, i.e. vigorous counts double. Light activity isn't part of that
 * official equivalence, but the underlying dose-response study (arem_2015)
 * scores any leisure-time activity, so light still needs some weight —
 * half credit relative to moderate.
 */
const INTENSITY_MULTIPLIER: Record<ExerciseIntensity, number> = {
  light: 0.5,
  moderate: 1,
  vigorous: 2,
};

export function computeExerciseMinutesPerWeek(
  daysPerWeek: number,
  minutesPerSession: number,
  intensity: ExerciseIntensity
): number {
  return daysPerWeek * minutesPerSession * INTENSITY_MULTIPLIER[intensity];
}
