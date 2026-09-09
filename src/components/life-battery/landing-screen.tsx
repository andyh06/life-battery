"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Tier } from "./types";

interface LandingScreenProps {
  tier: Tier;
  quickCount: number;
  advancedCount: number;
  onTierChange: (tier: Tier) => void;
  onBegin: () => void;
}

export function LandingScreen({
  tier,
  quickCount,
  advancedCount,
  onTierChange,
  onBegin,
}: LandingScreenProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Life Battery</CardTitle>
        <CardDescription>Estimate how much life you&apos;ve got left in the tank.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="Questionnaire length" className="grid grid-cols-2 gap-2">
          <button
            type="button"
            role="radio"
            aria-checked={tier === "quick"}
            onClick={() => onTierChange("quick")}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors",
              tier === "quick"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:bg-muted"
            )}
          >
            <span className="font-medium">Quick</span>
            <span className="text-xs text-muted-foreground">{quickCount} questions</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={tier === "advanced"}
            onClick={() => onTierChange("advanced")}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors",
              tier === "advanced"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:bg-muted"
            )}
          >
            <span className="font-medium">Advanced</span>
            <span className="text-xs text-muted-foreground">{advancedCount} questions</span>
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {tier === "quick"
            ? `Quick: ${quickCount} questions, uses your state, age, sex and four lifestyle factors.`
            : `Advanced: ${advancedCount} questions, adds income, diet, clinical history and more.`}
        </p>
        <Button className="w-full" onClick={onBegin}>
          Begin
        </Button>
      </CardContent>
    </Card>
  );
}
