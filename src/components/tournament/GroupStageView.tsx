"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Dices } from "lucide-react";
import type { GroupStage, LeagueStanding, Team } from "@/lib/core/models";
import { applyGroupMatchResult, calculateGroupStandings } from "@/lib/core/group";
import {
  getTeamReadableScoreTextColor,
  getTeamThemePrimaryColor,
  getTeamThemeTextColor,
  getTeamVictoryTextColor,
  getTeamWinnerColor
} from "@/lib/core/color";
import { createRandomHeadToHeadScore } from "@/lib/core/randomResults";
import { rankStandings } from "@/lib/core/ranking";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { GroupStandingsTable } from "@/components/tournament/GroupStandingsTable";
import { WildcardTable } from "@/components/tournament/WildcardTable";

type GroupStageViewProps = {
  stage: GroupStage;
  teams: Team[];
  onChange?: (stage: GroupStage) => void;
};

export function GroupStageView({ stage, teams, onChange }: GroupStageViewProps) {
  const [localStage, setLocalStage] = useState(stage);
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const groupStandings = useMemo(() => calculateGroupStandings(localStage, teams), [localStage, teams]);
  const wildcardStandings = useMemo(() => {
    const pool = Object.values(groupStandings).flatMap((standings) =>
      standings.slice(localStage.options.advancePerGroup)
    );
    return rankStandings(pool).map((standing, index) => ({ ...standing, rank: index + 1 }));
  }, [groupStandings, localStage.options.advancePerGroup]);

  const commit = (nextStage: GroupStage) => {
    setLocalStage(nextStage);
    onChange?.(nextStage);
  };

  const updateResult = (matchId: string, scoreA?: number, scoreB?: number) => {
    commit(applyGroupMatchResult(localStage, matchId, scoreA, scoreB));
  };

  const autoFillMatch = (matchId: string) => {
    const match = localStage.matches.find((item) => item.id === matchId);
    if (!match || match.isBye || !match.teamAId || !match.teamBId) return;
    const { scoreA, scoreB } = createRandomHeadToHeadScore({ allowDraw: localStage.options.allowDraw });
    updateResult(match.id, scoreA, scoreB);
  };

  const autoFillAll = () => {
    const nextStage = localStage.matches.reduce((stage, match) => {
      if (match.isBye || !match.teamAId || !match.teamBId) return stage;
      const { scoreA, scoreB } = createRandomHeadToHeadScore({ allowDraw: stage.options.allowDraw });
      return applyGroupMatchResult(stage, match.id, scoreA, scoreB);
    }, localStage);
    commit(nextStage);
  };

  return (
    <section className="space-y-6">
      {localStage.warnings.length ? (
        <div className="rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-semibold text-ink">
          {localStage.warnings.join(" ")}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-cyan/45 bg-cyan/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-cyan transition hover:bg-cyan hover:text-arena"
          onClick={autoFillAll}
        >
          <Dices className="h-4 w-4" aria-hidden="true" />
          전체 자동 결과
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {localStage.groups.map((group) => (
          <section key={group.id} className="rounded-md border border-line bg-panel p-4">
            <h3 className="mb-3 text-lg font-black uppercase text-ink">{group.name} 경기</h3>
            <div className="space-y-2">
              {localStage.matches
                .filter((match) => match.id.startsWith(group.id))
                .map((match) => {
                  const teamA = match.teamAId ? teamsById.get(match.teamAId) : undefined;
                  const teamB = match.teamBId ? teamsById.get(match.teamBId) : undefined;

                  return (
                    <div key={match.id} className="rounded-md border border-line bg-panel p-3">
                      <div className="mb-3 flex items-center justify-between text-xs font-black uppercase text-slate-400">
                        <span>Round {match.round}</span>
                        <div className="flex items-center gap-2">
                          <span>Match {match.matchNumber}</span>
                          {!match.isBye ? (
                            <button
                              type="button"
                              className="grid h-7 w-7 place-items-center rounded border border-line bg-field text-muted transition hover:border-cyan hover:text-cyan"
                              onClick={() => autoFillMatch(match.id)}
                              title="이 매치 자동 결과"
                            >
                              <Dices className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {match.isBye ? (
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                          <GroupTeamSide team={teamA} active />
                          <GroupScoreBadge team={teamA} active label="BYE" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                          <GroupTeamSide team={teamA} active={match.winnerId === teamA?.id} />
                          <GroupScorePair
                            scoreA={match.scoreA}
                            scoreB={match.scoreB}
                            teamA={teamA}
                            teamB={teamB}
                            onChange={(scoreA, scoreB) => updateResult(match.id, scoreA, scoreB)}
                          />
                          <GroupTeamSide team={teamB} active={match.winnerId === teamB?.id} align="right" />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        ))}
      </div>

      <div className="space-y-6">
        {localStage.groups.map((group) => (
          <GroupStandingsTable
            key={group.id}
            group={group}
            standings={groupStandings[group.id] ?? []}
            teamsById={teamsById}
            advanceCount={localStage.options.advancePerGroup}
          />
        ))}
        <WildcardTable
          standings={wildcardStandings as LeagueStanding[]}
          teamsById={teamsById}
          wildcardCount={localStage.options.wildcardCount}
        />
      </div>
    </section>
  );
}

function GroupTeamSide({ team, active, align = "left" }: { team?: Team; active?: boolean; align?: "left" | "right" }) {
  const primary = active ? getTeamWinnerColor(team) : getTeamThemePrimaryColor(team);
  const textStyle = getTeamTextStyle(team, active);
  const activeStyle =
    active && primary
        ? {
          borderColor: primary,
          background: primary,
          boxShadow: `0 0 30px ${mix(primary, 56)}, inset 0 0 0 1px ${mix(primary, 86)}`
        }
      : undefined;

  return (
    <div
      className={`relative flex min-w-0 items-center gap-3 rounded-md border bg-field px-3 py-2 transition ${
        active ? "border-cyan/45 shadow-[0_0_18px_rgba(47,230,255,0.12)]" : "border-line"
      } ${align === "right" ? "flex-row-reverse" : ""}`}
      style={activeStyle}
    >
      <TeamLogo team={team} size="sm" highlighted={active} useVictoryLogo={active} />
      <div className={`min-w-0 flex-1 ${align === "right" ? "text-right" : ""}`} style={textStyle}>
        <div className="truncate font-black uppercase">{team?.shortName || team?.name || "미정"}</div>
        {team?.shortName ? <div className="truncate text-xs font-semibold" style={textStyle}>{team.name}</div> : null}
      </div>
    </div>
  );
}

function GroupScorePair({
  scoreA,
  scoreB,
  teamA,
  teamB,
  onChange
}: {
  scoreA?: number;
  scoreB?: number;
  teamA?: Team;
  teamB?: Team;
  onChange: (scoreA?: number, scoreB?: number) => void;
}) {
  const [left, setLeft] = useState(scoreA?.toString() ?? "");
  const [right, setRight] = useState(scoreB?.toString() ?? "");
  const aWins = scoreA !== undefined && scoreB !== undefined && scoreA > scoreB;
  const bWins = scoreA !== undefined && scoreB !== undefined && scoreB > scoreA;

  useEffect(() => {
    setLeft(scoreA?.toString() ?? "");
    setRight(scoreB?.toString() ?? "");
  }, [scoreA, scoreB]);

  const update = (nextLeft: string, nextRight: string) => {
    const nextScoreA = nextLeft === "" ? undefined : Number(nextLeft);
    const nextScoreB = nextRight === "" ? undefined : Number(nextRight);
    if (nextScoreA !== undefined && nextScoreB !== undefined) {
      onChange(nextScoreA, nextScoreB);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        value={left}
        onChange={(event) => {
          setLeft(event.target.value);
          update(event.target.value, right);
        }}
        className="h-9 w-14 rounded-md border border-line bg-field text-center font-black text-ink"
        inputMode="numeric"
        aria-label="Score A"
        style={aWins ? getScoreInputStyle(teamA) : undefined}
      />
      <span className="text-slate-500">:</span>
      <input
        value={right}
        onChange={(event) => {
          setRight(event.target.value);
          update(left, event.target.value);
        }}
        className="h-9 w-14 rounded-md border border-line bg-field text-center font-black text-ink"
        inputMode="numeric"
        aria-label="Score B"
        style={bWins ? getScoreInputStyle(teamB) : undefined}
      />
    </div>
  );
}

function GroupScoreBadge({ team, active, label }: { team?: Team; active?: boolean; label: string }) {
  return (
    <div
      className="grid h-9 min-w-14 place-items-center rounded-md border border-line bg-field px-3 text-sm font-black text-ink"
      style={active ? getScoreInputStyle(team) : undefined}
    >
      {label}
    </div>
  );
}

function getScoreInputStyle(team?: Team): CSSProperties | undefined {
  const primary = getTeamWinnerColor(team) ?? getTeamThemePrimaryColor(team);

  if (!primary) return undefined;

  return {
    background: primary,
    borderColor: "transparent",
    color: getTeamReadableScoreTextColor(team)
  };
}

function getTeamTextStyle(team?: Team, active?: boolean): CSSProperties | undefined {
  const color = active ? getTeamVictoryTextColor(team) || getTeamThemeTextColor(team) : getTeamThemeTextColor(team);
  return color ? { color } : undefined;
}

function mix(color: string, amount: number) {
  return `color-mix(in srgb, ${color} ${amount}%, transparent)`;
}
