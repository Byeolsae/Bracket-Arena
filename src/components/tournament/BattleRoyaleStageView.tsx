"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Dices } from "lucide-react";
import type { BattleRoyalePlacement, BattleRoyaleStage, Team } from "@/lib/core/models";
import {
  applyBattleRoyaleResult,
  BATTLE_ROYALE_GROUP_NAMES,
  BATTLE_ROYALE_GROUP_SIZE,
  calculateBattleRoyaleStandings,
  hydrateBattleRoyaleStage,
  isBattleRoyaleRoundComplete
} from "@/lib/core/battleRoyale";
import { createRandomBattleRoyalePlacements } from "@/lib/core/randomResults";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { BattleRoyaleResultInput } from "@/components/tournament/BattleRoyaleResultInput";
import { BattleRoyaleStandingsTable } from "@/components/tournament/BattleRoyaleStandingsTable";

type BattleRoyaleStageViewProps = {
  stage: BattleRoyaleStage;
  teams: Team[];
  onChange?: (stage: BattleRoyaleStage) => void;
};

export function BattleRoyaleStageView({ stage, teams, onChange }: BattleRoyaleStageViewProps) {
  const [localStage, setLocalStage] = useState(() => hydrateBattleRoyaleStage(stage));
  const localStageRef = useRef(localStage);
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const standings = useMemo(
    () => calculateBattleRoyaleStandings(localStage, teams),
    [localStage, teams]
  );
  const chickenCounts = useMemo(() => getChickenCounts(localStage), [localStage]);
  const isQualifier = localStage.options.stageMode === "qualifier";
  const qualifierGroupTables = useMemo(() => {
    if (!isQualifier) return [];
    const groupNames = localStage.options.groupNames?.length
      ? localStage.options.groupNames
      : BATTLE_ROYALE_GROUP_NAMES;

    const qualifierGroupTeamIds = getQualifierGroupTeamIds(localStage);
    return groupNames.map((groupName, groupIndex) => {
      const groupTeamIds = qualifierGroupTeamIds[groupIndex] ?? [];
      const groupTeams = groupTeamIds
        .map((teamId) => teamsById.get(teamId))
        .filter((team): team is Team => Boolean(team));
      const groupStandings = calculateBattleRoyaleStandings(localStage, groupTeams);

      return {
        groupName,
        standings: groupStandings
      };
    });
  }, [isQualifier, localStage, teamsById]);

  useEffect(() => {
    const hydratedStage = hydrateBattleRoyaleStage(stage);
    localStageRef.current = hydratedStage;
    setLocalStage(hydratedStage);
    if (hydratedStage !== stage) onChange?.(hydratedStage);
  }, [onChange, stage]);

  const updateStage = (updater: BattleRoyaleStage | ((current: BattleRoyaleStage) => BattleRoyaleStage)) => {
    const nextStage = typeof updater === "function" ? updater(localStageRef.current) : updater;
    localStageRef.current = nextStage;
    setLocalStage(nextStage);
    onChange?.(nextStage);
  };

  const updateScoringMode = (scoringMode: NonNullable<BattleRoyaleStage["options"]["scoringMode"]>) => {
    updateStage((current) => ({
      ...current,
      options: {
        ...current.options,
        scoringMode
      }
    }));
  };

  const saveRound = (roundId: string, placements: BattleRoyalePlacement[]) => {
    updateStage((current) => applyBattleRoyaleResult(current, roundId, placements));
  };

  const updateRoundPlacement = (
    roundId: string,
    teamId: string,
    patch: Partial<BattleRoyalePlacement>
  ) => {
    updateStage((current) => {
      const round = current.rounds.find((item) => item.id === roundId);
      if (!round) return current;
      const placements = getRoundPlacements(round);
      const nextPlacements =
        typeof patch.placement === "number"
          ? swapPlacement(placements, teamId, patch.placement)
          : placements.map((placement) =>
              placement.teamId === teamId ? { ...placement, ...patch } : placement
            );
      return applyBattleRoyaleResult(current, roundId, nextPlacements);
    });
  };

  const autoFillRound = (roundId: string) => {
    const round = localStage.rounds.find((item) => item.id === roundId);
    if (!round) return;
    saveRound(roundId, createRandomBattleRoyalePlacements(round.teamIds));
  };

  const autoFillAll = () => {
    updateStage((current) => current.rounds.reduce(
      (stage, round) => applyBattleRoyaleResult(stage, round.id, createRandomBattleRoyalePlacements(round.teamIds)),
      current
    ));
  };

  return (
    <section className="space-y-6">
      <div className="rounded-md border border-line bg-field px-4 py-3 text-sm font-semibold leading-6 text-muted">
        {isQualifier
          ? `배틀로얄 예선: 24팀, A/B/C 3개 조, 조별 8팀. 각 조는 다른 두 조와 ${localStage.options.matchesPerPair ?? localStage.options.roundCount}경기씩 만납니다.`
          : localStage.options.stageMode === "final"
            ? `배틀로얄 본선: 16팀 단일 로비, ${localStage.options.roundCount}경기 누적 점수로 최종 순위를 결정합니다.`
            : "배틀로얄 누적 점수로 순위를 결정합니다."}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border border-line bg-panel px-4 py-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-cyan">점수 방식</p>
          <p className="mt-1 text-xs font-semibold text-muted">
            순위 생존 점수는 1위 10점, 2위 6점, 3위 5점, 4위 4점, 5위 3점, 6위 2점, 7-8위 1점입니다.
          </p>
        </div>
        <label className="w-full max-w-xs space-y-1.5">
          <span className="text-sm font-bold text-ink">총점 계산</span>
          <select
            className="input"
            value={localStage.options.scoringMode ?? "combined"}
            onChange={(event) =>
              updateScoringMode(event.target.value as NonNullable<BattleRoyaleStage["options"]["scoringMode"]>)
            }
          >
            <option value="placement">순위</option>
            <option value="kills">킬</option>
            <option value="combined">순위 + 킬 합산</option>
          </select>
        </label>
      </div>

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

      {isQualifier ? (
        <QualifierLobbyTables
          rounds={localStage.rounds}
          teamsById={teamsById}
          chickenCounts={chickenCounts}
          onAutoFillRound={autoFillRound}
          onUpdatePlacement={updateRoundPlacement}
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {localStage.rounds.map((round) => (
            <section key={round.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase text-ink">
                  {round.groupName ?? `${round.round}라운드`}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-slate-500">
                    {round.teamIds.length}팀
                  </span>
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded border border-line bg-field text-muted transition hover:border-cyan hover:text-cyan"
                    onClick={() => autoFillRound(round.id)}
                    title="이 라운드 자동 결과"
                  >
                    <Dices className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <BattleRoyaleResultInput
                round={round}
                teamsById={teamsById}
                chickenCounts={chickenCounts}
                onSave={(placements) => saveRound(round.id, placements)}
              />
            </section>
          ))}
        </div>
      )}

      {isQualifier ? (
        <section className="space-y-4">
          <div>
            <p className="section-kicker">그룹 점수</p>
            <h2 className="text-xl font-black uppercase tracking-wide text-ink">A/B/C 그룹별 점수 테이블</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {qualifierGroupTables.map((group) => (
              <section key={group.groupName} className="space-y-2">
                <h3 className="text-lg font-black uppercase text-ink">{group.groupName} 점수 테이블</h3>
                <BattleRoyaleStandingsTable
                  standings={group.standings}
                  teamsById={teamsById}
                  chickenCounts={chickenCounts}
                  compact
                />
              </section>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div>
          <p className="section-kicker">{isQualifier ? "통합 점수" : "최종 점수"}</p>
          <h2 className="text-xl font-black uppercase tracking-wide text-ink">
            {isQualifier ? "통합 점수 테이블" : "최종 점수 테이블"}
          </h2>
          {isQualifier ? (
            <p className="mt-1 text-sm font-semibold text-muted">통합 점수 테이블 1-16위가 본선으로 올라갑니다.</p>
          ) : null}
        </div>
        <BattleRoyaleStandingsTable
          standings={standings}
          teamsById={teamsById}
          chickenCounts={chickenCounts}
          advanceCount={localStage.options.advanceCount}
        />
      </section>
    </section>
  );
}

type QualifierLobbyTablesProps = {
  rounds: BattleRoyaleStage["rounds"];
  teamsById: Map<string, Team>;
  chickenCounts: Map<string, number>;
  onAutoFillRound: (roundId: string) => void;
  onUpdatePlacement: (roundId: string, teamId: string, patch: Partial<BattleRoyalePlacement>) => void;
};

function QualifierLobbyTables({
  rounds,
  teamsById,
  chickenCounts,
  onAutoFillRound,
  onUpdatePlacement
}: QualifierLobbyTablesProps) {
  const lobbies = useMemo(() => {
    const lobbyMap = new Map<string, BattleRoyaleStage["rounds"]>();
    rounds.forEach((round) => {
      const lobbyName = getLobbyName(round.groupName);
      lobbyMap.set(lobbyName, [...(lobbyMap.get(lobbyName) ?? []), round]);
    });

    return [...lobbyMap.entries()].map(([lobbyName, lobbyRounds]) => ({
      lobbyName,
      rounds: lobbyRounds.sort((a, b) => a.round - b.round),
      teamIds: lobbyRounds[0]?.teamIds ?? []
    }));
  }, [rounds]);

  return (
    <section className="space-y-5">
      <div>
        <p className="section-kicker">예선 로비 입력</p>
        <h2 className="text-xl font-black uppercase tracking-wide text-ink">AB / AC / BC 점수 입력 테이블</h2>
        <p className="mt-1 text-sm font-semibold text-muted">
          각 로비는 16팀이 동시에 경기합니다. 팀별로 경기마다 순위와 킬을 입력하세요.
        </p>
      </div>

      {lobbies.map((lobby) => (
        <section key={lobby.lobbyName} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black uppercase text-ink">{lobby.lobbyName}</h3>
              <p className="text-xs font-semibold text-muted">{lobby.teamIds.length}팀 로비</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lobby.rounds.map((round, index) => (
                <button
                  key={round.id}
                  type="button"
                  className="inline-flex h-8 items-center gap-1 rounded border border-line bg-field px-2 text-[11px] font-black text-muted transition hover:border-cyan hover:text-cyan"
                  onClick={() => onAutoFillRound(round.id)}
                  title={`${index + 1}경기 자동 결과`}
                >
                  <Dices className="h-3.5 w-3.5" aria-hidden="true" />
                  {index + 1}경기
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-line bg-panel">
            <table className="w-full min-w-[1440px] border-collapse text-sm">
              <thead className="bg-arena text-xs uppercase text-slate-400">
                <tr>
                  <th className="sticky left-0 z-10 min-w-[220px] bg-arena px-3 py-3 text-left font-black">팀</th>
                  {lobby.rounds.map((round, index) => (
                    <th key={round.id} className="border-l border-line px-3 py-3 text-center font-black" colSpan={2}>
                      {index + 1}경기
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="sticky left-0 z-10 bg-arena px-3 py-2 text-left font-black text-slate-500">로비 참가팀</th>
                  {lobby.rounds.flatMap((round) => [
                    <th key={`${round.id}-placement`} className="border-l border-line px-2 py-2 text-center font-black">순위</th>,
                    <th key={`${round.id}-kills`} className="px-2 py-2 text-center font-black">킬</th>
                  ])}
                </tr>
              </thead>
              <tbody>
                {lobby.teamIds.map((teamId) => {
                  const team = teamsById.get(teamId);
                  const hasLobbyWin = lobby.rounds.some(
                    (round) => isBattleRoyaleRoundComplete(round) && getRoundPlacement(round, teamId).placement === 1
                  );
                  return (
                    <tr key={teamId} className="border-t border-line text-ink">
                      <td className="sticky left-0 z-10 bg-panel px-3 py-3">
                        <div className="flex items-center gap-3">
                          <TeamLogo team={team} size="sm" highlighted={hasLobbyWin} />
                          <span className={clsx("font-black uppercase", hasLobbyWin && "text-lime")}>{team?.shortName || team?.name || "미정"}</span>
                          <ChickenBadge count={chickenCounts.get(teamId) ?? 0} />
                        </div>
                      </td>
                      {lobby.rounds.flatMap((round) => {
                        const placement = getRoundPlacement(round, teamId);
                        const isMatchWinner = isBattleRoyaleRoundComplete(round) && placement.placement === 1;
                        return [
                          <td
                            key={`${round.id}-${teamId}-placement`}
                            className={clsx(
                              "border-l px-2 py-2",
                              isMatchWinner
                                ? "border-lime/70 text-lime ring-1 ring-inset ring-lime/70"
                                : "border-line"
                            )}
                          >
                            <PlacementSelect
                              value={placement.placement}
                              max={round.teamIds.length}
                              winner={isMatchWinner}
                              onChange={(nextPlacement) => onUpdatePlacement(round.id, teamId, { placement: nextPlacement })}
                            />
                          </td>,
                          <td
                            key={`${round.id}-${teamId}-kills`}
                            className={clsx("px-2 py-2", isMatchWinner && "text-lime ring-1 ring-inset ring-lime/70")}
                          >
                            <LobbyNumberCell
                              value={placement.kills}
                              min={0}
                              winner={isMatchWinner}
                              onChange={(kills) => onUpdatePlacement(round.id, teamId, { kills })}
                            />
                          </td>
                        ];
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </section>
  );
}

function getLobbyName(groupName?: string) {
  const lobbyName = groupName?.split("·").at(1)?.trim() || groupName || "로비";
  return lobbyName.replace(/\s+vs\s+/i, "/").replace(/조\/(.+?)조$/, "조/$1조 로비");
}

function getQualifierGroupTeamIds(stage: BattleRoyaleStage) {
  const [firstPair, secondPair, thirdPair] = stage.rounds;
  if (!firstPair || !secondPair || !thirdPair) return [];

  return [
    intersectTeamIds(firstPair.teamIds, secondPair.teamIds),
    intersectTeamIds(firstPair.teamIds, thirdPair.teamIds),
    intersectTeamIds(secondPair.teamIds, thirdPair.teamIds)
  ];
}

function intersectTeamIds(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((teamId) => rightSet.has(teamId)).slice(0, BATTLE_ROYALE_GROUP_SIZE);
}

function getChickenCounts(stage: BattleRoyaleStage) {
  const counts = new Map<string, number>();
  stage.rounds.forEach((round) => {
    if (!isBattleRoyaleRoundComplete(round)) return;
    round.placements.forEach((placement) => {
      if (placement.placement !== 1) return;
      counts.set(placement.teamId, (counts.get(placement.teamId) ?? 0) + 1);
    });
  });
  return counts;
}

function getRoundPlacements(round: BattleRoyaleStage["rounds"][number]) {
  return round.teamIds.map((teamId, index) => getRoundPlacement(round, teamId, index));
}

function getRoundPlacement(round: BattleRoyaleStage["rounds"][number], teamId: string, fallbackIndex?: number): BattleRoyalePlacement {
  return (
    round.placements.find((placement) => placement.teamId === teamId) ?? {
      teamId,
      placement: (fallbackIndex ?? round.teamIds.indexOf(teamId)) + 1,
      kills: 0,
      bonusPoints: 0,
      penaltyPoints: 0
    }
  );
}

function swapPlacement(
  placements: BattleRoyalePlacement[],
  teamId: string,
  nextPlacement: number
) {
  const currentPlacement = placements.find((placement) => placement.teamId === teamId);
  if (!currentPlacement || currentPlacement.placement === nextPlacement) return placements;

  return placements.map((placement) => {
    if (placement.teamId === teamId) return { ...placement, placement: nextPlacement };
    if (placement.placement === nextPlacement) return { ...placement, placement: currentPlacement.placement };
    return placement;
  });
}

function PlacementSelect({
  value,
  max,
  winner,
  onChange
}: {
  value: number;
  max: number;
  winner?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className={clsx(
        "h-8 w-28 rounded-md border px-2 text-xs font-black",
        winner ? "border-lime text-lime" : "border-line bg-field text-ink"
      )}
    >
      {Array.from({ length: max }, (_, index) => index + 1).map((placement) => (
        <option key={placement} value={placement}>
          {placement}등 ({getPlacementPointLabel(placement)}점)
        </option>
      ))}
    </select>
  );
}

function LobbyNumberCell({
  value,
  min,
  max,
  winner,
  onChange
}: {
  value: number;
  min: number;
  max?: number;
  winner?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(event) => {
        const numericValue = Math.floor(Number(event.target.value) || min);
        onChange(Math.max(min, max ? Math.min(max, numericValue) : numericValue));
      }}
      className={clsx(
        "h-8 w-16 rounded-md border px-2 text-center text-xs font-black",
        winner ? "border-lime text-lime" : "border-line bg-field text-ink"
      )}
    />
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

function getPlacementPointLabel(placement: number) {
  if (placement === 1) return 10;
  if (placement === 2) return 6;
  if (placement === 3) return 5;
  if (placement === 4) return 4;
  if (placement === 5) return 3;
  if (placement === 6) return 2;
  if (placement === 7 || placement === 8) return 1;
  return 0;
}
