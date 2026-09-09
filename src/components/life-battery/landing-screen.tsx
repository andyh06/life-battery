"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Tier } from "./types";

interface LandingScreenProps {
  tier: Tier;
  onTierChange: (tier: Tier) => void;
  onBegin: () => void;
}

export function LandingScreen({ tier, onTierChange, onBegin }: LandingScreenProps) {
  return (
    <div className="relative w-full max-w-sm">
      <div className="absolute -top-10 right-0 flex items-center gap-2">
        <Label htmlFor="tier-toggle" className="text-xs text-muted-foreground">
          {tier === "advanced" ? "Advanced" : "Quick"}
        </Label>
        <Switch
          id="tier-toggle"
          checked={tier === "advanced"}
          onCheckedChange={(checked) => onTierChange(checked ? "advanced" : "quick")}
        />
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Life Battery</CardTitle>
          <CardDescription>
            Estimate how much life you&apos;ve got left in the tank.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={onBegin}>
            Begin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
