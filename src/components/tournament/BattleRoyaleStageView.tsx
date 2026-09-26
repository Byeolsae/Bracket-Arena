"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { TeamLogo } from "@/components/teams/TeamLogo";
import type { Team } from "@/lib/core/models";
import {
  calculateBattleRoyaleStandings, getBattleRoyalePlacementPoints, getBattleRoyaleScore,
  updateBattleRoyaleResult, type BattleRoyaleStage, type BattleRoyaleStanding
} from "@/lib/core/battleRoyale";

export function BattleRoyaleStageView({ stage, teams, onChange }: {
  stage: BattleRoyaleStage;
  teams: Team[];
  onChange: Dispatch<SetStateAction<BattleRoyaleStage | undefined>>;
}) {
  const [selectedLobby, setSelectedLobby] = useState(stage.lobbies[0].id);
  const lobby = stage.lobbies.find((item) => item.id === selectedLobby) ?? stage.lobbies[0];
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const standings = calculateBattleRoyaleStandings(stage);
  const teamLabel = (teamId: string) => {
    const team = teamsById.get(teamId);
    return <span className="flex items-center gap-2">{team ? <TeamLogo team={team} size="sm" /> : null}
      <span className="break-words">{team?.shortName || team?.name || teamId}</span></span>;
  };
  const renderStandings = (title: string, rows: BattleRoyaleStanding[]) => (
    <section className="min-w-0 space-y-2">
      <h3 className="text-base font-bold text-ink">{title}</h3>
      <div className="overflow-x-auto rounded border border-line">
        <table className="w-full text-sm tabular-nums">
          <thead className="bg-arena text-muted"><tr>{["순위", "팀", "경기", "순위점수", "킬점수", "총점"].map((label) =>
            <th key={label} className="whitespace-nowrap p-3 text-left">{label}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={row.teamId} className="border-t border-line bg-panel">
            <td className="p-3 text-cyan">{index + 1}</td><td className="min-w-28 p-3 font-bold">{teamLabel(row.teamId)}</td>
            <td className="p-3">{row.played}</td><td className="p-3">{row.placementPoints}</td>
            <td className="p-3">{row.killPoints}</td><td className="p-3 font-black text-gold">{row.totalPoints}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  );
  return <div className="space-y-6 text-ink">
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="배틀로얄 로비">
      {stage.lobbies.map((item) => <button key={item.id} type="button" role="tab"
        aria-selected={item.id === lobby.id} className={item.id === lobby.id ? "button-primary" : "button-muted"}
        onClick={() => setSelectedLobby(item.id)}>{item.name}</button>)}
    </div>
    <section className="space-y-2">
      <h2 className="text-lg font-black">{lobby.name} 경기 기록</h2>
      <div className="overflow-x-auto rounded border border-line">
        <table className="w-full border-collapse text-sm tabular-nums">
          <thead className="bg-arena text-muted"><tr><th rowSpan={2} className="sticky left-0 z-10 min-w-36 bg-arena p-3 text-left">팀</th>
            {lobby.matches.map((match, index) => <th key={match.id} className="border-l border-line p-2">{index + 1}경기</th>)}
          </tr><tr>{lobby.matches.map((match) => <th key={match.id} className="border-l border-line px-3 pb-2">
            <div className="grid min-w-[220px] grid-cols-[100px_60px_40px] gap-2 text-xs"><span>순위</span><span>킬</span><span>점수</span></div>
          </th>)}</tr></thead>
          <tbody>{lobby.teamIds.map((teamId) => <tr key={teamId} className="border-t border-line bg-panel">
            <th scope="row" className="sticky left-0 z-10 bg-panel p-3 text-left">{teamLabel(teamId)}</th>
            {lobby.matches.map((match, index) => {
              const result = match.results.find((item) => item.teamId === teamId)!;
              const label = `${teamsById.get(teamId)?.name || teamId} ${lobby.name} ${index + 1}경기`;
              return <td key={match.id} className="border-l border-line p-0">
                <div className={`grid min-w-[244px] grid-cols-[100px_60px_40px] items-center gap-2 p-3 ${result.placement === 1 ? "ring-1 ring-inset ring-lime" : ""}`}>
                  <select aria-label={`${label} 순위`} className="w-full rounded border border-line bg-field p-1.5 text-xs"
                    value={result.placement ?? ""} onChange={(event) => {
                      const placement = event.target.value === "" ? null : Number(event.target.value);
                      onChange((current) => current ? updateBattleRoyaleResult(current, lobby.id, match.id, teamId, { placement }) : current);
                    }}>
                    <option value="">-</option>
                    {lobby.teamIds.map((_, rank) => <option key={rank} value={rank + 1}
                      disabled={match.results.some((item) => item.teamId !== teamId && item.placement === rank + 1)}>
                      {rank + 1}위 ({getBattleRoyalePlacementPoints(rank + 1)}점)
                    </option>)}
                  </select>
                  <input aria-label={`${label} 킬`} type="number" min={0} step={1} value={result.kills}
                    className="w-full rounded border border-line bg-field p-1.5 text-center"
                    onChange={(event) => {
                      const kills = Number(event.target.value);
                      onChange((current) => current ? updateBattleRoyaleResult(current, lobby.id, match.id, teamId, { kills }) : current);
                    }} />
                  <output aria-label={`${label} 점수`} className="text-center font-black text-gold">{getBattleRoyaleScore(result).totalPoints}</output>
                </div>
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>
    </section>
    {renderStandings(`${lobby.name} 합산`, calculateBattleRoyaleStandings(stage, lobby.id))}
    {stage.role === "qualifier" ? <>
      <div className="grid gap-4 xl:grid-cols-3">{stage.groups.map((group) => <div key={group.name} className="min-w-0">
        {renderStandings(`${group.name}조 통합 점수`, standings.filter((row) => group.teamIds.includes(row.teamId)))}
      </div>)}</div>
      {renderStandings("AB · AC · BC 통합 점수", standings)}
    </> : null}
  </div>;
}
