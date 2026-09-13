"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import clsx from "clsx";
import type { LeagueMatch, Team } from "@/lib/core/models";
import { TeamLogo } from "@/components/teams/TeamLogo";
import {
  getTeamReadableScoreTextColor,
  getTeamThemeTextColor,
  getTeamVictoryTextColor,
  getTeamWinnerAccentColor,
  getTeamWinnerColor
} from "@/lib/core/color";

type StageMatchRowProps = {
  match: LeagueMatch;
  teamsById: Map<string, Team>;
  requireWinner?: boolean;
  allowDraw?: boolean;
  onSave: (matchId: string, scoreA?: number, scoreB?: number, winnerId?: string) => void;
};

export function StageMatchRow({ match, teamsById, requireWinner, allowDraw = true, onSave }: StageMatchRowProps) {
  const [scoreA, setScoreA] = useState<number | undefined>(match.scoreA);
  const [scoreB, setScoreB] = useState<number | undefined>(match.scoreB);
  const teamA = match.teamAId ? teamsById.get(match.teamAId) : undefined;
  const teamB = match.teamBId ? teamsById.get(match.teamBId) : undefined;
  const hasBothTeams = Boolean(teamA?.id && teamB?.id);

  useEffect(() => {
    setScoreA(match.scoreA);
    setScoreB(match.scoreB);
  }, [match.scoreA, match.scoreB]);

  if (match.isBye) {
    return (
      <div className="grid gap-3 rounded-md border border-lime/40 bg-lime/10 p-3 text-sm text-lime md:grid-cols-[90px_1fr]">
        <div className="font-black uppercase tracking-wide">Round {match.round}</div>
        <div className="font-bold">{teamA?.shortName || teamA?.name || "誘몄젙"} BYE</div>
      </div>
    );
  }

  const updateScore = (slot: "A" | "B", value?: number) => {
    const nextScoreA = slot === "A" ? value : scoreA;
    const nextScoreB = slot === "B" ? value : scoreB;

    setScoreA(nextScoreA);
    setScoreB(nextScoreB);

    if (!hasBothTeams || nextScoreA === undefined || nextScoreB === undefined) return;

    if (nextScoreA === nextScoreB) {
      if (allowDraw) onSave(match.id, nextScoreA, nextScoreB, undefined);
      return;
    }

    const winnerId = nextScoreA > nextScoreB ? teamA?.id : teamB?.id;
    if (winnerId) onSave(match.id, nextScoreA, nextScoreB, winnerId);
  };

  const winnerId =
    scoreA === undefined || scoreB === undefined || scoreA === scoreB
      ? match.winnerId
      : scoreA > scoreB
        ? teamA?.id
        : teamB?.id;
  const statusText = !hasBothTeams
    ? "팀 확정 대기"
    : scoreA === scoreB && scoreA !== undefined
      ? allowDraw
        ? "무승부 자동 반영"
        : "동점은 승자 미확정"
      : "점수 입력 시 자동 반영";

  return (
    <div className={clsx("grid gap-3 rounded-md border bg-panel p-3 md:grid-cols-[84px_1fr]", match.status === "complete" ? "border-cyan" : "border-line")}>
      <div>
        <div className="text-xs font-black uppercase tracking-wide text-magenta">Round {match.round}</div>
        <div className="text-sm font-bold text-slate-400">Match {match.matchNumber}</div>
        {requireWinner ? <div className="mt-1 text-[10px] font-bold text-slate-500">{statusText}</div> : null}
      </div>

      <div className="grid gap-1">
        <TeamLine team={teamA} score={scoreA} active={winnerId === teamA?.id} onScoreChange={(value) => updateScore("A", value)} />
        <TeamLine team={teamB} score={scoreB} active={winnerId === teamB?.id} onScoreChange={(value) => updateScore("B", value)} />
      </div>
    </div>
  );
}

function TeamLine({
  team,
  score,
  active,
  onScoreChange
}: {
  team?: Team;
  score?: number;
  active?: boolean;
  onScoreChange: (score?: number) => void;
}) {
  const rowStyle = getTeamWinnerRowStyle(team, active);
  const scoreStyle = active ? getWinnerScoreStyle(team) : undefined;
  const textStyle = getTeamTextStyle(team, active);
  const label = team?.shortName || team?.name || "미정";

  return (
    <div
      className={clsx(
        "grid min-h-10 grid-cols-[34px_1fr_48px] items-center border border-line bg-field transition",
        active && "border-cyan bg-cyan/10"
      )}
      style={rowStyle}
    >
      <div className="grid h-full place-items-center border-r border-line bg-arena/70">
        <TeamLogo team={team} size="sm" highlighted={active} useVictoryLogo={active} />
      </div>
      <div className="min-w-0 px-3" style={textStyle}>
        <div className="truncate text-sm font-black uppercase tracking-wide">{label}</div>
        {team?.shortName ? <div className="truncate text-xs" style={textStyle}>{team.name}</div> : null}
      </div>
      <input
        type="number"
        min={0}
        value={score ?? ""}
        onChange={(event) => onScoreChange(event.target.value === "" ? undefined : Number(event.target.value))}
        className={clsx(
          "h-full min-h-10 border-0 border-l border-line bg-panel px-1 text-center text-sm font-black text-ink outline-none focus:bg-cyan/10 focus:text-cyan",
          active && "bg-cyan text-arena focus:bg-cyan focus:text-arena"
        )}
        style={scoreStyle}
        aria-label={`${label} score`}
      />
    </div>
  );
}

function getTeamWinnerRowStyle(team?: Team, active?: boolean): CSSProperties | undefined {
  if (!active || !team) return undefined;
  const primary = getTeamWinnerColor(team) ?? team.primaryColor ?? "hsl(var(--cyan))";
  const stripColor = getTeamWinnerAccentColor(team) ?? primary;

  return {
    borderColor: primary,
    background: primary,
    boxShadow: `0 0 30px ${mix(primary, 56)}, inset 0 0 0 1px ${mix(primary, 86)}, inset 5px 0 0 ${stripColor}`
  };
}

function getWinnerScoreStyle(team?: Team): CSSProperties | undefined {
  const primary = getTeamWinnerColor(team);
  if (!primary) return undefined;
  return {
    background: primary,
    color: getTeamReadableScoreTextColor(team),
    borderColor: "transparent"
  };
}

function getTeamTextStyle(team?: Team, active?: boolean): CSSProperties | undefined {
  const color = active ? getTeamVictoryTextColor(team) || getTeamThemeTextColor(team) : getTeamThemeTextColor(team);
  return color ? { color } : undefined;
}

function mix(color: string, amount: number) {
  return `color-mix(in srgb, ${color} ${amount}%, transparent)`;
}
