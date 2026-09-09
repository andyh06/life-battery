-- Life Battery — intervention headlines (Stage 2.5). Run in the Supabase
-- SQL Editor, then clear .next before testing locally.
--
-- Cards now read headline (voice) -> computed years gained -> evidence_note
-- (fact) underneath, e.g.:
--   "Sleep is the cheapest year you'll ever buy"
--   +1.1 years
--   "Both short and long sleep track higher mortality - 7 to 8 hours sits
--    at the bottom of the curve."
-- headline is new copy; evidence_note is untouched.

alter table interventions
  add column if not exists headline text;

update interventions set headline = 'Quitting smoking is the single biggest thing on this list' where key = 'quit_smoking';
update interventions set headline = '150 minutes a week buys more than the gym membership implies' where key = 'meet_activity';
update interventions set headline = 'Your fork is a longevity lever' where key = 'mediterranean';
update interventions set headline = 'Sleep is the cheapest year you''ll ever buy' where key = 'fix_sleep';
update interventions set headline = 'Loneliness is a health condition' where key = 'social_ties';
update interventions set headline = 'One BMI band down is one real step' where key = 'reduce_bmi';
update interventions set headline = 'Fewer drinks, more years' where key = 'cut_drinking';
update interventions set headline = 'Untreated blood pressure is a solvable problem' where key = 'control_bp';
