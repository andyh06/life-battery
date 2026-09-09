-- Life Battery — slider inputs for continuous risk factors, plus a proper
-- height/weight capture for BMI. Run this in the Supabase SQL Editor.

-- ---------------------------------------------------------------
-- risk_factors: widen input_type, add slider metadata columns
-- ---------------------------------------------------------------

-- Drop whatever the input_type check constraint is actually named (found by
-- definition rather than a hardcoded name, since it was declared inline in
-- CREATE TABLE and Postgres's auto-generated name isn't guaranteed).
do $$
declare
  existing_constraint text;
begin
  select con.conname into existing_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'risk_factors'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%input_type%';

  if existing_constraint is not null then
    execute format('alter table risk_factors drop constraint %I', existing_constraint);
  end if;
end $$;

alter table risk_factors
  add constraint risk_factors_input_type_check
  check (input_type in ('choice', 'number', 'slider', 'height_weight'));

alter table risk_factors
  add column if not exists min_input numeric,
  add column if not exists max_input numeric,
  add column if not exists step      numeric,
  add column if not exists unit      text;

update risk_factors set input_type = 'slider', min_input = 0, max_input = 14,  step = 0.5, unit = 'hours'       where key = 'sleep';
update risk_factors set input_type = 'slider', min_input = 0, max_input = 16,  step = 1,   unit = 'hours'       where key = 'sedentary';
update risk_factors set input_type = 'slider', min_input = 0, max_input = 30,  step = 1,   unit = 'drinks/week' where key = 'alcohol';
update risk_factors set input_type = 'slider', min_input = 0, max_input = 500, step = 15,  unit = 'min/week'    where key = 'activity';
update risk_factors set input_type = 'height_weight', unit = 'BMI' where key = 'bmi';

-- ---------------------------------------------------------------
-- risk_factor_levels: these four factors' bands were seeded as plain
-- 'choice' options, so min_value/max_value were never populated (bounds
-- only mattered for the pre-existing 'number' type, i.e. bmi). Populating
-- them now — straight from what each level's own label already states —
-- so the existing [min_value, max_value) matching in
-- src/app/api/predict/route.ts works once these become continuous sliders.
-- No hazard ratios or research findings change, only these boundaries.
-- ---------------------------------------------------------------

update risk_factor_levels set min_value = null, max_value = 5    where risk_factor_key = 'sleep' and level_key = 'under5';
update risk_factor_levels set min_value = 5,    max_value = 7    where risk_factor_key = 'sleep' and level_key = 'five_six';
update risk_factor_levels set min_value = 7,    max_value = 9    where risk_factor_key = 'sleep' and level_key = 'seven_eight';
update risk_factor_levels set min_value = 9,    max_value = 10   where risk_factor_key = 'sleep' and level_key = 'nine';
update risk_factor_levels set min_value = 10,   max_value = null where risk_factor_key = 'sleep' and level_key = 'ten_plus';

update risk_factor_levels set min_value = null, max_value = 4    where risk_factor_key = 'sedentary' and level_key = 'under4';
update risk_factor_levels set min_value = 4,    max_value = 9    where risk_factor_key = 'sedentary' and level_key = 'four_eight';
update risk_factor_levels set min_value = 9,    max_value = null where risk_factor_key = 'sedentary' and level_key = 'eight_plus';

update risk_factor_levels set min_value = null, max_value = 1    where risk_factor_key = 'alcohol' and level_key = 'none';
update risk_factor_levels set min_value = 1,    max_value = 8    where risk_factor_key = 'alcohol' and level_key = 'light';
update risk_factor_levels set min_value = 8,    max_value = 15   where risk_factor_key = 'alcohol' and level_key = 'moderate';
update risk_factor_levels set min_value = 15,   max_value = 25   where risk_factor_key = 'alcohol' and level_key = 'heavy';
update risk_factor_levels set min_value = 25,   max_value = null where risk_factor_key = 'alcohol' and level_key = 'very_heavy';

update risk_factor_levels set min_value = null, max_value = 1    where risk_factor_key = 'activity' and level_key = 'none';
update risk_factor_levels set min_value = 1,    max_value = 150  where risk_factor_key = 'activity' and level_key = 'some';
update risk_factor_levels set min_value = 150,  max_value = 300  where risk_factor_key = 'activity' and level_key = 'guideline';
update risk_factor_levels set min_value = 300,  max_value = null where risk_factor_key = 'activity' and level_key = 'double';
