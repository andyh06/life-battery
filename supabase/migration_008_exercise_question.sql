-- Life Battery - the "activity" risk factor is the exercise question but
-- didn't read like one. Run in the Supabase SQL Editor, then clear .next
-- before testing locally.
--
-- Only the label/question/help_text change here. min_input/max_input/step/
-- unit/input_type all stay exactly as they are (0-500 min/week) - the app
-- now computes that number from days/week x minutes/session x an intensity
-- weight instead of asking for it directly, but the stored value and every
-- risk_factor_levels band are untouched.

update risk_factors
set
  label = 'Exercise',
  question = 'How much do you exercise?',
  help_text = 'Vigorous activity counts double toward the total - 150 min/week of moderate activity is the same guideline dose as 75 min/week vigorous.'
where key = 'activity';
