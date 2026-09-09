-- Life Battery — water_violations: relabel as a percent, add the SDWIS
-- reporting-intensity caveat, and mark it display-only so predict.ts (when
-- written) can't accidentally fold it into the mortality calculation.
-- Run this in the Supabase SQL Editor, then re-run:
--   python scripts/seed.py --only epa_water

alter table indicators
  add column if not exists include_in_model boolean not null default true;

update indicators set
  unit = '% of population served',
  description = 'Percent of the state''s population currently served by a public water system with an unresolved health-based violation. State primacy agencies vary in reporting intensity, so cross-state comparisons partly reflect enforcement practice rather than underlying water quality.',
  include_in_model = false
where key = 'water_violations';

update sources set
  notes = 'Live snapshot: percent of state population served by a system with an unresolved health-based violation. Normalized against census_pep_2024. Display-only — confounded by variation in state reporting/enforcement intensity.'
where id = 'epa_sdwis';
