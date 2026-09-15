"use client";

import type { LeagueStanding, Team } from "@/lib/core/models";
import { LeagueStandingsTable } from "@/components/tournament/LeagueStandingsTable";

type WildcardTableProps = {
  standings: LeagueStanding[];
  teamsById: Map<string, Team>;
  wildcardCount: number;
};

export function WildcardTable({ standings, teamsById, wildcardCount }: WildcardTableProps) {
  if (wildcardCount <= 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black uppercase text-ink">와일드카드</h3>
        <span className="rounded-md border border-gold/40 px-2 py-1 text-xs font-black text-gold">
          {wildcardCount}팀 추가 진출
        </span>
      </div>
      <LeagueStandingsTable standings={standings} teamsById={teamsById} advanceCount={wildcardCount} />
    </section>
  );
}
