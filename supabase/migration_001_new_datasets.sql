-- Life Battery — incremental migration for state_life_tables, leading_causes,
-- county_health, and epa_water. Run this in the Supabase SQL Editor.
-- (schema.sql and seed.sql have also been updated to include this, in case
-- you ever rebuild the database from scratch — but since epa_air already
-- loaded successfully, your project has the base schema already, so run
-- this incremental file instead of re-running the full schema.sql/seed.sql.)

-- ---------------------------------------------------------------
-- New tables
-- ---------------------------------------------------------------

create table state_life_table (
  state_fips char(2) references states(fips),
  sex        text     not null check (sex in ('all','male','female')),
  age        smallint not null check (age between 0 and 100),
  qx         numeric  not null,
  lx         numeric  not null,
  ex         numeric  not null,
  year       int      not null,
  source_id  text references sources(id),
  primary key (state_fips, sex, age, year)
);
create index on state_life_table (state_fips, sex, year);

create table leading_causes (
  state_fips   char(2) references states(fips),
  cause_name   text    not null,
  cause_detail text,
  year         int     not null,
  deaths       int     not null,
  aadr         numeric,
  source_id    text references sources(id),
  primary key (state_fips, cause_name, year)
);
create index on leading_causes (state_fips, year);

create table counties (
  fips       char(5) primary key,
  state_fips char(2) references states(fips),
  name       text not null
);

create table county_indicators (
  county_fips   char(5) references counties(fips),
  indicator_key text   references indicators(key),
  value         numeric,
  year          int not null,
  primary key (county_fips, indicator_key, year)
);
create index on county_indicators (indicator_key);

alter table state_life_table  enable row level security;
alter table leading_causes    enable row level security;
alter table counties          enable row level security;
alter table county_indicators enable row level security;

create policy "public read" on state_life_table  for select using (true);
create policy "public read" on leading_causes    for select using (true);
create policy "public read" on counties          for select using (true);
create policy "public read" on county_indicators for select using (true);

-- ---------------------------------------------------------------
-- New sources
-- ---------------------------------------------------------------

insert into sources (id, name, publisher, url, year, notes) values
  ('nchs_state_life_table_2020', 'U.S. State Life Tables, 2020 (NVSR 71-02)', 'CDC / National Center for Health Statistics', 'https://www.cdc.gov/nchs/data/nvsr/nvsr71/nvsr71-02.pdf', 2020, 'Complete per-age qx/lx/ex by state and sex, ages 0-100. Tables 1 (total), 2 (male), 3 (female) per state, from ftp.cdc.gov.'),
  ('nchs_leading_causes', 'NCHS Leading Causes of Death, 1999-2017', 'CDC / National Center for Health Statistics', 'https://data.cdc.gov/NCHS/NCHS-Leading-Causes-of-Death-United-States/bi63-dtpu', 2017, 'Deaths and age-adjusted death rate by state and cause.'),
  ('chr_2024', 'County Health Rankings & Roadmaps, 2024', 'University of Wisconsin Population Health Institute / Robert Wood Johnson Foundation', 'https://www.countyhealthrankings.org/health-data', 2024, 'County-level behavioral, environmental, and socioeconomic measures.');

-- Corrections to two source rows already in your database (epa_water's real
-- endpoint turned out to be Envirofacts, not the ECHO bulk download stub):
update sources set
  url = 'https://enviro.epa.gov/enviro/ef_metadata_html.ef_metadata_table?p_table_name=VIOLATION&p_topic=SDWIS',
  notes = 'Live snapshot: people served by a system with an unresolved health-based violation, by state.'
where id = 'epa_sdwis';

update sources set
  year = 2023,
  notes = 'Annual mean fine particulate concentration, state means of 24-hour monitor readings.'
where id = 'epa_aqs';

-- ---------------------------------------------------------------
-- New indicators (for county_indicators) + a correction to water_violations'
-- unit, which changed from an aspirational "per 100k people" to what the
-- data actually supports: a live count of people affected (see epa_water's
-- docstring in scripts/seed.py for why).
-- ---------------------------------------------------------------

update indicators set
  unit = 'people affected',
  description = 'People currently served by a public water system with an unresolved health-based violation.'
where key = 'water_violations';

insert into indicators (key, label, unit, description, higher_is_worse, source_id) values
  ('adult_smoking','Adult smoking','% of adults','Share of adults who are current smokers.',true,'chr_2024'),
  ('adult_obesity','Adult obesity','% of adults','Share of adults with BMI >= 30.',true,'chr_2024'),
  ('physical_inactivity','Physical inactivity','% of adults','Share of adults reporting no leisure-time physical activity.',true,'chr_2024'),
  ('excessive_drinking','Excessive drinking','% of adults','Share of adults reporting heavy or binge drinking.',true,'chr_2024'),
  ('pm25_county','Fine particulate matter (PM2.5), county','µg/m³','Average daily PM2.5 concentration, county estimate.',true,'chr_2024'),
  ('water_violations_pct','Drinking water violations (county)','% of population','Share of the county population served by a water system with a health-based violation.',true,'chr_2024'),
  ('income_inequality','Income inequality','ratio','Ratio of household income at the 80th percentile to the 20th percentile.',true,'chr_2024'),
  ('premature_death','Premature death rate','per 100k, age-adjusted','Years of potential life lost before age 75, per 100,000 population.',true,'chr_2024');
