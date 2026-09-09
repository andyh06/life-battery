"use client";

import { Button } from "@/components/ui/button";

interface LandingScreenProps {
  onBegin: () => void;
}

export function LandingScreen({ onBegin }: LandingScreenProps) {
  return (
    <div className="flex w-full flex-col items-center gap-10 px-6 text-center">
      <h1 className="max-w-5xl text-[clamp(3rem,12vw,9rem)] leading-[0.92] font-extrabold tracking-tight text-balance">
        You&apos;re running on something. Let&apos;s find out how much.
      </h1>
      <Button
        size="lg"
        onClick={onBegin}
        className="h-14 px-10 text-lg font-semibold tracking-tight"
      >
        Begin
      </Button>
    </div>
  );
}
