"use client";

import clsx from "clsx";
import type { BattleRoyaleStanding, Team } from "@/lib/core/models";
import { TeamLogo } from "@/components/teams/TeamLogo";

type BattleRoyaleStandingsTableProps = {
  standings: BattleRoyaleStanding[];
  teamsById: Map<string, Team>;
  advanceCount?: number;
};

export function BattleRoyaleStandingsTable({
  standings,
  teamsById,
  advanceCount = 0
}: BattleRoyaleStandingsTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-panel">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead className="bg-arena text-xs uppercase text-slate-400">
          <tr>
            {["순위", "팀", "라운드", "순위점수", "킬점수", "보너스", "페널티", "총점"].map((label) => (
              <th key={label} className="px-3 py-3 text-left font-black">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.map((standing) => {
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
                  </div>
                </td>
                <td className="px-3 py-3">{standing.roundsPlayed}</td>
                <td className="px-3 py-3">{standing.placementPoints}</td>
                <td className="px-3 py-3">{standing.killPoints}</td>
                <td className="px-3 py-3">{standing.bonusPoints}</td>
                <td className="px-3 py-3">{standing.penaltyPoints}</td>
                <td className="px-3 py-3 font-black text-gold">{standing.totalPoints}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
