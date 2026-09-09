import Link from "next/link";
import type { Metadata } from "next";
import { getRiskFactorLevels, getRiskFactors, getSources } from "@/lib/data";
import { HAZARD_CLAMP_MAX, HAZARD_CLAMP_MIN } from "@/lib/predict";

export const metadata: Metadata = {
  title: "Methodology — Life Battery",
};

/**
 * Full, unsoftened version of the "how this was calculated" summary on the
 * result screen. Every claim here has to survive scrutiny — this page
 * exists specifically so the limitations aren't buried in a tooltip.
 */
export default async function MethodologyPage() {
  const [riskFactors, levels, sources] = await Promise.all([
    getRiskFactors(),
    getRiskFactorLevels(),
    getSources(),
  ]);

  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const levelsByFactor = new Map<string, typeof levels>();
  for (const level of levels) {
    const list = levelsByFactor.get(level.riskFactorKey) ?? [];
    list.push(level);
    levelsByFactor.set(level.riskFactorKey, list);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-6 py-16">
      <div className="flex flex-col gap-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] leading-none font-extrabold tracking-tight">
          Methodology
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Every number on the result page traces back to something on this page. Read it before you
          trust the battery.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight">The calculation</h2>
        <div className="flex flex-col gap-3 text-muted-foreground">
          <p>
            The starting point is an official period life table for your state, age, and sex (CDC/NCHS
            and SSA data) — a real table of the probability of dying within each year of age, built
            from actual mortality records.
          </p>
          <p>
            Each answer you give carries a hazard ratio pulled from a published cohort study or
            meta-analysis: a multiplier on annual mortality risk relative to a reference group. A
            hazard ratio of 1.3 means that group died at 1.3x the rate of the reference group in that
            study, after statistical adjustment for other factors the study controlled for.
          </p>
          <p>
            Your hazard ratios are multiplied together into one combined multiplier, applied to every
            year of the life table from your current age forward, and the resulting year-by-year
            survival probabilities are summed (with the standard actuarial assumption that death
            within a year is uniformly distributed across it) to produce your remaining life
            expectancy.
          </p>
          <p>
            The combined multiplier is clamped to [{HAZARD_CLAMP_MIN}, {HAZARD_CLAMP_MAX}] — see
            Limitations below for why that clamp exists.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Limitations</h2>
        <ul className="flex flex-col gap-4 text-muted-foreground">
          <li className="border-l-2 border-brand pl-4">
            The baseline life tables (state, age, and sex mortality rates) are official published
            data — CDC/NCHS state life tables and the SSA actuarial life table. These are not modeled
            or estimated; they&apos;re direct tabulations of recorded deaths.
          </li>
          <li className="border-l-2 border-brand pl-4">
            The hazard ratios are drawn from published, peer-reviewed studies, but they were{" "}
            <strong className="text-foreground">not independently re-verified</strong> against each
            paper by re-deriving the number from raw data — they were transcribed from the papers&apos;
            reported estimates.
          </li>
          <li className="border-l-2 border-brand pl-4">
            Some intermediate answer options don&apos;t correspond to a group a study actually
            reported on — they&apos;re interpolated between two published endpoints to fill a gap in
            the response scale. Every interpolated row is marked in its citation note in the table
            below.
          </li>
          <li className="border-l-2 border-brand pl-4">
            The exercise question weights vigorous activity at double moderate activity when
            computing your minutes/week — that part is the standard guideline equivalence (150
            min/week moderate = 75 min/week vigorous). The 0.5x weight given to{" "}
            <strong className="text-foreground">light</strong> activity is not from a guideline —
            it&apos;s our own assumption. The official guidelines don&apos;t count light activity
            toward the target at all.
          </li>
          <li className="border-l-2 border-brand pl-4">
            Multiplying hazard ratios from <strong className="text-foreground">different</strong>{" "}
            studies, each with its own covariate adjustments and reference population, overstates the
            effect of combining those factors — a properly fitted model would estimate all of them
            jointly on one cohort, not multiply marginal effects from unrelated ones. The hazard clamp
            (capping the combined multiplier to [{HAZARD_CLAMP_MIN}, {HAZARD_CLAMP_MAX}]) exists
            specifically as a guard against this compounding producing an absurd number — it is a
            safety rail, not a claim that reality is capped there.
          </li>
          <li className="border-l-2 border-brand pl-4">
            A hazard ratio describes an average difference in death rates between two groups in a
            study population. It is <strong className="text-foreground">not</strong> a prediction
            about what will happen to you specifically.
          </li>
          <li className="border-l-2 border-brand pl-4">
            <strong className="text-foreground">What this model is good for:</strong> ranking which of
            your answers matter most, relative to each other.{" "}
            <strong className="text-foreground">What it is not good for:</strong> a precise number of
            years. Treat the battery percentage as a rough, directional estimate, not a forecast.
          </li>
          <li className="border-l-2 border-brand pl-4">
            The &quot;most common causes of death&quot; panel on the result page uses CDC/NCHS data
            that is reported by <strong className="text-foreground">state only</strong> — it has no
            age or sex breakdown. So that panel shows the leading causes for your whole state, all
            ages and both sexes, not anything matched to you. Age- and sex-stratified cause-of-death
            data exists in CDC WONDER and would be the natural next improvement here.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Every hazard ratio, and where it&apos;s from</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Factor</th>
                <th className="py-2 pr-4 font-medium">Level</th>
                <th className="py-2 pr-4 font-medium">Hazard ratio</th>
                <th className="py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {riskFactors.map((rf) =>
                (levelsByFactor.get(rf.key) ?? [])
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((level, i) => {
                    const source = level.sourceId ? sourceById.get(level.sourceId) : null;
                    return (
                      <tr key={`${rf.key}-${level.levelKey}-${level.appliesToSex}`} className="border-b border-border/50">
                        <td className="py-2 pr-4 align-top">{i === 0 ? rf.label : ""}</td>
                        <td className="py-2 pr-4 align-top">
                          {level.label}
                          {level.citationNote ? (
                            <p className="mt-1 text-xs text-muted-foreground italic">
                              {level.citationNote}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-2 pr-4 align-top font-mono tabular-nums">
                          {level.hazardRatio.toFixed(2)}
                        </td>
                        <td className="py-2 align-top">
                          {source ? (
                            source.url ? (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand hover:underline"
                              >
                                {source.name}
                              </a>
                            ) : (
                              source.name
                            )
                          ) : (
                            <span className="text-muted-foreground">Not independently cited</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Sources</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Dataset / study</th>
                <th className="py-2 pr-4 font-medium">Publisher</th>
                <th className="py-2 font-medium">Year</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id} className="border-b border-border/50">
                  <td className="py-2 pr-4 align-top">
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand hover:underline"
                      >
                        {source.name}
                      </a>
                    ) : (
                      source.name
                    )}
                    {source.notes ? (
                      <p className="mt-1 text-xs text-muted-foreground">{source.notes}</p>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4 align-top text-muted-foreground">{source.publisher}</td>
                  <td className="py-2 align-top text-muted-foreground">{source.year ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
