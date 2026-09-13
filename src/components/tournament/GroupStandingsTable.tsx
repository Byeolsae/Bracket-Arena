"use client";

import type { Group, LeagueStanding, Team } from "@/lib/core/models";
import { LeagueStandingsTable } from "@/components/tournament/LeagueStandingsTable";

type GroupStandingsTableProps = {
  group: Group;
  standings: LeagueStanding[];
  teamsById: Map<string, Team>;
  advanceCount: number;
};

export function GroupStandingsTable({
  group,
  standings,
  teamsById,
  advanceCount
}: GroupStandingsTableProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black uppercase text-ink">{group.name}</h3>
        <span className="rounded-md border border-cyan/40 px-2 py-1 text-xs font-black text-cyan">
          상위 {advanceCount}팀 진출
        </span>
      </div>
      <LeagueStandingsTable standings={standings} teamsById={teamsById} advanceCount={advanceCount} />
    </section>
  );
}
