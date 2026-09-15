"use client";

import clsx from "clsx";
import { useMemo } from "react";
import type { BattleRoyaleStanding, Team } from "@/lib/core/models";
import { rankBattleRoyaleStandings } from "@/lib/core/battleRoyale";
import { TeamLogo } from "@/components/teams/TeamLogo";

type BattleRoyaleStandingsTableProps = {
  standings: BattleRoyaleStanding[];
  teamsById: Map<string, Team>;
  advanceCount?: number;
  compact?: boolean;
  chickenCounts?: Map<string, number>;
};

export function BattleRoyaleStandingsTable({
  standings,
  teamsById,
  advanceCount = 0,
  compact = false,
  chickenCounts
}: BattleRoyaleStandingsTableProps) {
  const orderedStandings = useMemo(
    () => rankBattleRoyaleStandings(standings),
    [standings]
  );

  return (
    <div className="overflow-x-auto rounded-md border border-line bg-panel">
      <table className={clsx("w-full border-collapse text-sm", compact ? "min-w-[560px]" : "min-w-[820px]")}>
        <thead className="bg-arena text-xs uppercase text-slate-400">
          <tr>
            {["순위", "팀", "라운드", "순위점수", "킬점수", "총점"].map((label) => (
              <th key={label} className="px-3 py-3 text-left font-black">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orderedStandings.map((standing) => {
            const team = teamsById.get(standing.teamId);
            const isAdvancing = standing.rank <= advanceCount;
            return (
              <tr
                key={standing.teamId}
                className={clsx("border-t border-line text-ink", isAdvancing && "bg-cyan/10")}
              >
                <td className="px-3 py-3 font-black text-cyan">#{standing.rank}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <TeamLogo team={team} size="sm" highlighted={isAdvancing} />
                    <span className="font-black uppercase">{team?.shortName || team?.name || "미정"}</span>
                    <ChickenBadge count={chickenCounts?.get(standing.teamId) ?? 0} />
                  </div>
                </td>
                <td className="px-3 py-3">{standing.roundsPlayed}</td>
                <td className="px-3 py-3">{standing.placementPoints}</td>
                <td className="px-3 py-3">{standing.killPoints}</td>
                <td className="px-3 py-3 font-black text-gold">{standing.totalPoints}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ChickenBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="rounded border border-gold/50 bg-gold/10 px-1.5 py-0.5 text-[10px] font-black uppercase text-gold">
      치킨 {count}
    </span>
  );
}
