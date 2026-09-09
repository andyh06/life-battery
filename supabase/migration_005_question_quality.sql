-- Life Battery — questionnaire quality pass (Stage 1.6).
-- Run this in the Supabase SQL Editor, then clear .next before testing
-- locally (unstable_cache persists to disk and survives a dev-server
-- restart — see the "Next.js disk cache survives restart" memory note).

-- ---------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------

alter table risk_factor_levels
  add column if not exists description text;

alter table risk_factors
  add column if not exists optional       boolean not null default false,
  add column if not exists sensitive_note text;

-- ---------------------------------------------------------------
-- Mark the clinical-history questions optional. family_history is handled
-- separately below (removed entirely, not just made optional) — see that
-- section for why marking it optional first would be pointless.
-- ---------------------------------------------------------------

update risk_factors
set optional = true, sensitive_note = 'Asked because it meaningfully changes the estimate. Your answers are logged anonymously and never linked to you.'
where key in ('diabetes', 'hypertension', 'cholesterol', 'stress');

-- ---------------------------------------------------------------
-- Remove family_history entirely. A hazard ratio of 1.20 is a small enough
-- effect that asking people to think about a dead parent isn't worth it.
-- risk_factor_levels.risk_factor_key has ON DELETE CASCADE, so deleting the
-- risk_factors row alone would take its levels with it — deleting levels
-- first anyway, to be explicit rather than rely on the cascade silently.
-- ---------------------------------------------------------------

delete from risk_factor_levels where risk_factor_key = 'family_history';
delete from risk_factors where key = 'family_history';

-- ---------------------------------------------------------------
-- Alcohol: ask in drinks/month (0-120, step 1) instead of drinks/week.
-- "I drink once a month or less" had no representation on a 0-30/week
-- scale. The risk_factor_levels bounds stay in WEEKLY terms unchanged —
-- the app converts the monthly slider value to weekly (divide by 4.345)
-- at the point of band-matching, in both the live client preview and the
-- server route (see src/lib/risk-levels.ts). predict.ts and the bands
-- here are untouched.
-- ---------------------------------------------------------------

update risk_factors
set unit = 'drinks/month', min_input = 0, max_input = 120, step = 1
where key = 'alcohol';

-- ---------------------------------------------------------------
-- Driving: descriptions with a concrete anchor for the tooltip.
-- ---------------------------------------------------------------

update risk_factor_levels set description = 'Under 5,000 miles a year - occasional driving, not a daily commute.' where risk_factor_key = 'driving' and level_key = 'under5k';
update risk_factor_levels set description = '5,000 to 15,000 miles a year - a typical commute-driven yearly total.' where risk_factor_key = 'driving' and level_key = '5k_15k';
update risk_factor_levels set description = '15,000 miles is about 40 miles a day, roughly a daily commute across a mid-sized city.' where risk_factor_key = 'driving' and level_key = 'over15k';

-- ---------------------------------------------------------------
-- Diet: 3 -> 6 levels. The original 'poor' (1.20) and 'good' (0.88)
-- endpoints came from Sofi et al. 2010's pooled low- and high-adherence
-- comparison; 'mixed' (1.00) was this app's own reference midpoint. Kept
-- all three unchanged (interventions.mediterranean and two mascot_quips
-- reference 'poor'/'good' by level_key) and added three new levels by
-- linearly interpolating within those two published endpoints — never
-- extrapolating beyond them.
-- ---------------------------------------------------------------

update risk_factor_levels set description = 'Fast food or takeout most days, rarely fresh vegetables, fruit, or fish.' where risk_factor_key = 'diet' and level_key = 'poor';
update risk_factor_levels set description = 'A roughly even mix of home-cooked and processed food.' where risk_factor_key = 'diet' and level_key = 'mixed';
update risk_factor_levels set description = 'Vegetables, fish, whole grains, and olive oil most days; little red meat or processed food.' where risk_factor_key = 'diet' and level_key = 'good';

insert into risk_factor_levels (risk_factor_key, level_key, label, hazard_ratio, applies_to_sex, description, source_id, citation_note, sort_order) values
  ('diet', 'leaning_poor', 'Mostly processed, a little fresh food', 1.13, 'all', 'Processed and fast food most days, with vegetables or fruit only a couple of times a week.', 'sofi_2010', 'Interpolated between the poor and mixed levels (not directly reported by Sofi et al. 2010).', 15),
  ('diet', 'mostly_mixed', 'Mostly home-cooked, but inconsistent', 1.07, 'all', 'Home-cooked meals most days, but still leaning on processed or fast food a few times a week.', 'sofi_2010', 'Interpolated between the poor and mixed levels (not directly reported by Sofi et al. 2010).', 25),
  ('diet', 'leaning_good', 'Mostly whole foods', 0.94, 'all', 'Mostly home-cooked with vegetables most days, processed food only occasionally.', 'sofi_2010', 'Interpolated between the mixed and good levels (not directly reported by Sofi et al. 2010).', 35);

-- Re-space sort_order cleanly now that new rows sit between the originals
-- (poor=10, leaning_poor=15, mostly_mixed=25, mixed=30, leaning_good=35, good=40).
update risk_factor_levels set sort_order = 10 where risk_factor_key = 'diet' and level_key = 'poor';
update risk_factor_levels set sort_order = 30 where risk_factor_key = 'diet' and level_key = 'mixed';
update risk_factor_levels set sort_order = 40 where risk_factor_key = 'diet' and level_key = 'good';

-- ---------------------------------------------------------------
-- Social: 3 -> 5 levels. 'strong' (1.00), 'moderate' (1.20), and
-- 'isolated' (1.45) are Holt-Lunstad et al. 2010's reported categories
-- (interventions.social_ties and two mascot_quips reference 'strong'/
-- 'isolated' by level_key, so both stay unchanged); two new levels
-- interpolated between the adjacent published points.
-- ---------------------------------------------------------------

update risk_factor_levels set description = 'Close friends or family you see or talk with often, and can count on.' where risk_factor_key = 'social' and level_key = 'strong';
update risk_factor_levels set description = 'Some social contact, but thin - a handful of people you can count on.' where risk_factor_key = 'social' and level_key = 'moderate';
update risk_factor_levels set description = 'Little to no regular contact with friends or family.' where risk_factor_key = 'social' and level_key = 'isolated';

insert into risk_factor_levels (risk_factor_key, level_key, label, hazard_ratio, applies_to_sex, description, source_id, citation_note, sort_order) values
  ('social', 'leaning_strong', 'Regular but not close-knit', 1.10, 'all', 'Regular contact with a few close people, a bit less often than you''d like.', 'holtlunstad_2010', 'Interpolated between the strong and moderate levels (not directly reported by Holt-Lunstad et al. 2010).', 15),
  ('social', 'leaning_isolated', 'Mostly on your own', 1.33, 'all', 'Contact with others is rare most weeks; mostly on your own.', 'holtlunstad_2010', 'Interpolated between the moderate and isolated levels (not directly reported by Holt-Lunstad et al. 2010).', 25);

update risk_factor_levels set sort_order = 10 where risk_factor_key = 'social' and level_key = 'strong';
update risk_factor_levels set sort_order = 20 where risk_factor_key = 'social' and level_key = 'moderate';
update risk_factor_levels set sort_order = 30 where risk_factor_key = 'social' and level_key = 'isolated';

-- ---------------------------------------------------------------
-- Income: 4 -> 7 brackets. Nothing else references income's level_keys, so
-- the full set is replaced rather than patched. The two endpoints (1.50,
-- 1.00) are Chetty et al. 2016's bottom-quartile-vs-top-quartile
-- comparison; the five interior brackets are evenly interpolated between
-- them — Chetty's gradient is in reality steeper at the bottom than the
-- top, but a finer published curve isn't available for this app to draw
-- on, so linear interpolation is the honest simplification, disclosed in
-- each interior row's citation_note.
-- ---------------------------------------------------------------

delete from risk_factor_levels where risk_factor_key = 'income';

insert into risk_factor_levels (risk_factor_key, level_key, label, hazard_ratio, applies_to_sex, description, source_id, citation_note, sort_order) values
  ('income', 'under25',  'Under $25,000',      1.50, 'all', 'Household income under $25,000 a year.',            'chetty_2016', 'Bottom of Chetty et al. 2016''s income-life-expectancy gradient (bottom quartile comparison).', 10),
  ('income', '25_40',    '$25,000-$40,000',    1.42, 'all', 'Household income $25,000 to $40,000 a year.',       'chetty_2016', 'Interpolated along Chetty et al. 2016''s income-life-expectancy gradient (not a directly reported bracket).', 20),
  ('income', '40_60',    '$40,000-$60,000',    1.33, 'all', 'Household income $40,000 to $60,000 a year.',       'chetty_2016', 'Interpolated along Chetty et al. 2016''s income-life-expectancy gradient (not a directly reported bracket).', 30),
  ('income', '60_80',    '$60,000-$80,000',    1.25, 'all', 'Household income $60,000 to $80,000 a year.',       'chetty_2016', 'Interpolated along Chetty et al. 2016''s income-life-expectancy gradient (not a directly reported bracket).', 40),
  ('income', '80_100',   '$80,000-$100,000',   1.17, 'all', 'Household income $80,000 to $100,000 a year.',      'chetty_2016', 'Interpolated along Chetty et al. 2016''s income-life-expectancy gradient (not a directly reported bracket).', 50),
  ('income', '100_150',  '$100,000-$150,000',  1.08, 'all', 'Household income $100,000 to $150,000 a year.',     'chetty_2016', 'Interpolated along Chetty et al. 2016''s income-life-expectancy gradient (not a directly reported bracket).', 60),
  ('income', 'over150',  'Over $150,000',      1.00, 'all', 'Household income over $150,000 a year.',            'chetty_2016', 'Top of Chetty et al. 2016''s income-life-expectancy gradient (top quartile comparison). Reference category.', 70);

-- ---------------------------------------------------------------
-- Stress: 3 -> 5 levels. No specific study backs this factor (source_id
-- was already null for all three original rows) — the two new levels are
-- interpolated between this app's own existing estimates, not a paper's.
-- ---------------------------------------------------------------

update risk_factor_levels set description = 'Stress rarely gets in the way of daily life.' where risk_factor_key = 'stress' and level_key = 'rarely';
update risk_factor_levels set description = 'A regular but manageable background level of stress most weeks.' where risk_factor_key = 'stress' and level_key = 'sometimes';
update risk_factor_levels set description = 'Under serious stress most of the time.' where risk_factor_key = 'stress' and level_key = 'often';

insert into risk_factor_levels (risk_factor_key, level_key, label, hazard_ratio, applies_to_sex, description, citation_note, sort_order) values
  ('stress', 'occasionally', 'Occasionally', 1.04, 'all', 'Stressed some weeks, but it passes quickly.', 'Interpolated between the rarely and sometimes levels; not from a specific cited study.', 15),
  ('stress', 'frequently', 'Frequently', 1.17, 'all', 'Stressed most weeks, and it''s starting to wear on you.', 'Interpolated between the sometimes and often levels; not from a specific cited study.', 25);

update risk_factor_levels set sort_order = 10 where risk_factor_key = 'stress' and level_key = 'rarely';
update risk_factor_levels set sort_order = 20 where risk_factor_key = 'stress' and level_key = 'sometimes';
update risk_factor_levels set sort_order = 30 where risk_factor_key = 'stress' and level_key = 'often';
