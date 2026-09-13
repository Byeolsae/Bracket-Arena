import clsx from "clsx";
import type { SwissRecord, Team } from "@/lib/core/models";
import { TeamLogo } from "@/components/teams/TeamLogo";

type SwissRecordsTableProps = {
  records: SwissRecord[];
  teamsById: Map<string, Team>;
  advancingTeamIds: string[];
};

export function SwissRecordsTable({
  records,
  teamsById,
  advancingTeamIds
}: SwissRecordsTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead className="bg-arena text-xs uppercase tracking-wide text-slate-400">
          <tr>
            {["팀", "상태", "경기", "승", "무", "패", "득실", "승점", "BYE"].map((label) => (
              <th key={label} className="px-3 py-3 text-left font-black">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const team = teamsById.get(record.teamId);
            const isAdvancing = advancingTeamIds.includes(record.teamId);

            return (
              <tr
                key={record.teamId}
                className={clsx(
                  "border-t border-line",
                  record.status === "eliminated" && "bg-danger/10 text-slate-500",
                  record.status === "advanced" && "bg-lime/10 text-ink",
                  record.status === "active" && !isAdvancing && "bg-panel text-ink",
                  isAdvancing && "bg-cyan/10 text-ink"
                )}
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <TeamLogo team={team} size="sm" highlighted={isAdvancing} />
                    <div className="font-black uppercase tracking-wide">
                      {team?.shortName || team?.name || "미정"}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 font-bold uppercase">{record.status}</td>
                <td className="px-3 py-3">{record.played}</td>
                <td className="px-3 py-3">{record.wins}</td>
                <td className="px-3 py-3">{record.draws}</td>
                <td className="px-3 py-3">{record.losses}</td>
                <td className="px-3 py-3">{record.goalDifference}</td>
                <td className="px-3 py-3 font-black text-gold">{record.points}</td>
                <td className="px-3 py-3">{record.byeCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
