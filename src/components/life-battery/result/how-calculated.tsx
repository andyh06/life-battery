import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Short version for the result page. The full, unsoftened version lives at /methodology. */
export function HowCalculated() {
  return (
    <Card className="w-full border-none bg-surface">
      <CardHeader>
        <CardTitle className="text-xl font-bold tracking-tight">How this was calculated</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
        <p>
          We start from the official life table for your state, age, and sex (CDC/NCHS and SSA data)
          - the real, published probability of dying at each age. Each answer you gave carries a
          hazard ratio from a published study: a multiplier on that risk. We multiply your hazard
          ratios together, apply the result to every year of the table from your current age forward,
          and walk it forward to get your remaining years.
        </p>
        <p>
          Every hazard ratio links to the study it came from, and the honest limitations - what this
          model can and can&apos;t tell you - are laid out in full.
        </p>
        <Link href="/methodology" className="font-medium text-brand hover:underline">
          Read the full methodology →
        </Link>
      </CardContent>
    </Card>
  );
}
