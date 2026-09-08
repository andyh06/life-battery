<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project: Life Battery

An interactive web app that estimates a person's remaining life expectancy from
their age, sex, country, and a handful of lifestyle inputs, and displays the
result as a battery-style gauge ("you're at 68%").

This is a course assignment for DTSC 3601 (Homework 3). Homework 4 will extend it.

## Assignment requirements — do not break these

These are graded. Every change must keep all of them true:

1. The site is a Next.js app deployed on **Vercel**, connected to a **GitHub** repo.
2. UI is built with **shadcn/ui** components (not hand-rolled CSS, not another
   component library).
3. There is a **Supabase** schema with a real dataset loaded into it, and the app
   reads from it.
4. Deliverables are two URLs: the live Vercel URL and the GitHub repo URL.
5. Homework 4 will deploy a **model API** separately and call it from this app.
   So: keep the prediction logic behind a single module that can later be swapped
   to call an external API. Don't scatter the math through components.

## Tech stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- shadcn/ui (Base UI primitives, Nova preset)
- Supabase (Postgres) via `@supabase/supabase-js`
- Deployed on Vercel

## Data approach

Load datasets into Supabase **once** via a seed script. Do not scrape or hit
external APIs at request time — it's slow, fragile, and the assignment is
specifically about designing a Supabase schema.

Candidate sources (free, no key required):

- SSA Actuarial Life Table (US, by age + sex): https://www.ssa.gov/oact/STATS/table4c6.html
- WHO Global Health Observatory life expectancy by country: https://www.who.int/data/gho
- UN World Population Prospects life tables: https://population.un.org/wpp/

Store raw reference data in its own tables; keep derived lifestyle modifiers in a
separate table so the schema shows real design, not one flat CSV dump.

## Conventions

- `src/app/` — routes. `src/components/ui/` — shadcn components (generated, don't
  hand-edit unless necessary). `src/components/` — our own components.
- `src/lib/supabase.ts` — single Supabase client. No client creation elsewhere.
- `src/lib/predict.ts` — **all** life-expectancy math lives here, behind one
  exported function. HW4 replaces its body with a fetch to the model API.
- `supabase/schema.sql` — the schema, checked in.
- `scripts/seed.ts` — loads the datasets into Supabase.
- Env vars in `.env.local` (never committed): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Anything secret stays server-side only.

## Important framing

This is a fun, clearly-labeled estimate based on population statistics — not a
medical or health prediction about an individual. Keep the copy playful and put a
visible disclaimer on the result: actuarial averages, not advice. Do not present
it as a health assessment.

## Working style

- Deploy early and often. A broken deploy is worse than a missing feature.
- Prefer adding a shadcn component (`npx shadcn@latest add <name>`) over writing
  custom UI.
- Run `npm run build` before pushing — Vercel fails on TypeScript errors that
  `npm run dev` lets through.

## Status

- [x] Next.js + Tailwind + shadcn scaffolded
- [ ] Pushed to GitHub
- [ ] Deployed to Vercel (placeholder page)
- [ ] Supabase project created, schema designed
- [ ] Dataset loaded
- [ ] Prediction logic in `src/lib/predict.ts`
- [ ] Battery UI
- [ ] Final deploy + submit both URLs
