"use client";

import type { Tier } from "./types";

interface ModeSelectScreenProps {
  quickCount: number;
  advancedCount: number;
  onSelect: (tier: Tier) => void;
}

export function ModeSelectScreen({ quickCount, advancedCount, onSelect }: ModeSelectScreenProps) {
  return (
    <div className="flex w-full max-w-6xl flex-col gap-12 px-6">
      <h2 className="text-[clamp(2.5rem,7vw,5rem)] leading-none font-extrabold tracking-tight">
        How thorough?
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ModeCard
          title="Quick"
          description={`${quickCount} questions. State, age, body, and four habits.`}
          graphic={<QuickGraphic />}
          onClick={() => onSelect("quick")}
        />
        <ModeCard
          title="Advanced"
          description={`${advancedCount} questions. Adds income, diet and clinical history — a noticeably better estimate.`}
          graphic={<AdvancedGraphic />}
          onClick={() => onSelect("advanced")}
        />
      </div>
    </div>
  );
}

interface ModeCardProps {
  title: string;
  description: string;
  graphic: React.ReactNode;
  onClick: () => void;
}

function ModeCard({ title, description, graphic, onClick }: ModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[22rem] flex-col items-start justify-between gap-10 rounded-md border border-border bg-surface p-10 text-left transition-[background-color,transform] duration-150 hover:-translate-y-1 hover:bg-brand focus-visible:-translate-y-1 focus-visible:bg-brand focus-visible:outline-none"
    >
      <div className="text-brand transition-colors group-hover:text-brand-foreground group-focus-visible:text-brand-foreground">
        {graphic}
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-5xl font-extrabold tracking-tight text-foreground transition-colors group-hover:text-brand-foreground group-focus-visible:text-brand-foreground">
          {title}
        </p>
        <p className="text-lg text-muted-foreground transition-colors group-hover:text-brand-foreground/80 group-focus-visible:text-brand-foreground/80">
          {description}
        </p>
      </div>
    </button>
  );
}

function QuickGraphic() {
  return (
    <svg width="72" height="72" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M26 4 10 26h10l-4 18 20-26H26l4-14Z" fill="currentColor" />
    </svg>
  );
}

function AdvancedGraphic() {
  return (
    <svg width="72" height="72" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="6" y="28" width="8" height="14" fill="currentColor" />
      <rect x="20" y="18" width="8" height="24" fill="currentColor" />
      <rect x="34" y="6" width="8" height="36" fill="currentColor" />
    </svg>
  );
}
