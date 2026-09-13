"use client";

import type { Team } from "@/lib/core/models";
import { TeamLogo } from "@/components/teams/TeamLogo";

type PlacementPodiumProps = {
  champion?: Team;
  runnerUp?: Team;
  thirdPlace?: Team;
};

export function PlacementPodium({ champion, runnerUp, thirdPlace }: PlacementPodiumProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <PlacementSlot label="챔피언" team={champion} tone="gold" />
      <PlacementSlot label="러너업" team={runnerUp} tone="cyan" />
      <PlacementSlot label="3등" team={thirdPlace} tone="lime" />
    </div>
  );
}

function PlacementSlot({ label, team, tone }: { label: string; team?: Team; tone: "gold" | "cyan" | "lime" }) {
  const toneClass = {
    gold: "border-gold/50 bg-gold/10 text-gold",
    cyan: "border-cyan/50 bg-cyan/10 text-cyan",
    lime: "border-lime/50 bg-lime/10 text-lime"
  }[tone];

  return (
    <div className={`flex min-w-36 items-center gap-2 border px-3 py-2 ${toneClass}`}>
      <TeamLogo team={team} size="sm" highlighted={Boolean(team)} />
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-wide">{label}</div>
        <div className="truncate text-xs font-black uppercase text-ink">
          {team ? team.shortName || team.name : "미정"}
        </div>
      </div>
    </div>
  );
}
