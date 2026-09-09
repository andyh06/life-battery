-- Life Battery - "Rarely" and "Occasionally" on the stress question read as
-- near-synonyms and Rarely had no tooltip to disambiguate. "Occasionally"'s
-- hazard ratio was itself interpolated (not from a cited study), so this
-- merges it into "Rarely" rather than inventing a description to prop up a
-- distinction the underlying data doesn't really support. Run in the
-- Supabase SQL Editor, then clear .next before testing locally.

delete from risk_factor_levels where risk_factor_key = 'stress' and level_key = 'occasionally';

update risk_factor_levels
set
  label = 'Rarely or never',
  description = 'Stress isn''t a regular presence in your week.'
where risk_factor_key = 'stress' and level_key = 'rarely';

-- "Most of the time" was also missing a tooltip, leaving the top of the
-- scale as ambiguous relative to "Frequently" as Rarely/Occasionally were.
update risk_factor_levels
set description = 'Under real pressure most days, most weeks.'
where risk_factor_key = 'stress' and level_key = 'often';
