"use client";

import clsx from "clsx";
import { TeamLogo } from "@/components/teams/TeamLogo";
import type { Team } from "@/lib/core/models";

export type PlacementSummaryEntry = {
  label: string;
  team: Team;
  description?: string;
  tone?: "gold" | "silver" | "bronze" | "seed" | "rank";
};

type PlacementSummaryProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  entries: PlacementSummaryEntry[];
  variant?: "seed" | "final";
};

const toneClass: Record<NonNullable<PlacementSummaryEntry["tone"]>, string> = {
  gold: "placement-summary-gold",
  silver: "placement-summary-silver",
  bronze: "placement-summary-bronze",
  seed: "placement-summary-seed",
  rank: "placement-summary-rank"
};

export function PlacementSummary({ eyebrow, title, subtitle, entries, variant = "final" }: PlacementSummaryProps) {
  if (entries.length === 0) return null;

  return (
    <section className="arena-card p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">{eyebrow ?? (variant === "seed" ? "SEEDING" : "RESULT")}</p>
          <h3 className="text-lg font-black text-ink">{title}</h3>
        </div>
        {subtitle ? <p className="text-xs font-bold text-muted">{subtitle}</p> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => {
          const tone = entry.tone ?? (variant === "seed" ? "seed" : "rank");
          return (
            <div
              key={`${entry.label}-${entry.team.id}`}
              className={clsx(
                "placement-summary-card flex min-h-16 items-center gap-3 rounded-md border px-3 py-2",
                toneClass[tone]
              )}
            >
              <div className="min-w-12 text-sm font-black uppercase tracking-[0.18em]">{entry.label}</div>
              <TeamLogo team={entry.team} size="sm" highlighted={tone === "gold"} />
              <div className="min-w-0">
                <div className="truncate text-sm font-black">{entry.team.shortName || entry.team.name}</div>
                <div className="placement-summary-description truncate text-xs font-bold">
                  {entry.description ?? entry.team.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
