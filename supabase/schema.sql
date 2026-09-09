-- Life Battery — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query).

-- ---------------------------------------------------------------
-- Provenance: every number in this app can name where it came from.
-- ---------------------------------------------------------------
create table sources (
  id          text primary key,
  name        text not null,
  publisher   text,
  url         text,
  year        int,
  notes       text
);

-- ---------------------------------------------------------------
-- Geography
-- ---------------------------------------------------------------
create table states (
  fips   char(2) primary key,
  code   char(2) unique not null,
  name   text not null,
  region text
);

-- ---------------------------------------------------------------
-- Baseline mortality: national period life table (SSA)
-- qx = probability of dying within the year at age x
-- ex = expected remaining years at age x
-- ---------------------------------------------------------------
create table life_table (
  age       smallint not null check (age between 0 and 119),
  sex       text     not null check (sex in ('male','female')),
  qx        numeric  not null,
  lx        numeric  not null,
  ex        numeric  not null,
  source_id text references sources(id),
  primary key (age, sex)
);

-- State-level life expectancy at birth (CDC/NCHS state life tables).
-- Used as a ratio adjustment against the national baseline.
create table state_life_expectancy (
  state_fips      char(2) references states(fips),
  sex             text not null check (sex in ('male','female','all')),
  life_expectancy numeric not null,
  year            int not null,
  source_id       text references sources(id),
  primary key (state_fips, sex, year)
);

-- Full per-state, per-age, per-sex life table (CDC/NCHS NVSR 71-02, 2020).
-- Complements state_life_expectancy (which only has e(0) at birth) with the
-- actual age-specific curve, so a state adjustment can be applied at any age,
-- not just interpolated from a single birth value.
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

-- NCHS Leading Causes of Death, by state and cause, 1999-2017.
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

-- ---------------------------------------------------------------
-- Environmental / population health context per state
-- (air quality, drinking water violations, smoking rate, etc.)
-- ---------------------------------------------------------------
create table indicators (
  key               text primary key,
  label             text not null,
  unit              text,
  description       text,
  higher_is_worse   boolean not null default true,
  source_id         text references sources(id),
  -- Some indicators are shown for context but are too confounded by
  -- non-health factors (e.g. state reporting/enforcement intensity) to treat
  -- as a mortality input. predict.ts must filter on this before using an
  -- indicator's value in the model.
  include_in_model  boolean not null default true
);

create table state_indicators (
  state_fips    char(2) references states(fips),
  indicator_key text   references indicators(key),
  value         numeric,
  year          int not null,
  primary key (state_fips, indicator_key, year)
);

-- County Health Rankings & Roadmaps geography + measures. Counties get their
-- own indicators table (rather than reusing state_indicators) because the
-- CHR measures are computed at county grain with their own methodology —
-- e.g. water_violations_pct (% of population served, a CHR estimate) is a
-- different quantity from the state-level water_violations (a live SDWIS
-- count), even though both describe drinking water.
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

-- ---------------------------------------------------------------
-- Questionnaire, driven by data rather than hardcoded in the UI.
-- tier = 'quick' (rough estimate) or 'advanced' (full questionnaire)
-- ---------------------------------------------------------------
create table risk_factors (
  key        text primary key,
  label      text not null,
  question   text not null,
  help_text  text,
  category   text check (category in ('body','habits','environment','socioeconomic','clinical')),
  tier       text not null check (tier in ('quick','advanced')),
  input_type text not null check (input_type in ('choice','number')),
  sort_order int default 0
);

-- Each answer option carries a hazard ratio: the multiplier applied to
-- annual mortality risk. 1.0 = no effect, 1.5 = 50% higher risk.
create table risk_factor_levels (
  id              bigserial primary key,
  risk_factor_key text    references risk_factors(key) on delete cascade,
  level_key       text    not null,
  label           text    not null,
  hazard_ratio    numeric not null default 1.0 check (hazard_ratio > 0),
  applies_to_sex  text    not null default 'all' check (applies_to_sex in ('male','female','all')),
  min_value       numeric,
  max_value       numeric,
  source_id       text references sources(id),
  citation_note   text,
  sort_order      int default 0,
  unique (risk_factor_key, level_key)
);

-- ---------------------------------------------------------------
-- Log of estimates produced (gives the app a write path, and data
-- to visualize later)
-- ---------------------------------------------------------------
create table estimates (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  mode            text check (mode in ('quick','advanced')),
  state_fips      char(2) references states(fips),
  age             smallint,
  sex             text,
  inputs          jsonb,
  baseline_ex     numeric,
  adjusted_ex     numeric,
  battery_percent numeric
);

-- ---------------------------------------------------------------
-- "What you can still change" panel.
--
-- An intervention is defined as swapping one answer for a better one
-- (from_level -> to_level) and re-running the model. So years gained
-- is COMPUTED, never hardcoded: it falls out age-adjusted for free,
-- and a 25-year-old quitting smoking correctly gains more than a
-- 65-year-old doing the same. Only show a card when the user's
-- current answer matches from_level (NULL = show whenever the
-- current answer is worse than to_level).
-- ---------------------------------------------------------------
create table interventions (
  key             text primary key,
  label           text not null,   -- "Meet the activity guideline"
  detail          text,            -- "150 min/week moderate movement"
  category        text,
  risk_factor_key text not null references risk_factors(key) on delete cascade,
  from_level      text,
  to_level        text not null,
  evidence_note   text,            -- one-line finding from the study
  source_id       text references sources(id),
  sort_order      int default 0,
  active          boolean not null default true
);

create index on interventions (risk_factor_key);

-- ---------------------------------------------------------------
-- Mascot commentary. Data-driven so new jokes are INSERTs, not code.
--
-- A quip matches when its risk_factor_key matches the question just
-- answered AND either its level_key matches the chosen option, or the
-- numeric answer falls within [min_value, max_value]. NULL means
-- "any". Among all matches, the highest priority wins; ties are
-- broken randomly so repeat visitors see variety.
-- ---------------------------------------------------------------
create table mascot_quips (
  id              bigserial primary key,
  trigger         text not null check (trigger in ('intro','answer','result','idle')),
  risk_factor_key text references risk_factors(key) on delete cascade,
  level_key       text,
  min_value       numeric,
  max_value       numeric,
  min_percent     numeric,   -- for 'result' quips: battery percentage range
  max_percent     numeric,
  text            text not null,
  mood            text not null default 'neutral'
                  check (mood in ('neutral','snark','shock','approval','concern','proud')),
  priority        int  not null default 0,
  active          boolean not null default true
);

create index on mascot_quips (trigger, risk_factor_key);

create index on state_indicators (indicator_key);
create index on risk_factor_levels (risk_factor_key);
create index on estimates (created_at desc);

-- ---------------------------------------------------------------
-- Row Level Security
-- Reference data is public read-only. Estimates are insert-only.
-- ---------------------------------------------------------------
alter table sources               enable row level security;
alter table states                enable row level security;
alter table life_table            enable row level security;
alter table state_life_expectancy enable row level security;
alter table state_life_table       enable row level security;
alter table counties               enable row level security;
alter table county_indicators      enable row level security;
alter table leading_causes         enable row level security;
alter table indicators            enable row level security;
alter table state_indicators      enable row level security;
alter table risk_factors          enable row level security;
alter table risk_factor_levels    enable row level security;
alter table interventions         enable row level security;
alter table mascot_quips          enable row level security;
alter table estimates             enable row level security;

create policy "public read" on sources               for select using (true);
create policy "public read" on states                for select using (true);
create policy "public read" on life_table            for select using (true);
create policy "public read" on state_life_expectancy for select using (true);
create policy "public read" on state_life_table       for select using (true);
create policy "public read" on counties               for select using (true);
create policy "public read" on county_indicators      for select using (true);
create policy "public read" on leading_causes         for select using (true);
create policy "public read" on indicators            for select using (true);
create policy "public read" on state_indicators      for select using (true);
create policy "public read" on risk_factors          for select using (true);
create policy "public read" on risk_factor_levels    for select using (true);
create policy "public read" on interventions         for select using (active);
create policy "public read" on mascot_quips          for select using (active);

create policy "anyone can log an estimate" on estimates for insert with check (true);
