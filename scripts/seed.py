#!/usr/bin/env python3
"""
Life Battery — data pipeline.

Downloads public datasets from official US government sources, transforms them,
and loads them into Supabase.

Usage:
    pip install requests pandas python-dotenv openpyxl
    python scripts/seed.py --list
    python scripts/seed.py --only state_life_tables
    python scripts/seed.py --all

Requires a .env.local in the project root containing:
    NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_SECRET_KEY=sb_secret_...

The SECRET key is required because row-level security blocks inserts with the
publishable key by design. It is read only by this script, which runs on your
machine. It must never be committed and must never get a NEXT_PUBLIC_ prefix.
"""

import argparse
import io
import os
import sys
import zipfile

import requests

try:
    import pandas as pd
except ImportError:
    sys.exit("pandas is required:  pip install pandas requests python-dotenv openpyxl")


# --------------------------------------------------------------------------
# Supabase REST helpers
# --------------------------------------------------------------------------

def load_env(path=".env.local"):
    env = {}
    if not os.path.exists(path):
        sys.exit(f"Missing {path}. See the docstring at the top of this file.")
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


ENV = load_env()
BASE = ENV.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SECRET = ENV.get("SUPABASE_SECRET_KEY") or ENV.get("SUPABASE_SERVICE_ROLE_KEY")

if not BASE or not SECRET:
    sys.exit("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local")

HEADERS = {
    "apikey": SECRET,
    "Authorization": f"Bearer {SECRET}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=minimal",
}


def upsert(table, rows, chunk=1000):
    """Insert rows into a Supabase table, chunked so requests stay small."""
    rows = [r for r in rows if r is not None]
    if not rows:
        print(f"  {table}: nothing to load")
        return
    total = 0
    for i in range(0, len(rows), chunk):
        batch = rows[i:i + chunk]
        r = requests.post(f"{BASE}/rest/v1/{table}", headers=HEADERS, json=batch, timeout=120)
        if r.status_code >= 300:
            print(f"  {table}: FAILED at row {i} -> {r.status_code} {r.text[:400]}")
            return
        total += len(batch)
        print(f"  {table}: {total}/{len(rows)}", end="\r")
    print(f"  {table}: {total} rows loaded          ")


def fetch(url, **kw):
    r = requests.get(url, timeout=180, headers={"User-Agent": "life-battery-coursework/1.0"}, **kw)
    r.raise_for_status()
    return r


POSTAL_STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois",
    "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana",
    "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon",
    "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota",
    "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia",
    "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}

STATE_FIPS = {
    "Alabama": "01", "Alaska": "02", "Arizona": "04", "Arkansas": "05", "California": "06",
    "Colorado": "08", "Connecticut": "09", "Delaware": "10", "District of Columbia": "11",
    "Florida": "12", "Georgia": "13", "Hawaii": "15", "Idaho": "16", "Illinois": "17",
    "Indiana": "18", "Iowa": "19", "Kansas": "20", "Kentucky": "21", "Louisiana": "22",
    "Maine": "23", "Maryland": "24", "Massachusetts": "25", "Michigan": "26", "Minnesota": "27",
    "Mississippi": "28", "Missouri": "29", "Montana": "30", "Nebraska": "31", "Nevada": "32",
    "New Hampshire": "33", "New Jersey": "34", "New Mexico": "35", "New York": "36",
    "North Carolina": "37", "North Dakota": "38", "Ohio": "39", "Oklahoma": "40", "Oregon": "41",
    "Pennsylvania": "42", "Rhode Island": "44", "South Carolina": "45", "South Dakota": "46",
    "Tennessee": "47", "Texas": "48", "Utah": "49", "Vermont": "50", "Virginia": "51",
    "Washington": "53", "West Virginia": "54", "Wisconsin": "55", "Wyoming": "56",
}


# --------------------------------------------------------------------------
# Loaders. Each returns nothing; each prints what it did.
#
# NOTE FOR CLAUDE CODE: the URLs below are the official landing points for each
# dataset. Government sites reorganize often. If a request 404s, find the
# current file on the linked page, update the URL, and adjust the column names
# to match what actually downloads. Print df.columns before mapping.
# --------------------------------------------------------------------------

def load_state_life_tables():
    """
    NCHS U.S. State Life Tables, 2020 (NVSR 71-02) — complete qx/lx/ex for
    every age 0-100, by state and sex.
    Landing page: https://www.cdc.gov/nchs/products/life_tables.htm
    Data files:   https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/NVSR/71-02/
                  <postal><1|2|3>.xlsx per state: 1 = total, 2 = male, 3 = female
                  (a 4th file per state holds standard errors; not loaded).

    The original URL in this loader (USALEEP tract-level CSV) 404s/doesn't match
    what's needed here anyway — that dataset is census-tract e(0) only, no
    age/sex breakdown. The NVSR 71-02 FTP directory has the real per-state,
    per-age, per-sex tables as individual Excel files.

    ~51 areas x 3 sexes x 101 ages = ~15,000 rows.
    """
    YEAR = 2020
    BASE_URL = "https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/NVSR/71-02"
    SEX_TABLES = {1: "all", 2: "male", 3: "female"}
    SOURCE_ID = "nchs_state_life_table_2020"

    print(f"state_life_tables: downloading NCHS per-state life tables ({YEAR}, "
          f"{len(POSTAL_STATE_NAMES)} areas x 3 sexes)...")

    rows = []
    for i, (postal, name) in enumerate(POSTAL_STATE_NAMES.items(), 1):
        fips = STATE_FIPS[name]
        for table_num, sex in SEX_TABLES.items():
            url = f"{BASE_URL}/{postal}{table_num}.xlsx"
            df = pd.read_excel(io.BytesIO(fetch(url).content), header=None)
            # Rows 0-2 are title/header/subheader; rows 3-103 are ages 0..100
            # ("100 and over" is the terminal open-ended group); the last row
            # is a "SOURCE:" footnote. Columns: label, qx, lx, dx, Lx, Tx, ex.
            data = df.iloc[3:104].reset_index(drop=True)
            for age, r in data.iterrows():
                rows.append({
                    "state_fips": fips,
                    "sex": sex,
                    "age": int(age),
                    "qx": float(r[1]),
                    "lx": float(r[2]),
                    "ex": float(r[6]),
                    "year": YEAR,
                    "source_id": SOURCE_ID,
                })
        print(f"  {i}/{len(POSTAL_STATE_NAMES)} areas fetched", end="\r")
    print()
    upsert("state_life_table", rows)


def load_leading_causes():
    """
    NCHS Leading Causes of Death, by state and cause, 1999-2017.
    Socrata dataset bi63-dtpu on data.cdc.gov.
    Powers: "for a 34-year-old man in NC, the top three risks are..."

    Columns as downloaded: year, _113_cause_name (long name + ICD-10 codes),
    cause_name (short label), state (full name, plus a "United States"
    aggregate row), deaths, aadr (age-adjusted death rate per 100,000).
    """
    URL = "https://data.cdc.gov/resource/bi63-dtpu.csv?$limit=50000"
    print("leading_causes: downloading CDC mortality data...")
    df = pd.read_csv(io.BytesIO(fetch(URL).content))
    print(f"  {len(df)} rows retrieved")

    SOURCE_ID = "nchs_leading_causes"
    rows = []
    for _, r in df.iterrows():
        fips = STATE_FIPS.get(r["state"])
        if not fips:
            continue  # drops the "United States" national aggregate row
        rows.append({
            "state_fips": fips,
            "cause_name": r["cause_name"],
            "cause_detail": r["_113_cause_name"],
            "year": int(r["year"]),
            "deaths": int(r["deaths"]),
            "aadr": float(r["aadr"]) if pd.notna(r["aadr"]) else None,
            "source_id": SOURCE_ID,
        })
    upsert("leading_causes", rows)


def load_county_health():
    """
    County Health Rankings & Roadmaps, 2024 release — ~3,100 counties, ~85
    measures each ("raw value" + CI + flag + race-stratified sub-columns for
    each; 770 columns total).
    Landing page: https://www.countyhealthrankings.org/health-data
    Loads: adult smoking, obesity, physical inactivity, excessive drinking,
    air pollution (PM2.5), drinking water violations, income inequality,
    premature death rate.

    The file's header spans two rows: row 0 (human-readable label, e.g.
    "Adult Smoking raw value") is what pandas uses as the column name; row 1
    is the machine variable name (e.g. "v009_rawvalue") and must be skipped
    or it becomes a bogus first data row.

    Rows with County FIPS Code == 0 are state-level or national ("United
    States") rollups, not counties — excluded from both tables here.
    """
    URL = ("https://www.countyhealthrankings.org/sites/default/files/media/document/"
           "analytic_data2024.csv")
    print("county_health: downloading County Health Rankings...")
    df = pd.read_csv(io.BytesIO(fetch(URL).content), low_memory=False, skiprows=[1])
    print(f"  {len(df)} areas (incl. state/national rollups)")

    YEAR = 2024
    MEASURES = {
        "Adult Smoking raw value": "adult_smoking",
        "Adult Obesity raw value": "adult_obesity",
        "Physical Inactivity raw value": "physical_inactivity",
        "Excessive Drinking raw value": "excessive_drinking",
        "Air Pollution - Particulate Matter raw value": "pm25_county",
        "Drinking Water Violations raw value": "water_violations_pct",
        "Income Inequality raw value": "income_inequality",
        "Premature Death raw value": "premature_death",
    }

    counties = df[df["County FIPS Code"] != 0]
    county_rows = []
    indicator_rows = []
    for _, r in counties.iterrows():
        fips = f'{int(r["5-digit FIPS Code"]):05d}'
        county_rows.append({
            "fips": fips,
            "state_fips": f'{int(r["State FIPS Code"]):02d}',
            "name": r["Name"],
        })
        for col, key in MEASURES.items():
            value = r[col]
            if pd.notna(value):
                indicator_rows.append({
                    "county_fips": fips,
                    "indicator_key": key,
                    "value": round(float(value), 4),
                    "year": YEAR,
                })

    print(f"  {len(county_rows)} counties, {len(indicator_rows)} indicator rows")
    upsert("counties", county_rows)
    upsert("county_indicators", indicator_rows)


def load_epa_air():
    """
    EPA Air Quality System — annual PM2.5 concentration by monitor, rolled up
    to state means. Fills state_indicators.pm25_annual.
    Landing page: https://aqs.epa.gov/aqsweb/airdata/download_files.html
    """
    YEAR = 2023
    URL = f"https://aqs.epa.gov/aqsweb/airdata/annual_conc_by_monitor_{YEAR}.zip"
    print(f"epa_air: downloading EPA annual concentration data for {YEAR}...")
    z = zipfile.ZipFile(io.BytesIO(fetch(URL).content))
    name = z.namelist()[0]
    df = pd.read_csv(z.open(name), low_memory=False)

    pm = df[(df["Parameter Name"] == "PM2.5 - Local Conditions") &
            (df["Sample Duration"] == "24 HOUR")]
    grouped = pm.groupby("State Name")["Arithmetic Mean"].mean()

    rows = []
    for state, value in grouped.items():
        fips = STATE_FIPS.get(state)
        if fips:
            rows.append({
                "state_fips": fips,
                "indicator_key": "pm25_annual",
                "value": round(float(value), 2),
                "year": YEAR,
            })
    upsert("state_indicators", rows)


def load_epa_water():
    """
    EPA Safe Drinking Water Information System — health-based violations.
    Landing page: https://echo.epa.gov/tools/data-downloads

    The bulk download at that landing page (SDWA_latest_downloads.zip) merged
    VIOLATIONS with ENFORCEMENT into one ~4.1GB CSV (SDWA_VIOLATIONS_ENFORCEMENT.csv)
    with a row per violation x enforcement-action, plus a separate ~129MB
    PUB_WATER_SYSTEMS.csv needed just to find each system's state — too heavy
    to fetch and join here.

    Uses the EPA Envirofacts REST API instead (same underlying SDWIS data),
    whose VIOLATION table denormalizes PRIMACY_AGENCY_CODE and
    POPULATION_SERVED_COUNT directly onto each violation row, so a per-state
    query needs no join and no bulk download:
    https://enviro.epa.gov/enviro/ef_metadata_html.ef_metadata_table?p_table_name=VIOLATION&p_topic=SDWIS

    Fills state_indicators.water_violations = number of people currently
    served by a public water system with an unresolved health-based
    violation (COMPLIANCE_STATUS_CODE 'K' or 'O' <=> RTC_DATE is null, i.e.
    not yet returned to compliance — confirmed by sampling), deduplicated by
    PWSID so a system with several concurrent violations counts once.

    This is a live snapshot (not a fixed reporting year), and it is a count
    of people affected, not "per 100k" — SDWIS doesn't carry total state
    population, and no population dataset is loaded elsewhere in this schema
    to normalize against without inventing a second data source.
    """
    EF = "https://data.epa.gov/efservice"
    SNAPSHOT_YEAR = 2026
    print("epa_water: querying EPA Envirofacts SDWIS (VIOLATION table) per state...")

    rows = []
    for i, (postal, name) in enumerate(POSTAL_STATE_NAMES.items(), 1):
        fips = STATE_FIPS[name]
        systems = {}
        for code in ("K", "O"):
            url = (f"{EF}/VIOLATION/PRIMACY_AGENCY_CODE/{postal}"
                   f"/IS_HEALTH_BASED_IND/Y/COMPLIANCE_STATUS_CODE/{code}/JSON")
            for r in fetch(url).json():
                systems[r["pwsid"]] = r.get("population_served_count") or 0
        rows.append({
            "state_fips": fips,
            "indicator_key": "water_violations",
            "value": sum(systems.values()),
            "year": SNAPSHOT_YEAR,
        })
        print(f"  {i}/{len(POSTAL_STATE_NAMES)} states queried", end="\r")
    print()
    upsert("state_indicators", rows)


LOADERS = {
    "state_life_tables": load_state_life_tables,
    "leading_causes": load_leading_causes,
    "county_health": load_county_health,
    "epa_air": load_epa_air,
    "epa_water": load_epa_water,
}


def main():
    p = argparse.ArgumentParser(description="Load Life Battery reference data into Supabase.")
    p.add_argument("--only", help="run a single loader")
    p.add_argument("--all", action="store_true", help="run every loader")
    p.add_argument("--list", action="store_true", help="list available loaders")
    args = p.parse_args()

    if args.list or (not args.only and not args.all):
        print("Available loaders:\n")
        for k, fn in LOADERS.items():
            first = (fn.__doc__ or "").strip().splitlines()[0]
            print(f"  {k:22s} {first}")
        print("\nRun one:   python scripts/seed.py --only epa_air")
        return

    todo = [args.only] if args.only else list(LOADERS)
    for key in todo:
        if key not in LOADERS:
            print(f"Unknown loader: {key}")
            continue
        print(f"\n=== {key} ===")
        try:
            LOADERS[key]()
        except SystemExit as e:
            print(f"  stopped: {e}")
        except Exception as e:
            print(f"  error: {type(e).__name__}: {e}")


if __name__ == "__main__":
    main()
