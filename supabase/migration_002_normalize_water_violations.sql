-- Life Battery — normalize water_violations to a real per-100k rate.
-- Run this in the Supabase SQL Editor before re-running:
--   python scripts/seed.py --only epa_water

insert into sources (id, name, publisher, url, year, notes) values
  ('census_pep_2024', 'Population Estimates Program, Vintage 2024', 'U.S. Census Bureau', 'https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/state/totals/NST-EST2024-ALLDATA.csv', 2024, 'State population totals, used as the denominator for per-100k indicators.');

update sources set
  notes = 'Live snapshot: rate per 100k people served by a system with an unresolved health-based violation, by state. Normalized against census_pep_2024.'
where id = 'epa_sdwis';

update indicators set
  unit = 'per 100k people',
  description = 'Rate per 100,000 people currently served by a public water system with an unresolved health-based violation.'
where key = 'water_violations';
