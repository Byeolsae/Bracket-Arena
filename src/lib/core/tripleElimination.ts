import type {
  BracketGroup,
  BracketStageMatch,
  Team,
  TripleEliminationStage
} from "./models";
import { createSeededParticipants } from "./bye";
import { getBracketPlayOrder } from "./bracketOrder";
import {
  assertEliminationTeamLimit,
  getLossGroupFirstRoundMatchCount,
  getTripleLossGroupMatchCountByRound
} from "./eliminationSizing";

const groupByLossCount: Record<number, BracketGroup> = {
  0: "zero-loss",
  1: "one-loss",
  2: "two-loss"
};

export function generateTripleEliminationBracket(teams: Team[]): TripleEliminationStage {
  assertEliminationTeamLimit("triple", teams.length);
  const initial = createInitialMatchesWithByes(teams);
  let stage: TripleEliminationStage = {
    id: `triple-${Date.now()}`,
    format: "triple-elimination",
    teamIds: teams.map((team) => team.id),
    matches: initial.matches,
    lossCounts: Object.fromEntries(teams.map((team) => [team.id, 0])),
    pendingTeamIds: { "0": initial.byeWinnerIds, "1": [], "2": [] },
    twoLossFinalistId: undefined,
    eliminatedTeamIds: [],
    warnings: [
      "트리플 엘리미네이션은 2의 제곱수 브래킷으로 자동 보정하고, 부족한 슬롯은 부전승으로 처리합니다."
    ]
  };

  const generated = generateReadyMatchesFromPending(
    stage.matches,
    normalizePending(stage.pendingTeamIds, stage.lossCounts),
    stage.lossCounts,
    stage.twoLossFinalistId
  );
  stage = settleTriplePlacements({
    ...stage,
    matches: [...generated.existingMatches, ...generated.matches],
    pendingTeamIds: generated.pendingTeamIds,
    twoLossFinalistId: generated.twoLossFinalistId
  });

  return stage;
}

export function applyTripleEliminationResult(
  stage: TripleEliminationStage,
  matchId: string,
  scoreA: number | undefined,
  scoreB: number | undefined,
  winnerId: string
): TripleEliminationStage {
  const match = stage.matches.find((item) => item.id === matchId);
  if (!match) return stage;
  if (match.status === "complete") {
    return rebuildTripleEliminationWithResult(stage, { matchId, scoreA, scoreB, winnerId });
  }

  const participantIds = [match.participantA?.teamId, match.participantB?.teamId].filter(Boolean) as string[];
  if (!participantIds.includes(winnerId)) return stage;

  const loserId = participantIds.find((teamId) => teamId !== winnerId);
  if (isPlacementChallengeFinal(match)) {
    const completedMatches = stage.matches.map((item) =>
      item.id === matchId
        ? {
            ...item,
            scoreA,
            scoreB,
            winnerId,
            loserId,
            status: "complete" as const
          }
        : item
    );
    const pendingTeamIds = normalizePending(stage.pendingTeamIds, stage.lossCounts);
    participantIds.forEach((teamId) => removePendingTeamEverywhere(pendingTeamIds, teamId));

    return settleTriplePlacements({
      ...stage,
      matches: completedMatches,
      pendingTeamIds,
      runnerUpId: winnerId,
      thirdPlaceId: loserId ?? stage.thirdPlaceId
    });
  }

  const lossCounts = { ...stage.lossCounts };
  const pendingTeamIds = normalizePending(stage.pendingTeamIds, lossCounts);
  let twoLossFinalistId = stage.twoLossFinalistId;
  const eliminatedTeamIds = [...stage.eliminatedTeamIds];

  const winnerLossCount = lossCounts[winnerId] ?? 0;
  enqueuePending(pendingTeamIds, winnerLossCount, winnerId);

  let twoLossCandidateId: string | undefined;
  if (loserId) {
    const loserLossCount = (lossCounts[loserId] ?? 0) + 1;
    lossCounts[loserId] = loserLossCount;

    if (loserLossCount >= 3) {
      if (!eliminatedTeamIds.includes(loserId)) eliminatedTeamIds.push(loserId);
    } else if (loserLossCount === 2 && normalizeGroup(match.bracketGroup) === "one-loss") {
      twoLossCandidateId = loserId;
    } else {
      enqueuePending(pendingTeamIds, loserLossCount, loserId);
    }
  }

  let matches = stage.matches.map((item) =>
    item.id === matchId
      ? {
          ...item,
          scoreA,
          scoreB,
          winnerId,
          loserId,
          eliminatedTeamId: loserId && lossCounts[loserId] >= 3 ? loserId : undefined,
          status: "complete" as const
        }
      : item
  );

  if (twoLossCandidateId) {
    const candidatePending = normalizePending(pendingTeamIds, lossCounts);
    if (shouldReserveTwoLossFinalist(matches, candidatePending, lossCounts)) {
      removePendingTeamEverywhere(candidatePending, twoLossCandidateId);
      pendingTeamIds["0"] = candidatePending["0"];
      pendingTeamIds["1"] = candidatePending["1"];
      pendingTeamIds["2"] = candidatePending["2"];
      twoLossFinalistId = twoLossCandidateId;
    } else {
      enqueuePending(pendingTeamIds, 2, twoLossCandidateId);
    }
  }

  const sanitizedPendingTeamIds = normalizePending(pendingTeamIds, lossCounts);
  const generated = generateReadyMatchesFromPending(
    matches,
    sanitizedPendingTeamIds,
    lossCounts,
    twoLossFinalistId
  );
  matches = [...generated.existingMatches, ...generated.matches];

  return settleTriplePlacements({
    ...stage,
    matches,
    lossCounts,
    pendingTeamIds: generated.pendingTeamIds,
    twoLossFinalistId: generated.twoLossFinalistId,
    eliminatedTeamIds
  });
}

function rebuildTripleEliminationWithResult(
  stage: TripleEliminationStage,
  input: { matchId: string; scoreA?: number; scoreB?: number; winnerId: string }
): TripleEliminationStage {
  const firstRoundMatches = stage.matches
    .filter((match) => match.bracketGroup === "zero-loss" && match.round === 1)
    .map((match) => ({
      ...match,
      scoreA: match.isBye ? match.scoreA : undefined,
      scoreB: match.isBye ? match.scoreB : undefined,
      winnerId: match.isBye ? match.winnerId : undefined,
      loserId: undefined,
      eliminatedTeamId: undefined,
      status: match.isBye ? ("bye" as const) : match.participantA?.teamId && match.participantB?.teamId ? ("ready" as const) : ("pending" as const)
    }));

  const results = stage.matches
    .filter((match) => match.status === "complete" && match.participantA?.teamId && match.participantB?.teamId)
    .map((match) =>
      match.id === input.matchId
        ? { ...input, order: getBracketPlayOrder(match), round: match.round, matchNumber: match.matchNumber }
        : {
            matchId: match.id,
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            winnerId: match.winnerId ?? "",
            order: getBracketPlayOrder(match),
            round: match.round,
            matchNumber: match.matchNumber
          }
    )
    .filter((result) => result.winnerId)
    .sort(
      (left, right) =>
        left.order - right.order ||
        left.round - right.round ||
        left.matchNumber - right.matchNumber ||
        left.matchId.localeCompare(right.matchId)
    );

  const hasInput = results.some((result) => result.matchId === input.matchId);
  if (!hasInput) {
    results.push({
      ...input,
      order: getBracketPlayOrder(stage.matches.find((match) => match.id === input.matchId) ?? {}),
      round: stage.matches.find((match) => match.id === input.matchId)?.round ?? 999,
      matchNumber: stage.matches.find((match) => match.id === input.matchId)?.matchNumber ?? 999
    });
  }

  let nextStage: TripleEliminationStage = {
    ...stage,
    matches: firstRoundMatches,
    lossCounts: Object.fromEntries(stage.teamIds.map((teamId) => [teamId, 0])),
    pendingTeamIds: {
      "0": firstRoundMatches.filter((match) => match.isBye && match.winnerId).map((match) => match.winnerId as string),
      "1": [],
      "2": []
    },
    twoLossFinalistId: undefined,
    eliminatedTeamIds: [],
    championId: undefined,
    runnerUpId: undefined,
    thirdPlaceId: undefined
  };

  const generated = generateReadyMatchesFromPending(
    nextStage.matches,
    normalizePending(nextStage.pendingTeamIds, nextStage.lossCounts),
    nextStage.lossCounts,
    nextStage.twoLossFinalistId
  );
  nextStage = settleTriplePlacements({
    ...nextStage,
    matches: [...generated.existingMatches, ...generated.matches],
    pendingTeamIds: generated.pendingTeamIds,
    twoLossFinalistId: generated.twoLossFinalistId
  });

  results.forEach((result) => {
    const replayMatch = nextStage.matches.find((match) => match.id === result.matchId);
    const participantIds = [replayMatch?.participantA?.teamId, replayMatch?.participantB?.teamId].filter(Boolean);
    if (!replayMatch || !participantIds.includes(result.winnerId)) return;
    nextStage = applyTripleEliminationResult(nextStage, result.matchId, result.scoreA, result.scoreB, result.winnerId);
  });

  return nextStage;
}

export function moveLoserByLossCount(stage: TripleEliminationStage): TripleEliminationStage {
  return stage;
}

export function getParticipantLossCount(stage: TripleEliminationStage, teamId: string): number {
  return stage.lossCounts[teamId] ?? 0;
}

export function getTripleEliminationChampion(stage: TripleEliminationStage): string | undefined {
  return stage.championId;
}

function createInitialMatchesWithByes(teams: Team[]) {
  const participants = createSeededParticipants(teams);
  const matches: BracketStageMatch[] = [];
  const byeWinners: Array<{ teamId: string; matchNumber: number }> = [];

  for (let index = 0; index < participants.length / 2; index += 1) {
    const participantA = participants[index * 2];
    const participantB = participants[index * 2 + 1];
    const teamAId = participantA?.teamId;
    const teamBId = participantB?.teamId;
    const isByeMatch = Boolean((teamAId && participantB?.isBye) || (teamBId && participantA?.isBye));
    const winnerId = isByeMatch ? teamAId ?? teamBId : undefined;

    if (winnerId) byeWinners.push({ teamId: winnerId, matchNumber: index + 1 });

    matches.push({
      id: `triple-0loss-r1-m${index + 1}`,
      round: 1,
      roundName: "0-Loss Round 1",
      matchNumber: index + 1,
      participantA,
      participantB,
      winnerId,
      status: isByeMatch ? "bye" : teamAId && teamBId ? "ready" : "pending",
      isBye: isByeMatch,
      bracketGroup: "zero-loss"
    });
  }

  return { matches: [...matches, ...createInitialByeAdvanceMatches(byeWinners)], byeWinnerIds: [] };
}

function createInitialByeAdvanceMatches(byeWinners: Array<{ teamId: string; matchNumber: number }>): BracketStageMatch[] {
  const byTargetMatch = new Map<number, string[]>();

  byeWinners.forEach(({ teamId, matchNumber }) => {
    const targetMatchNumber = Math.ceil(matchNumber / 2);
    byTargetMatch.set(targetMatchNumber, [...(byTargetMatch.get(targetMatchNumber) ?? []), teamId]);
  });

  return Array.from(byTargetMatch.entries()).map(([matchNumber, teamIds]) => ({
    id: `triple-0loss-r2-m${matchNumber}`,
    round: 2,
    roundName: "0-Loss Round 2",
    matchNumber,
    participantA: { teamId: teamIds[0] },
    participantB: teamIds[1] ? { teamId: teamIds[1] } : undefined,
    status: teamIds.length >= 2 ? ("ready" as const) : ("pending" as const),
    bracketGroup: "zero-loss" as const
  }));
}

function generateReadyMatchesFromPending(
  existingMatches: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>,
  lossCounts?: Record<string, number>,
  twoLossFinalistId?: string
) {
  const matches: BracketStageMatch[] = [];
  let updatedExistingMatches = existingMatches.map((match) => ({ ...match }));
  const nextPending = normalizePending(pendingTeamIds, lossCounts);
  let nextTwoLossFinalistId = twoLossFinalistId;

  [1, 2].forEach((lossCount) => {
    if (shouldHoldSameLossSurvivorsForOpenGroupMatches(updatedExistingMatches, nextPending, lossCount)) {
      return;
    }

    updatedExistingMatches = fillWaitingDropMatches(updatedExistingMatches, matches, nextPending, lossCount);
  });

  updatedExistingMatches = fillWaitingZeroLossMatches(updatedExistingMatches, nextPending);

  [0, 1, 2].forEach((lossCount) => {
    const key = String(lossCount);

    const sameGroupSurvivalMatches = createSameGroupSurvivalMatches(
      updatedExistingMatches,
      matches,
      nextPending,
      lossCount,
      lossCounts
    );
    if (sameGroupSurvivalMatches.length) {
      matches.push(...sameGroupSurvivalMatches);
      return;
    }

    const waitingMatches = createWaitingDropMatches(
      updatedExistingMatches,
      matches,
      nextPending,
      lossCount
    );
    if (waitingMatches.length) {
      matches.push(...waitingMatches);
      return;
    }

    const sameGroupWaitingMatches = createSameGroupWaitingMatches(
      updatedExistingMatches,
      matches,
      nextPending,
      lossCount,
      lossCounts
    );
    if (sameGroupWaitingMatches.length) {
      matches.push(...sameGroupWaitingMatches);
      return;
    }

    const crossRoundWaitingMatches = createCrossRoundWaitingMatches(
      updatedExistingMatches,
      matches,
      nextPending,
      lossCount
    );
    if (crossRoundWaitingMatches.length) {
      matches.push(...crossRoundWaitingMatches);
      return;
    }

    const lowerFinalWaitingMatches = createLowerFinalWaitingMatches(
      updatedExistingMatches,
      matches,
      nextPending,
      lossCount,
      lossCounts
    );
    if (lowerFinalWaitingMatches.length) {
      matches.push(...lowerFinalWaitingMatches);
      return;
    }

    if (
      shouldDelayLossGroupPairing(
        [...updatedExistingMatches, ...matches],
        nextPending,
        lossCount,
        nextTwoLossFinalistId,
        lossCounts
      )
    ) {
      return;
    }

    const round = getTargetRoundForPending(updatedExistingMatches, matches, lossCount);
    let matchNumber = getNextMatchNumber(updatedExistingMatches, matches, lossCount, round);

    while (nextPending[key].length >= 2) {
      const pair =
        lossCount > 0
          ? takeUpperDropPair(nextPending[key], updatedExistingMatches, matches, lossCount)
          : takeBestSameLossPair(nextPending[key], updatedExistingMatches, matches);
      const teamAId = pair?.teamAId;
      const teamBId = pair?.teamBId;
      if (!teamAId || !teamBId) break;

      matches.push({
        id: `triple-${lossCount}loss-r${round}-m${matchNumber}`,
        round,
        roundName: `${lossCount}-Loss Round ${round}`,
        matchNumber,
        participantA: { teamId: teamAId },
        participantB: { teamId: teamBId },
        status: "ready",
        bracketGroup: groupByLossCount[lossCount]
      });
      matchNumber += 1;
    }
  });

  if (nextTwoLossFinalistId) {
    removePendingTeamEverywhere(nextPending, nextTwoLossFinalistId);
    const filledWaitingLowerFinal = fillReservedTwoLossFinalistIntoWaitingMatch(
      updatedExistingMatches,
      matches,
      nextTwoLossFinalistId
    );
    if (filledWaitingLowerFinal) {
      nextTwoLossFinalistId = undefined;
    }

    const hasOpenTwoLossMatch = [...updatedExistingMatches, ...matches].some(
      (match) =>
        normalizeGroup(match.bracketGroup) === "two-loss" &&
        (match.status === "ready" || match.status === "pending")
    );

    if (nextTwoLossFinalistId && !hasOpenTwoLossMatch && nextPending["2"].length === 1) {
      const opponentId = nextPending["2"].shift();
      if (opponentId && opponentId !== nextTwoLossFinalistId) {
        const round = getTargetRoundForPending(updatedExistingMatches, matches, 2);
        const matchNumber = getNextMatchNumber(updatedExistingMatches, matches, 2, round);
        matches.push({
          id: `triple-2loss-final-r${round}-m${matchNumber}`,
          round,
          roundName: "Lower Final",
          matchNumber,
          participantA: { teamId: nextTwoLossFinalistId },
          participantB: { teamId: opponentId },
          status: "ready",
          bracketGroup: "two-loss"
        });
        nextTwoLossFinalistId = undefined;
      }
    }

    const completedLowerWinnerId = getCompletedGroupFinalWinner([...updatedExistingMatches, ...matches], "two-loss");
    const hasOpenTwoLossMatchAfterFinal = [...updatedExistingMatches, ...matches].some(
      (match) =>
        normalizeGroup(match.bracketGroup) === "two-loss" &&
        (match.status === "ready" || match.status === "pending")
    );
    const hasAlreadyPlayedLateLowerFinal =
      completedLowerWinnerId &&
      [...updatedExistingMatches, ...matches].some(
        (match) =>
          normalizeGroup(match.bracketGroup) === "two-loss" &&
          match.roundName === "Lower Final" &&
          match.status === "complete" &&
          matchHasParticipant(match, nextTwoLossFinalistId as string) &&
          matchHasParticipant(match, completedLowerWinnerId)
      );

    if (
      nextTwoLossFinalistId &&
      completedLowerWinnerId &&
      completedLowerWinnerId !== nextTwoLossFinalistId &&
      !hasOpenTwoLossMatchAfterFinal &&
      !hasAlreadyPlayedLateLowerFinal
    ) {
      const round = getTargetRoundForPending(updatedExistingMatches, matches, 2);
      const matchNumber = getNextMatchNumber(updatedExistingMatches, matches, 2, round);
      matches.push({
        id: `triple-2loss-late-final-r${round}-m${matchNumber}`,
        round,
        roundName: "Lower Final",
        matchNumber,
        participantA: { teamId: completedLowerWinnerId },
        participantB: { teamId: nextTwoLossFinalistId },
        status: "ready",
        bracketGroup: "two-loss"
      });
      nextTwoLossFinalistId = undefined;
    }
  }

  const placementChallengeMatches = createPlacementChallengeFinal(
    updatedExistingMatches,
    matches,
    nextPending
  );
  if (placementChallengeMatches.length) {
    matches.push(...placementChallengeMatches);
  }

  const cleaned = removeObsoleteWaitingLowerFinals(updatedExistingMatches, matches);

  return {
    existingMatches: cleaned.existingMatches,
    matches: cleaned.matches,
    pendingTeamIds: nextPending,
    twoLossFinalistId: nextTwoLossFinalistId
  };
}

function createPlacementChallengeFinal(
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>
) {
  const allMatches = [...existingMatches, ...newMatches];
  if (allMatches.some(isPlacementChallengeFinal)) return [];

  const hasOpenMatch = allMatches.some(
    (match) => match.status === "ready" || match.status === "pending"
  );
  if (hasOpenMatch) return [];

  const middleWinnerId = pendingTeamIds["1"]?.[0];
  const lowerWinnerId = pendingTeamIds["2"]?.[0];
  if (!middleWinnerId || !lowerWinnerId || middleWinnerId === lowerWinnerId) return [];

  removePendingTeamEverywhere(pendingTeamIds, middleWinnerId);
  removePendingTeamEverywhere(pendingTeamIds, lowerWinnerId);
  const round = getTargetRoundForPending(existingMatches, newMatches, 1);
  const matchNumber = getNextMatchNumber(existingMatches, newMatches, 1, round);

  return [
    {
      id: `triple-placement-final-r${round}-m${matchNumber}`,
      round,
      roundName: "Middle Final",
      matchNumber,
      participantA: { teamId: middleWinnerId },
      participantB: { teamId: lowerWinnerId },
      status: "ready" as const,
      bracketGroup: "one-loss" as const
    }
  ];
}

function isPlacementChallengeFinal(match: BracketStageMatch) {
  return match.id.startsWith("triple-placement-final");
}

function removeObsoleteWaitingLowerFinals(
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[]
) {
  const hasSettledLowerFinal = [...existingMatches, ...newMatches].some(
    (match) =>
      normalizeGroup(match.bracketGroup) === "two-loss" &&
      match.roundName === "Lower Final" &&
      (match.status === "ready" || match.status === "complete") &&
      Boolean(match.participantA?.teamId) &&
      Boolean(match.participantB?.teamId)
  );
  if (!hasSettledLowerFinal) return { existingMatches, matches: newMatches };

  const isObsoleteWaitingLowerFinal = (match: BracketStageMatch) =>
    normalizeGroup(match.bracketGroup) === "two-loss" &&
    match.roundName === "Lower Final" &&
    match.status === "pending" &&
    Boolean(match.participantA?.teamId) !== Boolean(match.participantB?.teamId);

  return {
    existingMatches: existingMatches.filter((match) => !isObsoleteWaitingLowerFinal(match)),
    matches: newMatches.filter((match) => !isObsoleteWaitingLowerFinal(match))
  };
}

function fillReservedTwoLossFinalistIntoWaitingMatch(
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[],
  finalistId: string
) {
  const waitingMatch = [...existingMatches, ...newMatches].find(
    (match) =>
      normalizeGroup(match.bracketGroup) === "two-loss" &&
      match.status === "pending" &&
      Boolean(match.participantA?.teamId) !== Boolean(match.participantB?.teamId)
  );
  if (!waitingMatch) return false;

  waitingMatch.participantA = waitingMatch.participantA?.teamId ? waitingMatch.participantA : { teamId: finalistId };
  waitingMatch.participantB = waitingMatch.participantB?.teamId ? waitingMatch.participantB : { teamId: finalistId };
  waitingMatch.status = "ready";
  waitingMatch.roundName = "Lower Final";
  return true;
}

function fillWaitingZeroLossMatches(
  existingMatches: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>
) {
  const key = "0";
  const pending = pendingTeamIds[key] ?? [];
  if (!pending.length) return existingMatches;

  const waitingMatches = existingMatches
    .filter(
      (match) =>
        normalizeGroup(match.bracketGroup) === "zero-loss" &&
        match.status === "pending" &&
        Boolean(match.participantA?.teamId) !== Boolean(match.participantB?.teamId)
    )
    .sort((left, right) => left.round - right.round || left.matchNumber - right.matchNumber);
  if (!waitingMatches.length) return existingMatches;

  const usedTeamIds = new Set<string>();
  const assignments = new Map<string, string>();

  waitingMatches.forEach((waitingMatch) => {
    const directSeedWinner = pending.find((teamId) => {
      if (usedTeamIds.has(teamId)) return false;
      const winMatch = getLatestCompletedWinMatch(existingMatches, teamId);
      return (
        winMatch &&
        normalizeGroup(winMatch.bracketGroup) === "zero-loss" &&
        winMatch.round === waitingMatch.round - 1 &&
        Math.ceil(winMatch.matchNumber / 2) === waitingMatch.matchNumber
      );
    });
    const fallbackWinner = directSeedWinner ?? pending.find((teamId) => !usedTeamIds.has(teamId));
    if (!fallbackWinner) return;

    assignments.set(waitingMatch.id, fallbackWinner);
    usedTeamIds.add(fallbackWinner);
  });

  if (!assignments.size) return existingMatches;

  pendingTeamIds[key] = pending.filter((teamId) => !usedTeamIds.has(teamId));

  return existingMatches.map((match) => {
    const fillId = assignments.get(match.id);
    if (!fillId) return match;

    return {
      ...match,
      participantA: match.participantA?.teamId ? match.participantA : { teamId: fillId },
      participantB: match.participantB?.teamId ? match.participantB : { teamId: fillId },
      status: "ready" as const
    };
  });
}

function fillWaitingDropMatches(
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>,
  lossCount: number
) {
  if (lossCount === 0) {
    return fillWaitingZeroLossMatches(existingMatches, pendingTeamIds);
  }

  const group = groupByLossCount[lossCount];
  const upperGroup = groupByLossCount[lossCount - 1];
  const waitingMatches = existingMatches.filter(
    (match) =>
      normalizeGroup(match.bracketGroup) === group &&
      match.status === "pending" &&
      Boolean(match.participantA?.teamId) !== Boolean(match.participantB?.teamId)
  );
  if (!waitingMatches.length) return existingMatches;

  const key = String(lossCount);
  if (lossCount === 2) {
    const currentGroupSurvivors = (pendingTeamIds[key] ?? []).filter((teamId) =>
      hasWonInGroup(existingMatches, teamId, group)
    );
    if (currentGroupSurvivors.length >= 2) return existingMatches;
  }

  const waitingTeamIds = new Set(
    waitingMatches
      .flatMap((match) => [match.participantA?.teamId, match.participantB?.teamId])
      .filter(Boolean) as string[]
  );
  const dropIds = (pendingTeamIds[key] ?? []).filter(
    (teamId) =>
      latestLossGroup(existingMatches, teamId) === upperGroup &&
      !hasWonInGroup(existingMatches, teamId, group) &&
      !waitingTeamIds.has(teamId)
  );
  const canFillStandardTwoLossSurvivalSlot =
    lossCount === 2 &&
    waitingMatches.some((match) => match.round > 1);
  const fallbackSurvivorIds =
    dropIds.length || (getOpenGroupMatchCount(existingMatches, upperGroup) && !canFillStandardTwoLossSurvivalSlot)
      ? []
      : (pendingTeamIds[key] ?? []).filter(
          (teamId) => hasWonInGroup(existingMatches, teamId, group) && !waitingTeamIds.has(teamId)
        );
  const isUsingDropIds = dropIds.length > 0;
  const fillIds = isUsingDropIds ? dropIds : fallbackSurvivorIds;
  if (!fillIds.length) return existingMatches;

  const assignableWaitingMatches =
    isUsingDropIds && lossCount === 2
      ? waitingMatches.filter((match) => match.roundName !== "Lower Final")
      : waitingMatches;

  const assignments = assignFillIdsToWaitingMatches(
    assignableWaitingMatches,
    fillIds,
    existingMatches,
    newMatches,
    {
      group,
      upperGroup,
      lossCount,
      isUsingDropIds
    }
  );
  const usedFillIds = new Set(assignments.values());
  const updatedMatches = existingMatches.map((match) => {
    if (
      normalizeGroup(match.bracketGroup) !== group ||
      match.status !== "pending" ||
      Boolean(match.participantA?.teamId) === Boolean(match.participantB?.teamId)
    ) {
      return match;
    }

    const waitingTeamId = match.participantA?.teamId ?? match.participantB?.teamId;
    if (!waitingTeamId) return match;
    if (!isUsingDropIds && lossCount === 2 && match.round <= 1) {
      return match;
    }

    const fillId = assignments.get(match.id);
    if (!fillId) return match;

    return {
      ...match,
      participantA: match.participantA?.teamId ? match.participantA : { teamId: fillId },
      participantB: match.participantB?.teamId ? match.participantB : { teamId: fillId },
      status: "ready" as const
    };
  });

  pendingTeamIds[key] = (pendingTeamIds[key] ?? []).filter((teamId) => !usedFillIds.has(teamId));
  return updatedMatches;
}

function createCrossRoundWaitingMatches(
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>,
  lossCount: number
) {
  if (lossCount !== 2) return [];

  const group = groupByLossCount[lossCount];
  const sourceGroup = groupByLossCount[lossCount - 1];
  const key = String(lossCount);
  const pending = pendingTeamIds[key] ?? [];
  if (!pending.length) return [];

  const existingReadyTwoLossMatch = [...existingMatches, ...newMatches].some(
    (match) =>
      normalizeGroup(match.bracketGroup) === group &&
      match.status === "ready" &&
      Boolean(match.participantA?.teamId) &&
      Boolean(match.participantB?.teamId)
  );
  if (existingReadyTwoLossMatch) return [];

  const existingWaitingTeamIds = new Set(
    [...existingMatches, ...newMatches]
      .filter(
        (match) =>
          normalizeGroup(match.bracketGroup) === group &&
          match.status === "pending" &&
          Boolean(match.participantA?.teamId) !== Boolean(match.participantB?.teamId)
      )
      .flatMap((match) => [match.participantA?.teamId, match.participantB?.teamId])
      .filter(Boolean) as string[]
  );

  const sourceLossEntries = pending
    .map((teamId) => {
      if (existingWaitingTeamIds.has(teamId)) return undefined;
      if (hasWonInGroup(existingMatches, teamId, group)) return undefined;
      const latestLoss = getLatestLossMatch(existingMatches, teamId);
      return latestLoss && normalizeGroup(latestLoss.bracketGroup) === sourceGroup
        ? { teamId, round: latestLoss.round, matchNumber: latestLoss.matchNumber }
        : undefined;
    })
    .filter(Boolean) as Array<{ teamId: string; round: number; matchNumber: number }>;

  if (!sourceLossEntries.length) return [];

  const sourceRounds = new Set(sourceLossEntries.map((entry) => entry.round));
  if (sourceRounds.size >= 2) return [];
  if (!getOpenGroupMatchCount([...existingMatches, ...newMatches], sourceGroup)) return [];

  const round = getTargetRoundForPending(existingMatches, newMatches, lossCount);
  let matchNumber = getNextMatchNumber(existingMatches, newMatches, lossCount, round);

  return sourceLossEntries
    .sort((left, right) => left.matchNumber - right.matchNumber)
    .map((entry) => {
      removePendingTeamEverywhere(pendingTeamIds, entry.teamId);
      const match: BracketStageMatch = {
        id: `triple-${lossCount}loss-r${round}-m${matchNumber}`,
        round,
        roundName: `${lossCount}-Loss Round ${round}`,
        matchNumber,
        participantA: { teamId: entry.teamId },
        participantB: undefined,
        status: "pending",
        bracketGroup: group
      };
      matchNumber += 1;
      return match;
    });
}

function createLowerFinalWaitingMatches(
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>,
  lossCount: number,
  lossCounts?: Record<string, number>
) {
  if (lossCount !== 2) return [];

  const group = groupByLossCount[lossCount];
  const upperGroup = groupByLossCount[lossCount - 1];
  const key = String(lossCount);
  const pending = pendingTeamIds[key] ?? [];
  const currentGroupSurvivors = pending.filter((teamId) => hasWonInGroup(existingMatches, teamId, group));
  if (currentGroupSurvivors.length !== 1) return [];

  const hasOpenTwoLossMatch = [...existingMatches, ...newMatches].some(
    (match) =>
      normalizeGroup(match.bracketGroup) === group &&
      (match.status === "ready" || match.status === "pending")
  );
  if (hasOpenTwoLossMatch) return [];

  const hasFutureUpperDrop =
    getOpenGroupMatchCount([...existingMatches, ...newMatches], upperGroup) > 0 ||
    pending.some((teamId) => latestLossGroup(existingMatches, teamId) === upperGroup);
  if (!hasFutureUpperDrop) return [];

  const futureUpperDropCount =
    getOpenGroupMatchCount([...existingMatches, ...newMatches], upperGroup) +
    pending.filter(
      (teamId) =>
        latestLossGroup(existingMatches, teamId) === upperGroup &&
        !hasWonInGroup(existingMatches, teamId, group)
    ).length;
  if (futureUpperDropCount >= 2) return [];

  const round = getTargetRoundForPending(existingMatches, newMatches, lossCount);
  const teamCount = Math.max(2, Object.keys(lossCounts ?? {}).length);
  const expectedRoundMatchCount =
    getTripleLossGroupMatchCountByRound(teamCount, lossCount)[round] ??
    getLossGroupFirstRoundMatchCount(teamCount, lossCount);
  if (expectedRoundMatchCount > 1) return [];

  const survivorId = currentGroupSurvivors[0];
  removePendingTeamEverywhere(pendingTeamIds, survivorId);
  const matchNumber = getNextMatchNumber(existingMatches, newMatches, lossCount, round);

  return [
    {
      id: `triple-${lossCount}loss-final-wait-r${round}-m${matchNumber}`,
      round,
      roundName: `${lossCount}-Loss Round ${round}`,
      matchNumber,
      participantA: { teamId: survivorId },
      participantB: undefined,
      status: "pending" as const,
      bracketGroup: group
    }
  ];
}

function isCompatibleTwoLossCrossFill(
  existingMatches: BracketStageMatch[],
  waitingTeamId: string,
  fillTeamId: string
) {
  const waitingLoss = getLatestLossMatch(existingMatches, waitingTeamId);
  const fillLoss = getLatestLossMatch(existingMatches, fillTeamId);
  if (!waitingLoss || !fillLoss) return true;
  if (normalizeGroup(waitingLoss.bracketGroup) !== "one-loss") return true;
  if (normalizeGroup(fillLoss.bracketGroup) !== "one-loss") return true;

  return waitingLoss.round !== fillLoss.round;
}

function createWaitingDropMatches(
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>,
  lossCount: number
) {
  if (lossCount <= 0) return [];
  if (lossCount === 2) return [];

  const group = groupByLossCount[lossCount];
  const upperGroup = groupByLossCount[lossCount - 1];
  const key = String(lossCount);
  const pending = pendingTeamIds[key] ?? [];
  const currentGroupSurvivors = pending.filter((teamId) => hasWonInGroup(existingMatches, teamId, group));
  if (!currentGroupSurvivors.length) return [];
  if (
    shouldHoldSameLossSurvivorsForOpenGroupMatches(
      [...existingMatches, ...newMatches],
      pendingTeamIds,
      lossCount
    )
  ) {
    return [];
  }

  const currentGroupSurvivorSet = new Set(currentGroupSurvivors);
  const upperGroupDrops = pending.filter(
    (teamId) =>
      latestLossGroup(existingMatches, teamId) === upperGroup &&
      !currentGroupSurvivorSet.has(teamId)
  );
  if (upperGroupDrops.length) return [];

  const openUpperMatchCount = getOpenGroupMatchCount(existingMatches, upperGroup);
  if (!openUpperMatchCount) return [];

  const existingWaitingTeamIds = new Set(
    [...existingMatches, ...newMatches]
      .filter(
        (match) =>
          normalizeGroup(match.bracketGroup) === group &&
          match.status === "pending" &&
          Boolean(match.participantA?.teamId) !== Boolean(match.participantB?.teamId)
      )
      .flatMap((match) => [match.participantA?.teamId, match.participantB?.teamId])
      .filter(Boolean) as string[]
  );
  const waitingSurvivors = currentGroupSurvivors.filter((teamId) => !existingWaitingTeamIds.has(teamId));
  const slotCount = Math.min(waitingSurvivors.length, openUpperMatchCount);
  if (!slotCount) return [];

  const round = getTargetRoundForPending(existingMatches, newMatches, lossCount);
  let matchNumber = getNextMatchNumber(existingMatches, newMatches, lossCount, round);
  const waitingMatches: BracketStageMatch[] = [];

  waitingSurvivors.slice(0, slotCount).forEach((teamId) => {
    removePendingTeamEverywhere(pendingTeamIds, teamId);
    waitingMatches.push({
      id: `triple-${lossCount}loss-r${round}-m${matchNumber}`,
      round,
      roundName: `${lossCount}-Loss Round ${round}`,
      matchNumber,
      participantA: { teamId },
      participantB: undefined,
      status: "pending",
      bracketGroup: group
    });
    matchNumber += 1;
  });

  return waitingMatches;
}

function shouldHoldSameLossSurvivorsForOpenGroupMatches(
  matches: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>,
  lossCount: number
) {
  if (lossCount !== 1) return false;

  const group = groupByLossCount[lossCount];
  const currentGroupSurvivors = (pendingTeamIds[String(lossCount)] ?? []).filter((teamId) =>
    hasWonInGroup(matches, teamId, group)
  );
  if (!currentGroupSurvivors.length) return false;

  return matches.some(
    (match) =>
      normalizeGroup(match.bracketGroup) === group &&
      match.status === "ready" &&
      Boolean(match.participantA?.teamId) &&
      Boolean(match.participantB?.teamId)
  );
}

function matchHasParticipant(match: BracketStageMatch, teamId: string) {
  return match.participantA?.teamId === teamId || match.participantB?.teamId === teamId;
}

function createSameGroupSurvivalMatches(
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>,
  lossCount: number,
  lossCounts?: Record<string, number>
) {
  if (lossCount !== 1 && lossCount !== 2) return [];

  const group = groupByLossCount[lossCount];
  const key = String(lossCount);
  const pending = pendingTeamIds[key] ?? [];
  const currentGroupSurvivors = pending.filter(
    (teamId) =>
      hasWonInGroup(existingMatches, teamId, group) &&
      (lossCount === 2 || getLatestGroupWinRound(existingMatches, teamId, group) > 1)
  );
  if (currentGroupSurvivors.length < 2) return [];

  const upperGroup = groupByLossCount[lossCount - 1];
  const hasUpperDropPressure =
    getOpenGroupMatchCount(existingMatches, upperGroup) > 0 ||
    pending.some((teamId) => latestLossGroup(existingMatches, teamId) === upperGroup);
  if (lossCount === 1 && !hasUpperDropPressure) return [];

  const round = getTargetRoundForPending(existingMatches, newMatches, lossCount);
  const teamCount = Math.max(2, Object.keys(lossCounts ?? {}).length);
  const expectedRoundMatchCount =
    getTripleLossGroupMatchCountByRound(teamCount, lossCount)[round] ??
    getLossGroupFirstRoundMatchCount(teamCount, lossCount);
  const existingTargetRoundMatchCount = [...existingMatches, ...newMatches].filter(
    (match) =>
      normalizeGroup(match.bracketGroup) === group &&
      match.round === round &&
      (match.status === "ready" || match.status === "pending")
  ).length;
  if (existingTargetRoundMatchCount >= expectedRoundMatchCount) return [];

  let matchNumber = getNextMatchNumber(existingMatches, newMatches, lossCount, round);
  const queue = currentGroupSurvivors.slice();
  const matches: BracketStageMatch[] = [];
  const protectedWaitingTeamId =
    lossCount === 2 && queue.length % 2 === 1
      ? takeMostAdvancedSameLossSurvivor(queue, existingMatches, group)
      : undefined;

  while (queue.length >= 2 && existingTargetRoundMatchCount + matches.length < expectedRoundMatchCount) {
    const pair = takeBestSameLossPair(queue, existingMatches, newMatches);
    if (!pair) break;
    removePendingTeamEverywhere(pendingTeamIds, pair.teamAId);
    removePendingTeamEverywhere(pendingTeamIds, pair.teamBId);
    matches.push({
      id: `triple-${lossCount}loss-r${round}-m${matchNumber}`,
      round,
      roundName: `${lossCount}-Loss Round ${round}`,
      matchNumber,
      participantA: { teamId: pair.teamAId },
      participantB: { teamId: pair.teamBId },
      status: "ready",
      bracketGroup: group
    });
    matchNumber += 1;
  }

  if (protectedWaitingTeamId && matches.length === 0) {
    queue.push(protectedWaitingTeamId);
  }

  return matches;
}

function createSameGroupWaitingMatches(
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>,
  lossCount: number,
  lossCounts?: Record<string, number>
) {
  if (lossCount !== 2) return [];

  const group = groupByLossCount[lossCount];
  const key = String(lossCount);
  const pending = pendingTeamIds[key] ?? [];
  const currentGroupSurvivors = pending.filter((teamId) => hasWonInGroup(existingMatches, teamId, group));
  if (!currentGroupSurvivors.length) return [];
  if (!getOpenGroupMatchCount([...existingMatches, ...newMatches], group)) return [];

  const round = getTargetRoundForPending(existingMatches, newMatches, lossCount);
  const teamCount = Math.max(2, Object.keys(lossCounts ?? {}).length);
  const expectedRoundMatchCount =
    getTripleLossGroupMatchCountByRound(teamCount, lossCount)[round] ??
    getLossGroupFirstRoundMatchCount(teamCount, lossCount);
  const targetRoundMatchCount = [...existingMatches, ...newMatches].filter(
    (match) =>
      normalizeGroup(match.bracketGroup) === group &&
      match.round === round &&
      (match.status === "ready" || match.status === "pending")
  ).length;
  if (expectedRoundMatchCount <= 1 || targetRoundMatchCount >= expectedRoundMatchCount) return [];

  const existingWaitingTeamIds = new Set(
    [...existingMatches, ...newMatches]
      .filter(
        (match) =>
          normalizeGroup(match.bracketGroup) === group &&
          match.status === "pending" &&
          Boolean(match.participantA?.teamId) !== Boolean(match.participantB?.teamId)
      )
      .flatMap((match) => [match.participantA?.teamId, match.participantB?.teamId])
      .filter(Boolean) as string[]
  );
  if (existingWaitingTeamIds.size) return [];

  const waitingSurvivor = currentGroupSurvivors.find((teamId) => !existingWaitingTeamIds.has(teamId));
  if (!waitingSurvivor) return [];

  const matchNumber = getNextMatchNumber(existingMatches, newMatches, lossCount, round);
  removePendingTeamEverywhere(pendingTeamIds, waitingSurvivor);

  return [
    {
      id: `triple-${lossCount}loss-r${round}-m${matchNumber}`,
      round,
      roundName: `${lossCount}-Loss Round ${round}`,
      matchNumber,
      participantA: { teamId: waitingSurvivor },
      participantB: undefined,
      status: "pending" as const,
      bracketGroup: group
    }
  ];
}

function getOpenGroupMatchCount(matches: BracketStageMatch[], group: BracketGroup) {
  return matches.filter(
    (match) =>
      normalizeGroup(match.bracketGroup) === group &&
      (match.status === "ready" || match.status === "pending")
  ).length;
}

function findBestDropForWaitingTeam(
  waitingTeamId: string,
  dropIds: string[],
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[]
) {
  if (!dropIds.length) return undefined;
  return (
    dropIds.find((dropId) => !haveTeamsPlayed(existingMatches, newMatches, waitingTeamId, dropId)) ??
    dropIds[0]
  );
}

function assignFillIdsToWaitingMatches(
  waitingMatches: BracketStageMatch[],
  fillIds: string[],
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[],
  options: {
    group: BracketGroup;
    upperGroup: BracketGroup;
    lossCount: number;
    isUsingDropIds: boolean;
  }
) {
  const singleSlotMatches = waitingMatches.filter(
    (match) => Boolean(match.participantA?.teamId) !== Boolean(match.participantB?.teamId)
  );
  if (!singleSlotMatches.length || !fillIds.length) return new Map<string, string>();

  const candidateRows = singleSlotMatches.map((match) => {
    const waitingTeamId = match.participantA?.teamId ?? match.participantB?.teamId ?? "";
    const compatibleFillIds =
      options.isUsingDropIds && options.lossCount === 2
        ? fillIds.filter((teamId) => isCompatibleTwoLossCrossFill(existingMatches, waitingTeamId, teamId))
        : fillIds;
    const shouldWaitForNonRematch =
      options.isUsingDropIds &&
      options.lossCount === 2 &&
      getOpenGroupMatchCount(existingMatches, options.upperGroup) > 0;
    const candidateFillIds = shouldWaitForNonRematch
      ? compatibleFillIds.filter((teamId) => !haveTeamsPlayed(existingMatches, newMatches, waitingTeamId, teamId))
      : compatibleFillIds;

    return {
      match,
      waitingTeamId,
      candidateFillIds
    };
  });

  if (candidateRows.length > 8 || fillIds.length > 8) {
    const assignments = new Map<string, string>();
    const usedFillIds = new Set<string>();
    candidateRows.forEach((row) => {
      const fillId = findBestDropForWaitingTeam(
        row.waitingTeamId,
        row.candidateFillIds.filter((teamId) => !usedFillIds.has(teamId)),
        existingMatches,
        newMatches
      );
      if (!fillId) return;
      usedFillIds.add(fillId);
      assignments.set(row.match.id, fillId);
    });
    return assignments;
  }

  let bestAssignments = new Map<string, string>();
  let bestAssignedCount = -1;
  let bestScore = Number.POSITIVE_INFINITY;

  const search = (rowIndex: number, usedFillIds: Set<string>, assignments: Map<string, string>, score: number) => {
    if (rowIndex >= candidateRows.length) {
      const assignedCount = assignments.size;
      if (assignedCount > bestAssignedCount || (assignedCount === bestAssignedCount && score < bestScore)) {
        bestAssignedCount = assignedCount;
        bestScore = score;
        bestAssignments = new Map(assignments);
      }
      return;
    }

    const row = candidateRows[rowIndex];
    search(rowIndex + 1, usedFillIds, assignments, score + 20);

    row.candidateFillIds.forEach((fillId) => {
      if (usedFillIds.has(fillId)) return;

      usedFillIds.add(fillId);
      assignments.set(row.match.id, fillId);
      search(
        rowIndex + 1,
        usedFillIds,
        assignments,
        score + getWaitingFillPairScore(row.waitingTeamId, fillId, existingMatches, newMatches)
      );
      assignments.delete(row.match.id);
      usedFillIds.delete(fillId);
    });
  };

  search(0, new Set<string>(), new Map<string, string>(), 0);
  return bestAssignments;
}

function getWaitingFillPairScore(
  waitingTeamId: string,
  fillTeamId: string,
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[]
) {
  const waitingLoss = getLatestLossMatch(existingMatches, waitingTeamId);
  const fillLoss = getLatestLossMatch(existingMatches, fillTeamId);
  const waitingWin = getLatestCompletedWinMatch(existingMatches, waitingTeamId);
  const fillWin = getLatestCompletedWinMatch(existingMatches, fillTeamId);
  let score = 0;

  if (haveTeamsPlayed(existingMatches, newMatches, waitingTeamId, fillTeamId)) score += 1000;

  if (waitingLoss && fillLoss) {
    if (normalizeGroup(waitingLoss.bracketGroup) === normalizeGroup(fillLoss.bracketGroup)) {
      if (waitingLoss.round === fillLoss.round && waitingLoss.matchNumber === fillLoss.matchNumber) score += 300;
      score += Math.max(0, 8 - Math.abs(waitingLoss.matchNumber - fillLoss.matchNumber));
    }
    score += fillLoss.round * 4;
  }

  if (waitingWin && fillWin && normalizeGroup(waitingWin.bracketGroup) === normalizeGroup(fillWin.bracketGroup)) {
    if (waitingWin.round === fillWin.round && waitingWin.matchNumber === fillWin.matchNumber) score += 160;
    score += Math.max(0, 6 - Math.abs(waitingWin.matchNumber - fillWin.matchNumber));
  }

  return score;
}

function shouldDelayLossGroupPairing(
  matches: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>,
  lossCount: number,
  twoLossFinalistId?: string,
  lossCounts?: Record<string, number>
) {
  if (lossCount === 0) return false;

  if (shouldWaitForUpperDrop(matches, pendingTeamIds, lossCount)) {
    return true;
  }

  if (lossCount === 2 && !twoLossFinalistId) {
    return true;
  }

  const group = groupByLossCount[lossCount];
  const hasOpenGroupMatch = matches.some(
    (match) =>
      normalizeGroup(match.bracketGroup) === group &&
      (match.status === "ready" || match.status === "pending")
  );
  if (!hasOpenGroupMatch) return false;

  const teamCount = Math.max(2, Object.keys(lossCounts ?? {}).length);
  const targetRound = getTargetRoundForPending(matches, [], lossCount);
  const targetRoundMatchCount =
    getTripleLossGroupMatchCountByRound(teamCount, lossCount as 1 | 2)[targetRound] ??
    getLossGroupFirstRoundMatchCount(teamCount, lossCount as 1 | 2);
  const targetRoundMatches = matches.filter(
    (match) => normalizeGroup(match.bracketGroup) === group && match.round === targetRound
  );
  const canStillFillTargetRound =
    targetRoundMatches.length < targetRoundMatchCount &&
    (pendingTeamIds[String(lossCount)] ?? []).length >= 2;

  return !canStillFillTargetRound;
}

function shouldWaitForUpperDrop(
  matches: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>,
  lossCount: number
) {
  if (lossCount <= 0) return false;

  const group = groupByLossCount[lossCount];
  const upperGroup = groupByLossCount[lossCount - 1];
  const pending = pendingTeamIds[String(lossCount)] ?? [];
  const currentGroupSurvivors = pending.filter((teamId) => hasWonInGroup(matches, teamId, group));
  if (!currentGroupSurvivors.length) return false;

  const currentGroupSurvivorSet = new Set(currentGroupSurvivors);
  const upperGroupDrops = pending.filter(
    (teamId) =>
      latestLossGroup(matches, teamId) === upperGroup &&
      !currentGroupSurvivorSet.has(teamId)
  );
  if (upperGroupDrops.length) return false;

  return matches.some(
    (match) =>
      normalizeGroup(match.bracketGroup) === upperGroup &&
      (match.status === "ready" || match.status === "pending")
  );
}

function enqueuePending(pendingTeamIds: Record<string, string[]>, lossCount: number, teamId: string) {
  if (lossCount >= 3) return;
  const key = String(lossCount);
  removePendingTeamEverywhere(pendingTeamIds, teamId);
  if (!pendingTeamIds[key]) pendingTeamIds[key] = [];
  if (!pendingTeamIds[key].includes(teamId)) pendingTeamIds[key].push(teamId);
}

function normalizePending(
  pendingTeamIds?: Record<string, string[]>,
  lossCounts?: Record<string, number>
): Record<string, string[]> {
  const normalized: Record<string, string[]> = { "0": [], "1": [], "2": [] };
  const seen = new Set<string>();

  [0, 1, 2].forEach((lossCount) => {
    const key = String(lossCount);
    (pendingTeamIds?.[key] ?? []).forEach((teamId) => {
      if (!teamId || seen.has(teamId)) return;
      seen.add(teamId);
      const currentLossCount = lossCounts?.[teamId];
      const targetLossCount =
        currentLossCount !== undefined && currentLossCount >= 0 && currentLossCount <= 2
          ? currentLossCount
          : lossCount;
      normalized[String(targetLossCount)].push(teamId);
    });
  });

  return normalized;
}

function removePendingTeamEverywhere(pendingTeamIds: Record<string, string[]>, teamId: string) {
  [0, 1, 2].forEach((lossCount) => {
    const key = String(lossCount);
    pendingTeamIds[key] = (pendingTeamIds[key] ?? []).filter((pendingTeamId) => pendingTeamId !== teamId);
  });
}

function takeBestSameLossPair(
  teamIds: string[],
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[]
) {
  if (teamIds.length < 2) return undefined;

  let bestPair = {
    leftIndex: 0,
    rightIndex: 1,
    score: getSameLossPairScore(teamIds[0], teamIds[1], existingMatches, newMatches)
  };

  for (let leftIndex = 0; leftIndex < teamIds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < teamIds.length; rightIndex += 1) {
      const teamAId = teamIds[leftIndex];
      const teamBId = teamIds[rightIndex];
      const score = getSameLossPairScore(teamAId, teamBId, existingMatches, newMatches);

      if (score < bestPair.score) {
        bestPair = { leftIndex, rightIndex, score };
      }
    }
  }

  const [rightTeamId] = teamIds.splice(bestPair.rightIndex, 1);
  const [leftTeamId] = teamIds.splice(bestPair.leftIndex, 1);
  if (!leftTeamId || !rightTeamId) return undefined;

  return { teamAId: leftTeamId, teamBId: rightTeamId };
}

function takeMostAdvancedSameLossSurvivor(
  teamIds: string[],
  existingMatches: BracketStageMatch[],
  group: BracketGroup
) {
  if (teamIds.length < 3) return undefined;

  let bestIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;

  teamIds.forEach((teamId, index) => {
    const latestWin = getLatestCompletedWinMatch(existingMatches, teamId);
    const latestLoss = getLatestLossMatch(existingMatches, teamId);
    const latestGroupWinRound = getLatestGroupWinRound(existingMatches, teamId, group);
    let score = latestGroupWinRound * 100;

    if (latestWin && normalizeGroup(latestWin.bracketGroup) === group) {
      score += latestWin.matchNumber;
    }
    if (latestLoss) {
      score += latestLoss.round * 4 + latestLoss.matchNumber;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  if (bestIndex < 0) return undefined;
  const [teamId] = teamIds.splice(bestIndex, 1);
  return teamId;
}

function takeUpperDropPair(
  teamIds: string[],
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[],
  lossCount: number
) {
  if (teamIds.length < 2) return undefined;

  const currentGroup = groupByLossCount[lossCount];
  const upperGroup = groupByLossCount[lossCount - 1];
  const currentGroupSurvivors = teamIds.filter((teamId) => hasWonInGroup(existingMatches, teamId, currentGroup));
  const currentGroupSurvivorSet = new Set(currentGroupSurvivors);
  const upperGroupDrops = teamIds.filter(
    (teamId) =>
      latestLossGroup(existingMatches, teamId) === upperGroup &&
      !currentGroupSurvivorSet.has(teamId)
  );

  if (lossCount === 2 && !currentGroupSurvivors.length) {
    const crossRoundPair = takeCrossLossRoundPair(teamIds, existingMatches, newMatches, upperGroup);
    if (crossRoundPair) return crossRoundPair;
  }

  if (currentGroupSurvivors.length && upperGroupDrops.length) {
    const bestPair = findBestCrossPair(teamIds, currentGroupSurvivors, upperGroupDrops, existingMatches, newMatches);
    if (bestPair) return bestPair;
  }

  return takeBestSameLossPair(teamIds, existingMatches, newMatches);
}

function takeCrossLossRoundPair(
  teamIds: string[],
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[],
  sourceGroup: BracketGroup
) {
  const entries = teamIds
    .map((teamId) => {
      const latestLoss = getLatestLossMatch(existingMatches, teamId);
      return latestLoss && normalizeGroup(latestLoss.bracketGroup) === sourceGroup
        ? {
            teamId,
            round: latestLoss.round,
            matchNumber: latestLoss.matchNumber
          }
        : undefined;
    })
    .filter(Boolean) as Array<{ teamId: string; round: number; matchNumber: number }>;

  const rounds = Array.from(new Set(entries.map((entry) => entry.round))).sort((left, right) => left - right);
  if (rounds.length < 2) return undefined;

  const earlyRound = rounds[0];
  const lateRound = rounds[rounds.length - 1];
  const earlyPool = entries
    .filter((entry) => entry.round === earlyRound)
    .sort((left, right) => left.matchNumber - right.matchNumber);
  const latePool = entries
    .filter((entry) => entry.round === lateRound)
    .sort((left, right) => left.matchNumber - right.matchNumber);

  const pairCount = Math.min(earlyPool.length, latePool.length);
  const bestLateOrder = findBestCrossRoundOrder(
    earlyPool.slice(0, pairCount).map((entry) => entry.teamId),
    latePool.slice(0, pairCount).map((entry) => entry.teamId),
    existingMatches,
    newMatches
  );
  const earlyTeamId = earlyPool.find((entry) => teamIds.includes(entry.teamId))?.teamId;
  const lateTeamId = bestLateOrder.find((teamId) => teamIds.includes(teamId));
  if (!earlyTeamId || !lateTeamId) return undefined;

  removeTeamIdFromList(teamIds, earlyTeamId);
  removeTeamIdFromList(teamIds, lateTeamId);
  return { teamAId: earlyTeamId, teamBId: lateTeamId };
}

function findBestCrossRoundOrder(
  earlyTeamIds: string[],
  lateTeamIds: string[],
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[]
) {
  if (earlyTeamIds.length !== lateTeamIds.length || earlyTeamIds.length <= 1) return lateTeamIds;
  if (lateTeamIds.length > 8) {
    const remainingLateTeamIds = lateTeamIds.slice();
    return earlyTeamIds.map((earlyTeamId) => {
      const matchIndex = remainingLateTeamIds.findIndex(
        (lateTeamId) => !haveTeamsPlayed(existingMatches, newMatches, earlyTeamId, lateTeamId)
      );
      const index = matchIndex >= 0 ? matchIndex : 0;
      const [lateTeamId] = remainingLateTeamIds.splice(index, 1);
      return lateTeamId;
    });
  }

  let bestOrder = lateTeamIds;
  let bestRematchCount = Number.POSITIVE_INFINITY;

  getPermutations(lateTeamIds).forEach((order) => {
    const rematchCount = order.reduce(
      (count, lateTeamId, index) =>
        count + (haveTeamsPlayed(existingMatches, newMatches, earlyTeamIds[index], lateTeamId) ? 1 : 0),
      0
    );
    if (rematchCount < bestRematchCount) {
      bestRematchCount = rematchCount;
      bestOrder = order;
    }
  });

  return bestOrder;
}

function getPermutations<T>(items: T[]) {
  if (items.length <= 1) return [items];
  const permutations: T[][] = [];

  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    getPermutations(rest).forEach((permutation) => {
      permutations.push([item, ...permutation]);
    });
  });

  return permutations;
}

function removeTeamIdFromList(teamIds: string[], teamId: string) {
  const index = teamIds.indexOf(teamId);
  if (index >= 0) teamIds.splice(index, 1);
}

function findBestCrossPair(
  teamIds: string[],
  leftPool: string[],
  rightPool: string[],
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[]
) {
  let bestPair: { leftIndex: number; rightIndex: number; hasRematch: boolean } | undefined;

  leftPool.forEach((leftTeamId) => {
    rightPool.forEach((rightTeamId) => {
      const leftIndex = teamIds.indexOf(leftTeamId);
      const rightIndex = teamIds.indexOf(rightTeamId);
      if (leftIndex < 0 || rightIndex < 0 || leftIndex === rightIndex) return;

      const hasRematch = haveTeamsPlayed(existingMatches, newMatches, leftTeamId, rightTeamId);
      if (!bestPair || (!hasRematch && bestPair.hasRematch)) {
        bestPair = { leftIndex, rightIndex, hasRematch };
      }
    });
  });

  if (!bestPair) return undefined;

  const firstIndex = Math.max(bestPair.leftIndex, bestPair.rightIndex);
  const secondIndex = Math.min(bestPair.leftIndex, bestPair.rightIndex);
  const [firstTeamId] = teamIds.splice(firstIndex, 1);
  const [secondTeamId] = teamIds.splice(secondIndex, 1);

  return bestPair.leftIndex < bestPair.rightIndex
    ? { teamAId: secondTeamId, teamBId: firstTeamId }
    : { teamAId: firstTeamId, teamBId: secondTeamId };
}

function hasWonInGroup(matches: BracketStageMatch[], teamId: string, group: BracketGroup) {
  return matches.some(
    (match) =>
      match.status === "complete" &&
      normalizeGroup(match.bracketGroup) === group &&
      match.winnerId === teamId
  );
}

function getLatestGroupWinRound(matches: BracketStageMatch[], teamId: string, group: BracketGroup) {
  const completedWins = matches.filter(
    (match) =>
      match.status === "complete" &&
      normalizeGroup(match.bracketGroup) === group &&
      match.winnerId === teamId
  );
  if (!completedWins.length) return 0;
  return Math.max(...completedWins.map((match) => match.round));
}

function latestLossGroup(matches: BracketStageMatch[], teamId: string): BracketGroup | undefined {
  const latestLoss = getLatestLossMatch(matches, teamId);

  return normalizeGroup(latestLoss?.bracketGroup);
}

function getLatestLossMatch(matches: BracketStageMatch[], teamId: string) {
  return [...matches].reverse().find((match) => match.status === "complete" && match.loserId === teamId);
}

function getLatestCompletedWinMatch(matches: BracketStageMatch[], teamId: string) {
  return [...matches].reverse().find((match) => match.status === "complete" && match.winnerId === teamId);
}

function haveTeamsPlayed(
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[],
  teamAId: string,
  teamBId: string
) {
  return [...existingMatches, ...newMatches].some((match) => {
    const leftId = match.participantA?.teamId;
    const rightId = match.participantB?.teamId;
    return (
      match.status === "complete" &&
      ((leftId === teamAId && rightId === teamBId) || (leftId === teamBId && rightId === teamAId))
    );
  });
}

function getSameLossPairScore(
  teamAId: string,
  teamBId: string,
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[]
) {
  const lossA = getLatestLossMatch(existingMatches, teamAId);
  const lossB = getLatestLossMatch(existingMatches, teamBId);
  const winA = getLatestCompletedWinMatch(existingMatches, teamAId);
  const winB = getLatestCompletedWinMatch(existingMatches, teamBId);
  let score = 0;

  if (haveTeamsPlayed(existingMatches, newMatches, teamAId, teamBId)) score += 1000;

  if (lossA && lossB && normalizeGroup(lossA.bracketGroup) === normalizeGroup(lossB.bracketGroup)) {
    if (lossA.round === lossB.round && lossA.matchNumber === lossB.matchNumber) score += 300;
    score += Math.max(0, 8 - Math.abs(lossA.matchNumber - lossB.matchNumber));
    score += Math.max(lossA.round, lossB.round) * 2;
  }

  if (winA && winB && normalizeGroup(winA.bracketGroup) === normalizeGroup(winB.bracketGroup)) {
    if (winA.round === winB.round && winA.matchNumber === winB.matchNumber) score += 160;
    score += Math.max(0, 6 - Math.abs(winA.matchNumber - winB.matchNumber));
  }

  return score;
}

function getTargetRoundForPending(
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[],
  lossCount: number
) {
  const group = groupByLossCount[lossCount];
  const matches = [...existingMatches, ...newMatches].filter((match) => match.bracketGroup === group);
  if (!matches.length) return 1;

  const completedRounds = matches
    .filter((match) => match.status === "complete" || match.status === "bye")
    .map((match) => match.round);

  return completedRounds.length ? Math.max(...completedRounds) + 1 : 1;
}

function getNextMatchNumber(
  existingMatches: BracketStageMatch[],
  newMatches: BracketStageMatch[],
  lossCount: number,
  round: number
) {
  const group = groupByLossCount[lossCount];
  return (
    [...existingMatches, ...newMatches].filter(
      (match) => match.bracketGroup === group && match.round === round
    ).length + 1
  );
}

function normalizeGroup(group: BracketGroup | undefined): BracketGroup {
  if (group === "winners") return "zero-loss";
  if (group === "losers") return "one-loss";
  return group ?? "zero-loss";
}

function shouldReserveTwoLossFinalist(
  matches: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>,
  lossCounts: Record<string, number>
) {
  const hasOpenOneLossMatch = matches.some(
    (match) =>
      normalizeGroup(match.bracketGroup) === "one-loss" &&
      (match.status === "ready" || match.status === "pending")
  );
  if (hasOpenOneLossMatch) return false;

  return normalizePending(pendingTeamIds, lossCounts)["1"].length === 1;
}

function settleTriplePlacements(stage: TripleEliminationStage): TripleEliminationStage {
  const pendingTeamIds = normalizePending(stage.pendingTeamIds, stage.lossCounts);
  const twoLossFinalistId = stage.twoLossFinalistId;
  const hasOpenMatch = stage.matches.some((match) => match.status === "ready" || match.status === "pending");
  const hasPlacementChallenge = stage.matches.some(isPlacementChallengeFinal);
  const middleSurvivorId = pendingTeamIds["1"][0];
  const completedLowerWinnerId = getCompletedGroupFinalWinner(stage.matches, "two-loss");
  if (
    middleSurvivorId &&
    completedLowerWinnerId &&
    middleSurvivorId !== completedLowerWinnerId &&
    !hasOpenMatch &&
    !hasPlacementChallenge
  ) {
    const round = getTargetRoundForPending(stage.matches, [], 1);
    const matchNumber = getNextMatchNumber(stage.matches, [], 1, round);
    return {
      ...stage,
      matches: [
        ...stage.matches,
        {
          id: `triple-placement-final-r${round}-m${matchNumber}`,
          round,
          roundName: "Middle Final",
          matchNumber,
          participantA: { teamId: middleSurvivorId },
          participantB: { teamId: completedLowerWinnerId },
          status: "ready",
          bracketGroup: "one-loss"
        }
      ],
      pendingTeamIds,
      runnerUpId: undefined,
      thirdPlaceId: undefined
    };
  }

  const eliminatedByLossIds = Array.from(
    new Set([
      ...stage.eliminatedTeamIds,
      ...Object.entries(stage.lossCounts)
        .filter(([, lossCount]) => lossCount >= 3)
        .map(([teamId]) => teamId)
    ])
  );
  const championId =
    stage.championId ?? getSettledGroupWinner(stage.matches, pendingTeamIds, "zero-loss", 0);
  const runnerUpId =
    stage.runnerUpId ??
    (championId ? getSettledGroupWinner(stage.matches, pendingTeamIds, "one-loss", 1) : undefined);
  const thirdPlaceId = twoLossFinalistId
    ? undefined
    : stage.thirdPlaceId ??
      (runnerUpId
        ? getSettledGroupWinner(stage.matches, pendingTeamIds, "two-loss", 2) ??
          getCompletedGroupFinalWinner(stage.matches, "two-loss")
        : undefined);
  const podiumTeamIds = [championId, runnerUpId, thirdPlaceId].filter(Boolean) as string[];
  const eliminatedTeamIds =
    podiumTeamIds.length === 3
      ? stage.teamIds.filter((teamId) => !podiumTeamIds.includes(teamId))
      : eliminatedByLossIds;

  return {
    ...stage,
    pendingTeamIds,
    twoLossFinalistId,
    eliminatedTeamIds,
    championId,
    runnerUpId,
    thirdPlaceId
  };
}

function getSettledGroupWinner(
  matches: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>,
  group: BracketGroup,
  lossCount: number
) {
  const key = String(lossCount);
  if (pendingTeamIds[key].length !== 1) return undefined;
  const hasOpenGroupMatch = matches.some(
    (match) =>
      match.bracketGroup === group &&
      (match.status === "ready" || match.status === "pending")
  );

  return hasOpenGroupMatch ? undefined : pendingTeamIds[key][0];
}

function getCompletedGroupFinalWinner(matches: BracketStageMatch[], group: BracketGroup) {
  const completedGroupMatches = matches
    .filter(
      (match) =>
        normalizeGroup(match.bracketGroup) === group &&
        match.status === "complete" &&
        Boolean(match.winnerId)
    )
    .sort((left, right) => right.round - left.round || right.matchNumber - left.matchNumber);

  return completedGroupMatches[0]?.winnerId;
}
