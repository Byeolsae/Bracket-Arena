import clsx from "clsx";
import type { LeagueStanding, Team } from "@/lib/core/models";
import { TeamLogo } from "@/components/teams/TeamLogo";

type LeagueStandingsTableProps = {
  standings: LeagueStanding[];
  teamsById: Map<string, Team>;
  advanceCount: number;
};

const columns = ["순위", "팀", "경기", "승", "무", "패", "득점", "실점", "득실", "승점"];

export function LeagueStandingsTable({ standings, teamsById, advanceCount }: LeagueStandingsTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead className="bg-arena text-xs uppercase tracking-wide text-slate-400">
          <tr>
            {columns.map((label) => (
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
              <tr key={standing.teamId} className={clsx("border-t border-line", isAdvancing ? "bg-cyan/10 text-ink" : "bg-panel text-ink")}>
                <td className="px-3 py-3 font-black text-cyan">#{standing.rank}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <TeamLogo team={team} size="sm" highlighted={isAdvancing} />
                    <div>
                      <div className="font-black uppercase tracking-wide">{team?.shortName || team?.name || "미정"}</div>
                      {team?.shortName ? <div className="text-xs text-slate-500">{team.name}</div> : null}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">{standing.played}</td>
                <td className="px-3 py-3">{standing.wins}</td>
                <td className="px-3 py-3">{standing.draws}</td>
                <td className="px-3 py-3">{standing.losses}</td>
                <td className="px-3 py-3">{standing.goalsFor}</td>
                <td className="px-3 py-3">{standing.goalsAgainst}</td>
                <td className="px-3 py-3">{standing.goalDifference}</td>
                <td className="px-3 py-3 font-black text-gold">{standing.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
