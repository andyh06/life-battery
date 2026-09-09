-- Life Battery — question clarity pass (Stage 1.7). Run in the Supabase SQL
-- Editor, then clear .next before testing locally (see the "Next.js disk
-- cache survives restart" memory note).

-- ---------------------------------------------------------------
-- Alcohol: back to 'choice'. A 0-120/month slider was false precision for a
-- model that only has five bands. hazard_ratio and min_value/max_value are
-- untouched — only labels and input_type change.
-- ---------------------------------------------------------------

update risk_factors
set input_type = 'choice', min_input = null, max_input = null, step = null, unit = null
where key = 'alcohol';

update risk_factor_levels set label = 'I don''t drink' where risk_factor_key = 'alcohol' and level_key = 'none';
update risk_factor_levels set label = 'A few times a year, up to about one a week' where risk_factor_key = 'alcohol' and level_key = 'light';
update risk_factor_levels set label = 'A couple of drinks a week' where risk_factor_key = 'alcohol' and level_key = 'moderate';
update risk_factor_levels set label = 'Most days, or several on the days I do drink' where risk_factor_key = 'alcohol' and level_key = 'heavy';
update risk_factor_levels set label = 'Daily and heavily' where risk_factor_key = 'alcohol' and level_key = 'very_heavy';

-- ---------------------------------------------------------------
-- Redundant tooltips: a description that just restates its own label adds
-- nothing. The income brackets are the clear case (every one of them just
-- repeated the dollar figure already in the label); two of the stress
-- levels have the same problem. Everywhere else the description adds a
-- real detail (frequency, a concrete number, what counts as "close") that
-- the label alone doesn't carry, so those stay.
-- ---------------------------------------------------------------

update risk_factor_levels set description = null where risk_factor_key = 'income';
update risk_factor_levels set description = null where risk_factor_key = 'stress' and level_key in ('rarely', 'often');

-- ---------------------------------------------------------------
-- help_text for every factor that lacked a "why are you asking this"
-- sentence. Each is grounded in that factor's actual source_id where one
-- exists (see risk_factor_levels / sources); where there's no specific
-- cited study, the sentence stays general rather than inventing a citation,
-- and effect sizes are described as modest where the hazard ratios are
-- modest (sleep, diet, stress, seatbelt, driving are all in the 1.0-1.3x
-- range, next to smoking's 2.8x or diabetes's 1.8x).
-- ---------------------------------------------------------------

update risk_factors set help_text = 'Smoking is the largest modifiable risk factor in this model, roughly tripling mortality risk for regular smokers in adjusted cohort studies.' where key = 'smoking';
update risk_factors set help_text = 'Both short and long sleep are linked to modestly higher mortality risk in pooled sleep-duration studies.' where key = 'sleep';
update risk_factors set help_text = 'Diet quality is linked to mortality risk in pooled dietary-pattern studies, though the effect is modest next to smoking.' where key = 'diet';
update risk_factors set help_text = 'Sitting time carries risk separate from whether you exercise.' where key = 'sedentary';
update risk_factors set help_text = 'Income is one of the strongest predictors of life expectancy in US data - a roughly 10-year gap between the top and bottom quartiles.' where key = 'income';
update risk_factors set help_text = 'Education tracks life expectancy independent of income, likely through health literacy and job conditions.' where key = 'education';
update risk_factors set help_text = 'Access to care affects survival independently of income.' where key = 'insurance';
update risk_factors set help_text = 'Diabetes is an independent, well-established predictor of mortality in large pooled cohort studies.' where key = 'diabetes';
update risk_factors set help_text = 'High blood pressure raises cardiovascular risk, though treatment removes much of the excess.' where key = 'hypertension';
update risk_factors set help_text = 'High cholesterol is a modest, independent contributor to cardiovascular risk, adjusted here for blood pressure and diabetes.' where key = 'cholesterol';
update risk_factors set help_text = 'Chronic stress is associated with modestly higher mortality risk, independent of the behaviors it often drives.' where key = 'stress';
update risk_factors set help_text = 'Seatbelt use has a small effect on average mortality risk but a very large effect on survival in a crash.' where key = 'seatbelt';
update risk_factors set help_text = 'More time on the road means more exposure to crash risk, though the per-mile effect is small.' where key = 'driving';
