"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BracketGroup, Team, TripleEliminationStage } from "@/lib/core/models";
import { BracketAxisLabel } from "@/components/bracket/BracketAxisLabel";
import { BracketLane } from "@/components/bracket/BracketLane";
import { BracketZoomControls } from "@/components/bracket/BracketZoomControls";
import { RandomRoundButton } from "@/components/bracket/RandomRoundButton";
import { autoFillCurrentBracketRound } from "@/components/bracket/randomRound";
import { applyTripleEliminationResult } from "@/lib/core/tripleElimination";
import { getCurrentPlayableMatchIds } from "@/lib/core/bracketOrder";
import { TeamLogo } from "@/components/teams/TeamLogo";
import {
  getLossGroupFirstRoundMatchCount,
  getTripleLossGroupMatchCountByRound
} from "@/lib/core/eliminationSizing";

type TripleEliminationViewProps = {
  stage: TripleEliminationStage;
  teams: Team[];
  onChange?: (stage: TripleEliminationStage) => void;
};

type TripleLane = {
  group: BracketGroup;
  title: string;
  subtitle: string;
  tone: "red" | "gold" | "cyan";
  minHeight: number;
  placementName: string;
};

const standardLanes: TripleLane[] = [
  { group: "zero-loss", title: "Upper Bracket", subtitle: "1위 결정", tone: "cyan", minHeight: 520, placementName: "1위" },
  { group: "one-loss", title: "Middle Bracket", subtitle: "2위 결정", tone: "gold", minHeight: 440, placementName: "2위" },
  { group: "two-loss", title: "Lower Bracket", subtitle: "3위 결정", tone: "red", minHeight: 440, placementName: "3위" }
];

export function TripleEliminationView({ stage, teams, onChange }: TripleEliminationViewProps) {
  const [localStage, setLocalStage] = useState(stage);
  const [zoom, setZoom] = useState(1);
  const localStageRef = useRef(stage);
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const bracketTeamCount = Math.max(localStage.teamIds.length, teams.length);
  const lanes = standardLanes;
  const displayMatches = useMemo(() => {
    const actualMatches = localStage.matches;
    const pending = localStage.pendingTeamIds ?? {};

    return [
      ...actualMatches,
      ...createWaitingMatches(
        actualMatches.filter((match) => normalizeGroup(match.bracketGroup) === "zero-loss"),
        pending["0"] ?? [],
        "zero-loss",
        "Upper Round"
      ),
      ...createTripleDisplayWaitingMatches(
        actualMatches,
        pending["1"] ?? [],
        "one-loss",
        "Middle Round",
        "zero-loss"
      ),
      ...createTripleDisplayWaitingMatches(
        actualMatches,
        pending["2"] ?? [],
        "two-loss",
        "Lower Round",
        "one-loss"
      ),
      ...createStandardPlacementWaitingMatch(
        actualMatches,
        pending["1"] ?? [],
        pending["2"] ?? []
      )
    ];
  }, [localStage.matches, localStage.pendingTeamIds]);
  const champion = localStage.championId ? teamsById.get(localStage.championId) : undefined;
  const runnerUp = localStage.runnerUpId ? teamsById.get(localStage.runnerUpId) : undefined;
  const thirdPlace = localStage.thirdPlaceId ? teamsById.get(localStage.thirdPlaceId) : undefined;
  const activeMatchIds = useMemo(() => getCurrentPlayableMatchIds(displayMatches), [displayMatches]);

  useEffect(() => {
    setLocalStage(stage);
    localStageRef.current = stage;
  }, [stage]);

  const saveResult = (
    matchId: string,
    result: { scoreA?: number; scoreB?: number; winnerId: string }
  ) => {
    const nextStage = applyTripleEliminationResult(
      localStageRef.current,
      matchId,
      result.scoreA,
      result.scoreB,
      result.winnerId
    );
    localStageRef.current = nextStage;
    setLocalStage(nextStage);
    onChange?.(nextStage);
  };

  return (
    <div className="space-y-5">
      <section className="bracket-board">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-arena/85 px-5 py-4">
          <div>
            <p className="section-kicker">Triple Elimination</p>
            <h2 className="mt-1 text-3xl font-black uppercase tracking-wide text-ink">
              Upper / Middle / Lower
            </h2>
            <p className="mt-1 text-sm text-muted">
              Upper는 1위, Middle은 2위, Lower는 3위를 결정합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="rounded-md border border-line bg-field px-3 py-2 text-xs font-black uppercase tracking-wide text-muted">
              표준식 2패조
            </div>
            <BracketZoomControls
              zoom={zoom}
              onChange={setZoom}
              actions={
                <RandomRoundButton
                  onClick={() => autoFillCurrentBracketRound(displayMatches, saveResult, activeMatchIds)}
                />
              }
            />
          </div>
        </div>

        {localStage.warnings.length ? (
          <div className="border-b border-gold/30 bg-gold/10 px-4 py-3 text-sm font-semibold text-ink">
            {localStage.warnings.join(" ")}
          </div>
        ) : null}

        <div className="bracket-board-inner">
          <div className="max-h-[78vh] overflow-auto overscroll-contain pb-8">
            <div
              className="min-h-[1500px] min-w-[2500px] origin-top-left space-y-16 p-8 pr-[560px] pb-[460px]"
              style={{
                transform: `scale(${zoom})`,
                width: `${100 * zoom}%`
              }}
            >
              {lanes.map((lane) => {
                const laneMatches = createLaneDisplayMatches(displayMatches, lane.group);
                const firstRoundSize = expectedFirstRoundSize(lane.group, bracketTeamCount);
                const roundCount = getActualDisplayRoundCount(laneMatches);
                const matchCountsByRound = capExpectedMatchCountsByRound(
                  expectedMatchCountsByRound(lane.group, bracketTeamCount),
                  roundCount
                );
                const laneHeight = getTripleLaneHeight(lane.minHeight, firstRoundSize, roundCount, matchCountsByRound, laneMatches);
                const placementTeam =
                  lane.group === "zero-loss" ? champion : lane.group === "one-loss" ? runnerUp : thirdPlace;
                const placementText = placementTeam
                  ? `${lane.subtitle} · ${placementTeam.shortName || placementTeam.name}`
                  : lane.subtitle;

                return (
                  <section
                    key={lane.group}
                    className={`grid grid-cols-[56px_minmax(1320px,1fr)] gap-x-7 border-l-4 bg-arena/25 py-5 pr-5 ${
                      lane.tone === "gold"
                        ? "border-gold/60"
                        : lane.tone === "cyan"
                          ? "border-cyan/60"
                          : "border-danger/60"
                    }`}
                    style={{ minHeight: laneHeight + 112 }}
                  >
                    <BracketAxisLabel label={lane.title} tone={lane.tone} />
                    <div className="min-w-0">
                      <BracketLane
                        title={lane.title}
                        subtitle={placementText}
                        matches={laneMatches}
                        teamsById={teamsById}
                        tone={lane.tone}
                        progressiveTone
                        splitBranches
                        padToTreeRounds={false}
                        scrollable={false}
                        expectedFirstRoundMatchCount={firstRoundSize}
                        expectedRoundCount={roundCount}
                        expectedMatchCountsByRound={undefined}
                        activeMatchIds={activeMatchIds}
                        minHeight={`${laneHeight}px`}
                        onSaveResult={saveResult}
                        onClearResult={() => undefined}
                      />
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="arena-card p-4">
        <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-danger">Eliminated</h3>
        <div className="flex flex-wrap gap-2">
          {localStage.eliminatedTeamIds.map((teamId) => {
            const team = teamsById.get(teamId);
            return (
              <div key={teamId} className="flex items-center gap-2 border border-line bg-field px-2 py-1 opacity-55">
                  <TeamLogo team={team} size="sm" />
                <span className="text-sm font-black uppercase text-ink">
                  {team?.shortName || team?.name || "미정"}
                </span>
              </div>
            );
          })}
          {!localStage.eliminatedTeamIds.length ? (
            <span className="text-sm text-muted">아직 탈락한 팀이 없습니다.</span>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function normalizeGroup(group: BracketGroup | undefined): BracketGroup {
  if (group === "winners") return "zero-loss";
  if (group === "losers") return "one-loss";
  return group ?? "zero-loss";
}

function createLaneDisplayMatches(
  matches: TripleEliminationStage["matches"],
  group: BracketGroup
): TripleEliminationStage["matches"] {
  const laneMatches = matches.filter((match) => normalizeGroup(match.bracketGroup) === group);

  if (group === "zero-loss") {
    return renameTerminalLossRounds(laneMatches, group);
  }

  if (group === "one-loss") {
    return renameTerminalLossRounds(mergeStandardMiddleDisplayRounds(laneMatches), group);
  }

  if (group === "two-loss") {
    return renameTerminalLossRounds(
      normalizeLossLaneDisplayRounds(laneMatches, "Lower Round"),
      group
    );
  }

  return renameTerminalLossRounds(laneMatches, group);
}

function mergeStandardMiddleDisplayRounds(matches: TripleEliminationStage["matches"]) {
  return matches;
}

function normalizeLossLaneDisplayRounds(
  matches: TripleEliminationStage["matches"],
  roundNamePrefix: string
) {
  const sourceRounds = Array.from(new Set(matches.map((match) => match.round))).sort((left, right) => left - right);
  const displayRoundBySourceRound = new Map(sourceRounds.map((round, index) => [round, index + 1]));

  return matches.map((match) => {
    const displayRound = displayRoundBySourceRound.get(match.round) ?? match.round;
    const isExplicitFinal = /final/i.test(match.roundName);
    return {
      ...match,
      round: displayRound,
      roundName: isExplicitFinal ? match.roundName : `${roundNamePrefix} ${displayRound}`
    };
  });
}

function renameTerminalLossRounds(
  matches: TripleEliminationStage["matches"],
  group: BracketGroup
) {
  const playableMatches = matches.filter((match) => !match.id.startsWith("waiting-"));
  if (!playableMatches.length) return matches;

  const finalName = getDisplayFinalName(group);
  const hasExplicitFinal = playableMatches.some((match) => match.roundName === finalName);
  if (hasExplicitFinal) return matches;

  const lastRound = Math.max(...playableMatches.map((match) => match.round));
  const lastRoundMatchCount = playableMatches.filter((match) => match.round === lastRound).length;
  if (group !== "zero-loss" && lastRoundMatchCount > 1) return matches;
  if (
    group !== "zero-loss" &&
    playableMatches.some(
      (match) =>
        match.round !== lastRound &&
        (match.status === "ready" || match.status === "pending")
    )
  ) {
    return matches;
  }

  return matches.map((match) =>
    match.round === lastRound && !match.id.startsWith("waiting-")
      ? { ...match, roundName: finalName }
      : match
  );
}

function getDisplayFinalName(group: BracketGroup) {
  if (group === "zero-loss") return "Upper Final";
  if (group === "one-loss") return "Middle Final";
  return "Lower Final";
}

function getActualDisplayRoundCount(matches: TripleEliminationStage["matches"]) {
  if (!matches.length) return 0;
  return Math.max(...matches.map((match) => match.round));
}

function capExpectedMatchCountsByRound(expectedCountsByRound: Record<number, number>, roundCount: number) {
  return Object.fromEntries(
    Object.entries(expectedCountsByRound).filter(([round]) => Number(round) <= roundCount)
  );
}

function expectedFirstRoundSize(group: BracketGroup, teamCount: number) {
  if (group === "one-loss") return getLossGroupFirstRoundMatchCount(teamCount, 1);
  if (group === "two-loss") return getLossGroupFirstRoundMatchCount(teamCount, 2);
  return getLossGroupFirstRoundMatchCount(teamCount, 0);
}

function expectedMatchCountsByRound(group: BracketGroup, teamCount: number) {
  if (group === "one-loss") return getTripleLossGroupMatchCountByRound(teamCount, 1);
  if (group === "two-loss") return getTripleLossGroupMatchCountByRound(teamCount, 2);
  return getTripleLossGroupMatchCountByRound(teamCount, 0);
}

function getTripleLaneHeight(
  minHeight: number,
  firstRoundSize: number,
  roundCount: number,
  expectedCountsByRound: Record<number, number>,
  matches: TripleEliminationStage["matches"]
) {
  const actualCountsByRound = matches.reduce<Record<number, number>>((counts, match) => {
    counts[match.round] = (counts[match.round] ?? 0) + 1;
    return counts;
  }, {});
  const largestRoundSize = Math.max(
    firstRoundSize,
    ...Object.values(expectedCountsByRound),
    ...Object.values(actualCountsByRound)
  );
  const leafGap = 168;
  const cardBreathingRoom = 136;
  const labelBreathingRoom = 72;
  const roundBreathingRoom = Math.max(0, roundCount - 4) * 16;
  return Math.max(
    minHeight,
    largestRoundSize * leafGap + cardBreathingRoom + labelBreathingRoom + roundBreathingRoom
  );
}

function createWaitingMatches(
  matches: TripleEliminationStage["matches"],
  pendingTeamIds: string[],
  group: BracketGroup,
  roundNamePrefix: string,
  options: { splitIntoTbdSlots?: boolean } = {}
): TripleEliminationStage["matches"] {
  if (options.splitIntoTbdSlots) {
    return createWaitingTbdSlots(matches, pendingTeamIds, group, roundNamePrefix);
  }

  if (pendingTeamIds.length < 2) return [];

  const round = getDisplayTargetRound(matches);
  const existingInRound = matches.filter((match) => match.round === round).length;
  const roundName = `${roundNamePrefix} ${round}`;

  const matchesByPair: TripleEliminationStage["matches"] = [];
  for (let index = 0; index + 1 < pendingTeamIds.length; index += 2) {
    const teamAId = pendingTeamIds[index];
    const teamBId = pendingTeamIds[index + 1];
    const matchNumber = existingInRound + matchesByPair.length + 1;
    matchesByPair.push({
      id: `waiting-${group}-${round}-${matchNumber}-${teamAId}-${teamBId}`,
      round,
      roundName,
      matchNumber,
      participantA: { teamId: teamAId },
      participantB: { teamId: teamBId },
      status: "pending" as const,
      bracketGroup: group
    });
  }

  return matchesByPair;
}

function createTripleDisplayWaitingMatches(
  allMatches: TripleEliminationStage["matches"],
  pendingTeamIds: string[],
  group: BracketGroup,
  roundNamePrefix: string,
  feederGroup: BracketGroup
) {
  const laneMatches = allMatches.filter((match) => normalizeGroup(match.bracketGroup) === group);
  const shouldSplitIntoTbdSlots =
    pendingTeamIds.length > 0 &&
    hasOpenFeederPath(allMatches, feederGroup);

  return createWaitingMatches(laneMatches, pendingTeamIds, group, roundNamePrefix, {
    splitIntoTbdSlots: shouldSplitIntoTbdSlots
  });
}

function createWaitingTbdSlots(
  matches: TripleEliminationStage["matches"],
  pendingTeamIds: string[],
  group: BracketGroup,
  roundNamePrefix: string
): TripleEliminationStage["matches"] {
  if (!pendingTeamIds.length) return [];

  const existingWaitingTeamIds = new Set(
    matches
      .filter(
        (match) =>
          match.status === "pending" &&
          Boolean(match.participantA?.teamId) !== Boolean(match.participantB?.teamId)
      )
      .flatMap((match) => [match.participantA?.teamId, match.participantB?.teamId])
      .filter(Boolean) as string[]
  );
  const teamIds = pendingTeamIds.filter((teamId) => !existingWaitingTeamIds.has(teamId));
  if (!teamIds.length) return [];

  const round = getDisplayTargetRound(matches);
  const existingInRound = matches.filter((match) => match.round === round).length;
  const roundName = `${roundNamePrefix} ${round}`;

  return teamIds.map((teamId, index) => ({
    id: `waiting-${group}-${round}-${existingInRound + index + 1}-${teamId}-tbd`,
    round,
    roundName,
    matchNumber: existingInRound + index + 1,
    participantA: { teamId },
    participantB: undefined,
    status: "pending" as const,
    bracketGroup: group
  }));
}

function hasOpenFeederPath(matches: TripleEliminationStage["matches"], feederGroup: BracketGroup) {
  return matches.some(
    (match) =>
      normalizeGroup(match.bracketGroup) === feederGroup &&
      (match.status === "ready" || match.status === "pending")
  );
}

function createStandardPlacementWaitingMatch(
  matches: TripleEliminationStage["matches"],
  pendingOneLossTeamIds: string[],
  pendingTwoLossTeamIds: string[]
): TripleEliminationStage["matches"] {
  if (pendingOneLossTeamIds.length !== 1) return [];
  if (matches.some((match) => match.id.startsWith("triple-placement-final"))) return [];

  const oneLossMatches = matches.filter((match) => normalizeGroup(match.bracketGroup) === "one-loss");
  const hasOpenOneLossMatch = oneLossMatches.some(
    (match) => match.status === "ready" || match.status === "pending"
  );
  if (hasOpenOneLossMatch) return [];

  const hasOpenTwoLossPath =
    pendingTwoLossTeamIds.length > 0 ||
    matches.some(
      (match) =>
        normalizeGroup(match.bracketGroup) === "two-loss" &&
        (match.status === "ready" || match.status === "pending")
    );
  if (!hasOpenTwoLossPath) return [];

  const waitingTeamId = pendingOneLossTeamIds[0];
  const round = getDisplayTargetRound(oneLossMatches);
  const matchNumber = oneLossMatches.filter((match) => match.round === round).length + 1;

  return [
    {
      id: `waiting-placement-standard-${round}-${matchNumber}-${waitingTeamId}`,
      round,
      roundName: "Middle Final",
      matchNumber,
      participantA: { teamId: waitingTeamId },
      participantB: undefined,
      status: "pending" as const,
      bracketGroup: "one-loss"
    }
  ];
}

function getDisplayTargetRound(matches: TripleEliminationStage["matches"]) {
  if (!matches.length) return 1;

  const completedRounds = matches
    .filter((match) => match.status === "complete" || match.status === "bye")
    .map((match) => match.round);

  return completedRounds.length ? Math.max(...completedRounds) + 1 : 1;
}
