"use client";

import clsx from "clsx";
import type { SwissRecord, Team } from "@/lib/core/models";
import { TeamLogo } from "@/components/teams/TeamLogo";

type SwissStandingsTableProps = {
  records: SwissRecord[];
  teamsById: Map<string, Team>;
  advancingTeamIds?: string[];
};

export function SwissStandingsTable({
  records,
  teamsById,
  advancingTeamIds = []
}: SwissStandingsTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-panel">
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <thead className="bg-arena text-xs uppercase text-slate-400">
          <tr>
            {["팀", "상태", "경기", "승", "무", "패", "승점", "BYE", "상대", "선후공"].map((label) => (
              <th key={label} className="px-3 py-3 text-left font-black">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const team = teamsById.get(record.teamId);
            const isAdvancing = advancingTeamIds.includes(record.teamId) || record.status === "advanced";

            return (
              <tr
                key={record.teamId}
                className={clsx(
                  "border-t border-line text-ink",
                  isAdvancing && "bg-cyan/10",
                  record.status === "eliminated" && "bg-danger/10 text-slate-500"
                )}
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <TeamLogo team={team} size="sm" highlighted={isAdvancing} />
                    <div className="font-black uppercase">{team?.shortName || team?.name || "미정"}</div>
                  </div>
                </td>
                <td className="px-3 py-3 font-black uppercase">{record.status}</td>
                <td className="px-3 py-3">{record.played}</td>
                <td className="px-3 py-3">{record.wins}</td>
                <td className="px-3 py-3">{record.draws}</td>
                <td className="px-3 py-3">{record.losses}</td>
                <td className="px-3 py-3 font-black text-gold">{record.points}</td>
                <td className="px-3 py-3">{record.byeCount}</td>
                <td className="max-w-[180px] truncate px-3 py-3 text-slate-500">
                  {record.opponents.length ? record.opponents.join(", ") : "-"}
                </td>
                <td className="px-3 py-3 text-slate-500">{record.sideHistory?.join(" ") || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
