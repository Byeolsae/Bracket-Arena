import type { BracketStageMatch, DoubleEliminationBracket, Team } from "./models";
import { createSeededParticipants } from "./bye";
import { assertEliminationTeamLimit, getDoubleLosersRoundCount, getUpperMatchCountByRound } from "./eliminationSizing";

export type DoubleEliminationConfig = {
  bracketReset: boolean;
  grandFinalBestOf: number;
  winnersBracketName: string;
  losersBracketName: string;
};

const defaultConfig: DoubleEliminationConfig = {
  bracketReset: false,
  grandFinalBestOf: 1,
  winnersBracketName: "Winners Bracket",
  losersBracketName: "Losers Bracket"
};

export function createDoubleEliminationBracket(
  teams: Team[],
  config: Partial<DoubleEliminationConfig> = {}
): DoubleEliminationBracket {
  assertEliminationTeamLimit("double", teams.length);
  const merged = { ...defaultConfig, ...config };
  const initial = createInitialMatchesWithByes(teams, merged.winnersBracketName);
  let bracket: DoubleEliminationBracket = {
    id: `double-${Date.now()}`,
    format: "double-elimination",
    teamIds: teams.map((team) => team.id),
    bracketReset: merged.bracketReset,
    grandFinalBestOf: merged.grandFinalBestOf,
    matches: initial.matches,
    lossCounts: Object.fromEntries(teams.map((team) => [team.id, 0])),
    pendingTeamIds: {
      "0": [],
      "1": [],
      ...pendingEntriesFromInitialByes(initial.byeWinners)
    },
    eliminatedTeamIds: []
  };

  bracket = generateReadyMatchesFromPending(bracket);
  return maybeCreateGrandFinal(bracket);
}

export const generateDoubleEliminationBracket = createDoubleEliminationBracket;

export function applyDoubleEliminationResult(
  stage: DoubleEliminationBracket,
  matchId: string,
  scoreA: number | undefined,
  scoreB: number | undefined,
  winnerId: string
): DoubleEliminationBracket {
  return updateDoubleEliminationResult(stage, matchId, scoreA, scoreB, winnerId);
}

export function moveLoserToLosersBracket(stage: DoubleEliminationBracket): DoubleEliminationBracket {
  return stage;
}

export function advanceWinnerInWinnersBracket(stage: DoubleEliminationBracket): DoubleEliminationBracket {
  return stage;
}

export function advanceWinnerInLosersBracket(stage: DoubleEliminationBracket): DoubleEliminationBracket {
  return stage;
}

export function generateGrandFinal(stage: DoubleEliminationBracket): DoubleEliminationBracket {
  return maybeCreateGrandFinal(stage);
}

export function getDoubleEliminationChampion(stage: DoubleEliminationBracket): string | undefined {
  return stage.championId;
}

export function updateDoubleEliminationResult(
  bracket: DoubleEliminationBracket,
  matchId: string,
  scoreA: number | undefined,
  scoreB: number | undefined,
  winnerId: string
): DoubleEliminationBracket {
  const match =
    bracket.matches.find((item) => item.id === matchId && item.status !== "complete") ??
    bracket.matches.find((item) => item.id === matchId);
  if (!match) return bracket;
  if (match.status === "complete") {
    return rebuildDoubleEliminationWithResult(bracket, { matchId, scoreA, scoreB, winnerId });
  }

  const participantIds = [match.participantA?.teamId, match.participantB?.teamId].filter(Boolean) as string[];
  if (!participantIds.includes(winnerId)) return bracket;

  const loserId = participantIds.find((teamId) => teamId !== winnerId);
  const lossCounts = normalizeLossCounts(bracket);
  const pendingTeamIds = normalizePending(bracket.pendingTeamIds);
  const eliminatedTeamIds = [...(bracket.eliminatedTeamIds ?? [])];

  if (match.bracketGroup === "grand-final") {
    const finalLoserId = loserId;
    if (finalLoserId) {
      lossCounts[finalLoserId] = (lossCounts[finalLoserId] ?? 0) + 1;
    }

    return {
      ...bracket,
      matches: bracket.matches.map((item) =>
        item.id === matchId
          ? {
              ...item,
              scoreA,
              scoreB,
              winnerId,
              loserId: finalLoserId,
              status: "complete" as const
            }
          : item
      ),
      lossCounts,
      eliminatedTeamIds,
      championId: winnerId
    };
  }

  if (loserId) {
    const loserLossCount = (lossCounts[loserId] ?? 0) + 1;
    lossCounts[loserId] = loserLossCount;

    if (loserLossCount >= 2) {
      if (!eliminatedTeamIds.includes(loserId)) eliminatedTeamIds.push(loserId);
    } else {
      enqueueLoserFromWinners(pendingTeamIds, bracket.matches, match, loserId);
    }
  }

  if (match.bracketGroup === "winners") {
    enqueueWinnerFromWinners(pendingTeamIds, match, winnerId);
  } else if (match.bracketGroup === "losers") {
    enqueueWinnerFromLosers(pendingTeamIds, match, winnerId);
  }

  let nextBracket: DoubleEliminationBracket = {
    ...bracket,
    matches: bracket.matches.map((item) =>
      item.id === matchId
        ? {
            ...item,
            scoreA,
            scoreB,
            winnerId,
            loserId,
            eliminatedTeamId: loserId && lossCounts[loserId] >= 2 ? loserId : undefined,
            status: "complete" as const
          }
        : item
    ),
    lossCounts,
    pendingTeamIds,
    eliminatedTeamIds
  };

  nextBracket = generateReadyMatchesFromPending(nextBracket);
  nextBracket = maybeCreateGrandFinal(nextBracket);

  return nextBracket;
}

function rebuildDoubleEliminationWithResult(
  bracket: DoubleEliminationBracket,
  input: { matchId: string; scoreA?: number; scoreB?: number; winnerId: string }
): DoubleEliminationBracket {
  const firstRoundMatches = bracket.matches
    .filter((match) => match.bracketGroup === "winners" && match.round === 1)
    .map((match) => ({
      ...match,
      scoreA: match.isBye ? match.scoreA : undefined,
      scoreB: match.isBye ? match.scoreB : undefined,
      winnerId: match.isBye ? match.winnerId : undefined,
      loserId: undefined,
      eliminatedTeamId: undefined,
      status: match.isBye ? ("bye" as const) : match.participantA?.teamId && match.participantB?.teamId ? ("ready" as const) : ("pending" as const)
    }));

  const results = bracket.matches
    .filter((match) => match.status === "complete" && match.participantA?.teamId && match.participantB?.teamId)
    .map((match) =>
      match.id === input.matchId
        ? input
        : {
            matchId: match.id,
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            winnerId: match.winnerId ?? ""
          }
    )
    .filter((result) => result.winnerId);

  const hasInput = results.some((result) => result.matchId === input.matchId);
  if (!hasInput) results.push(input);

  let nextBracket: DoubleEliminationBracket = {
    ...bracket,
    matches: firstRoundMatches,
    lossCounts: Object.fromEntries(bracket.teamIds.map((teamId) => [teamId, 0])),
    pendingTeamIds: {
      "0": [],
      "1": [],
      ...pendingEntriesFromInitialByes(
        firstRoundMatches
          .filter((match) => match.isBye && match.winnerId)
          .map((match) => ({ teamId: match.winnerId as string, matchNumber: match.matchNumber }))
      )
    },
    eliminatedTeamIds: [],
    championId: undefined
  };

  nextBracket = generateReadyMatchesFromPending(nextBracket);

  results.forEach((result) => {
    const replayMatch = nextBracket.matches.find((match) => match.id === result.matchId);
    const participantIds = [replayMatch?.participantA?.teamId, replayMatch?.participantB?.teamId].filter(Boolean);
    if (!replayMatch || !participantIds.includes(result.winnerId)) return;
    nextBracket = updateDoubleEliminationResult(nextBracket, result.matchId, result.scoreA, result.scoreB, result.winnerId);
  });

  return nextBracket;
}

function createInitialMatchesWithByes(teams: Team[], roundNamePrefix: string) {
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
      id: `wb-r1-m${index + 1}`,
      round: 1,
      roundName: `${roundNamePrefix} 1`,
      matchNumber: index + 1,
      participantA,
      participantB,
      winnerId,
      status: isByeMatch ? "bye" : teamAId && teamBId ? "ready" : "pending",
      isBye: isByeMatch,
      bracketGroup: "winners"
    });
  }

  return { matches, byeWinners };
}

function generateReadyMatchesFromPending(bracket: DoubleEliminationBracket): DoubleEliminationBracket {
  const pendingTeamIds = normalizePending(bracket.pendingTeamIds);
  const generated: BracketStageMatch[] = [];
  const hasInitialByes = bracket.matches.some(
    (match) => match.bracketGroup === "winners" && match.round === 1 && match.isBye
  );

  migrateLegacyPending(pendingTeamIds, [...bracket.matches, ...generated]);
  let didPromoteLowerBye = false;

  do {
    didPromoteLowerBye = false;
    generateReadyMatchesForPrefix(bracket.matches, generated, pendingTeamIds, "W", "winners", "Winners Bracket");
    generateReadyMatchesForPrefix(bracket.matches, generated, pendingTeamIds, "L", "losers", "Losers Bracket");
    didPromoteLowerBye = hasInitialByes
      ? promoteSettledLowerByes(pendingTeamIds, [...bracket.matches, ...generated], bracket.teamIds.length)
      : false;
  } while (didPromoteLowerBye);

  generateFinalLowerSurvivalMatch([...bracket.matches, ...generated], generated, pendingTeamIds, bracket.teamIds.length);

  return {
    ...bracket,
    matches: [...bracket.matches, ...generated],
    pendingTeamIds
  };
}

function promoteSettledLowerByes(
  pendingTeamIds: Record<string, string[]>,
  matches: BracketStageMatch[],
  teamCount: number
) {
  const maxLowerRound = getDoubleLosersRoundCount(teamCount);
  let changed = false;

  const keys = Object.keys(pendingTeamIds)
    .filter((key) => key.startsWith("L:"))
    .sort((left, right) => {
      const roundDiff = roundFromPendingKey(left) - roundFromPendingKey(right);
      return roundDiff || matchNumberFromPendingKey(left) - matchNumberFromPendingKey(right);
    });

  keys.forEach((key) => {
    const teamIds = pendingTeamIds[key];
    if (teamIds.length !== 1) return;

    const round = roundFromPendingKey(key);
    const matchNumber = matchNumberFromPendingKey(key);
    if (round >= maxLowerRound) return;
    if (hasOpenLowerFeeder(pendingTeamIds, matches, round, matchNumber, teamCount)) return;

    const [teamId] = teamIds;
    pendingTeamIds[key] = [];
    enqueueLowerByeWinner(pendingTeamIds, round, matchNumber, teamId);
    changed = true;
  });

  return changed;
}

function hasOpenLowerFeeder(
  pendingTeamIds: Record<string, string[]>,
  matches: BracketStageMatch[],
  lowerRound: number,
  lowerMatchNumber: number,
  teamCount: number
) {
  if (lowerRound === 1) {
    return [lowerMatchNumber * 2 - 1, lowerMatchNumber * 2].some((matchNumber) =>
      isOpenSource(pendingTeamIds, matches, "winners", 1, matchNumber)
    );
  }

  if (lowerRound % 2 === 0) {
    const winnersRound = lowerRound / 2 + 1;
    const winnersRoundSize = getUpperMatchCountByRound(teamCount)[winnersRound] ?? getWinnersRoundSize(matches, winnersRound);
    const droppingWinnersMatchNumber = winnersRoundSize - lowerMatchNumber + 1;

    return (
      isOpenSource(pendingTeamIds, matches, "losers", lowerRound - 1, lowerMatchNumber) ||
      isOpenSource(pendingTeamIds, matches, "winners", winnersRound, droppingWinnersMatchNumber)
    );
  }

  return [lowerMatchNumber * 2 - 1, lowerMatchNumber * 2].some((matchNumber) =>
    isOpenSource(pendingTeamIds, matches, "losers", lowerRound - 1, matchNumber)
  );
}

function isOpenSource(
  pendingTeamIds: Record<string, string[]>,
  matches: BracketStageMatch[],
  group: "winners" | "losers",
  round: number,
  matchNumber: number
) {
  const match = matches.find(
    (match) =>
      match.bracketGroup === group &&
      match.round === round &&
      match.matchNumber === matchNumber
  );

  if (match) return match.status !== "complete" && match.status !== "bye";
  const prefix = group === "winners" ? "W" : "L";
  return Boolean(pendingTeamIds[`${prefix}:${round}:${matchNumber}`]?.length);
}

function enqueueLowerByeWinner(
  pendingTeamIds: Record<string, string[]>,
  round: number,
  matchNumber: number,
  teamId: string
) {
  const nextRound = round + 1;
  const nextMatchNumber = round % 2 === 1 ? matchNumber : Math.ceil(matchNumber / 2);
  enqueueRoundPending(pendingTeamIds, "L", nextRound, nextMatchNumber, teamId);
}

function maybeCreateGrandFinal(bracket: DoubleEliminationBracket): DoubleEliminationBracket {
  if (bracket.matches.some((match) => match.bracketGroup === "grand-final")) return bracket;
  if (hasOpenNonFinalMatch(bracket.matches)) return bracket;

  const pendingTeamIds = normalizePending(bracket.pendingTeamIds);
  migrateLegacyPending(pendingTeamIds, bracket.matches);

  const upperTeamIds = collectPendingByPrefix(pendingTeamIds, "W");
  const lowerTeamIds = collectPendingByPrefix(pendingTeamIds, "L");
  if (upperTeamIds.length !== 1 || lowerTeamIds.length !== 1) return bracket;

  const [upperTeamId] = upperTeamIds;
  const [lowerTeamId] = lowerTeamIds;

  return {
    ...bracket,
    pendingTeamIds: clearBracketPending(pendingTeamIds),
    matches: [
      ...bracket.matches,
      {
        id: "gf-1",
        round: getNextRound(bracket.matches, "grand-final"),
        roundName: "Grand Final",
        matchNumber: 1,
        participantA: { teamId: upperTeamId },
        participantB: { teamId: lowerTeamId },
        status: "ready",
        bracketGroup: "grand-final"
      }
    ]
  };
}

function hasOpenNonFinalMatch(matches: BracketStageMatch[]): boolean {
  return matches.some(
    (match) => match.bracketGroup !== "grand-final" && (match.status === "ready" || match.status === "pending")
  );
}

function generateReadyMatchesForPrefix(
  existingMatches: BracketStageMatch[],
  generated: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>,
  prefix: "W" | "L",
  group: "winners" | "losers",
  roundNamePrefix: string
) {
  const keys = Object.keys(pendingTeamIds)
    .filter((key) => key.startsWith(`${prefix}:`))
    .sort((left, right) => {
      const roundDiff = roundFromPendingKey(left) - roundFromPendingKey(right);
      return roundDiff || matchNumberFromPendingKey(left) - matchNumberFromPendingKey(right);
    });

  keys.forEach((key) => {
    const round = roundFromPendingKey(key);
    const explicitMatchNumber = matchNumberFromPendingKey(key);
    let matchNumber = explicitMatchNumber || getNextMatchNumber([...existingMatches, ...generated], group, round);

    while (pendingTeamIds[key].length >= 2) {
      const teamAId = pendingTeamIds[key].shift();
      const teamBId = pendingTeamIds[key].shift();
      if (!teamAId || !teamBId) continue;

      generated.push({
        id: `${group === "winners" ? "wb" : "lb"}-r${round}-m${matchNumber}`,
        round,
        roundName: `${roundNamePrefix} ${round}`,
        matchNumber,
        participantA: { teamId: teamAId },
        participantB: { teamId: teamBId },
        status: "ready",
        bracketGroup: group
      });
      matchNumber += 1;
    }
  });
}

function generateFinalLowerSurvivalMatch(
  matches: BracketStageMatch[],
  generated: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]>,
  teamCount: number
) {
  const hasOpenLowerMatch = matches.some(
    (match) => match.bracketGroup === "losers" && (match.status === "ready" || match.status === "pending")
  );
  if (hasOpenLowerMatch) return;

  const lowerEntries = Object.entries(pendingTeamIds)
    .filter(([key, teamIds]) => key.startsWith("L:") && teamIds.length > 0)
    .sort(([left], [right]) => {
      const roundDiff = roundFromPendingKey(left) - roundFromPendingKey(right);
      return roundDiff || matchNumberFromPendingKey(left) - matchNumberFromPendingKey(right);
    });
  if (!lowerEntries.length) return;

  const maxLowerRound = getDoubleLosersRoundCount(teamCount);
  const highestPendingRound = Math.max(...lowerEntries.map(([key]) => roundFromPendingKey(key)));
  if (highestPendingRound < maxLowerRound) return;

  const teamIds = [...new Set(lowerEntries.flatMap(([, value]) => value))];
  if (teamIds.length !== 2) return;

  lowerEntries.forEach(([key]) => {
    pendingTeamIds[key] = [];
  });

  const nextRound = Math.max(
    getNextRound(matches, "losers"),
    ...lowerEntries.map(([key]) => roundFromPendingKey(key))
  );

  generated.push({
    id: `lb-r${nextRound}-m1`,
    round: nextRound,
    roundName: `Losers Bracket ${nextRound}`,
    matchNumber: 1,
    participantA: { teamId: teamIds[0] },
    participantB: { teamId: teamIds[1] },
    status: "ready",
    bracketGroup: "losers"
  });
}

function enqueueWinnerFromWinners(pendingTeamIds: Record<string, string[]>, match: BracketStageMatch, teamId: string) {
  enqueueRoundPending(pendingTeamIds, "W", match.round + 1, Math.ceil(match.matchNumber / 2), teamId);
}

function enqueueWinnerFromLosers(pendingTeamIds: Record<string, string[]>, match: BracketStageMatch, teamId: string) {
  const nextRound = match.round + 1;
  const nextMatchNumber = match.round % 2 === 1 ? match.matchNumber : Math.ceil(match.matchNumber / 2);
  enqueueRoundPending(pendingTeamIds, "L", nextRound, nextMatchNumber, teamId);
}

function enqueueLoserFromWinners(
  pendingTeamIds: Record<string, string[]>,
  matches: BracketStageMatch[],
  match: BracketStageMatch,
  teamId: string
) {
  if (match.bracketGroup !== "winners") return;

  const round = getLosersDropRound(match);
  const matchNumber =
    match.round === 1
      ? Math.ceil(match.matchNumber / 2)
      : getWinnersRoundSize(matches, match.round) - match.matchNumber + 1;

  enqueueRoundPending(pendingTeamIds, "L", round, matchNumber, teamId);
}

function enqueueRoundPending(
  pendingTeamIds: Record<string, string[]>,
  prefix: "W" | "L",
  round: number,
  matchNumber: number,
  teamId: string
) {
  const key = `${prefix}:${round}:${matchNumber}`;
  if (!pendingTeamIds[key]) pendingTeamIds[key] = [];
  if (!pendingTeamIds[key].includes(teamId)) pendingTeamIds[key].push(teamId);
}

function normalizePending(pendingTeamIds?: Record<string, string[]>): Record<string, string[]> {
  return {
    "0": [...(pendingTeamIds?.["0"] ?? [])],
    "1": [...(pendingTeamIds?.["1"] ?? [])],
    ...Object.fromEntries(
      Object.entries(pendingTeamIds ?? {})
        .filter(([key]) => key.startsWith("W:") || key.startsWith("L:"))
        .map(([key, value]) => [key, [...value]])
    )
  };
}

function normalizeLossCounts(bracket: DoubleEliminationBracket): Record<string, number> {
  return {
    ...Object.fromEntries(bracket.teamIds.map((teamId) => [teamId, 0])),
    ...(bracket.lossCounts ?? {})
  };
}

function getNextRound(matches: BracketStageMatch[], group: "winners" | "losers" | "grand-final") {
  const groupMatches = matches.filter((match) => match.bracketGroup === group);
  return groupMatches.length ? Math.max(...groupMatches.map((match) => match.round)) + 1 : 1;
}

function getNextMatchNumber(matches: BracketStageMatch[], group: "winners" | "losers", round: number) {
  return matches.filter((match) => match.bracketGroup === group && match.round === round).length + 1;
}

function getLosersDropRound(match: BracketStageMatch) {
  if (match.bracketGroup === "winners") return match.round === 1 ? 1 : (match.round - 1) * 2;
  return match.round + 1;
}

function migrateLegacyPending(pendingTeamIds: Record<string, string[]>, matches: BracketStageMatch[]) {
  if (pendingTeamIds["0"].length) {
    const round = getLegacyTargetRound(matches, "winners");
    pendingTeamIds["0"].forEach((teamId, index) => enqueueRoundPending(pendingTeamIds, "W", round, index + 1, teamId));
    pendingTeamIds["0"] = [];
  }

  if (pendingTeamIds["1"].length) {
    const round = getLegacyTargetRound(matches, "losers");
    pendingTeamIds["1"].forEach((teamId, index) => enqueueRoundPending(pendingTeamIds, "L", round, index + 1, teamId));
    pendingTeamIds["1"] = [];
  }
}

function getLegacyTargetRound(matches: BracketStageMatch[], group: "winners" | "losers") {
  const groupMatches = matches.filter((match) => match.bracketGroup === group);
  if (!groupMatches.length) return 1;

  const completedRounds = groupMatches
    .filter((match) => match.status === "complete" || match.status === "bye")
    .map((match) => match.round);

  return completedRounds.length ? Math.max(...completedRounds) + 1 : 1;
}

function collectPendingByPrefix(pendingTeamIds: Record<string, string[]>, prefix: "W" | "L") {
  return Object.entries(pendingTeamIds)
    .filter(([key]) => key.startsWith(`${prefix}:`))
    .flatMap(([, teamIds]) => teamIds);
}

function clearBracketPending(pendingTeamIds: Record<string, string[]>) {
  return Object.fromEntries(Object.keys(pendingTeamIds).map((key) => [key, []]));
}

function roundFromPendingKey(key: string) {
  return Number(key.split(":")[1] ?? 1);
}

function matchNumberFromPendingKey(key: string) {
  return Number(key.split(":")[2] ?? 0);
}

function getWinnersRoundSize(matches: BracketStageMatch[], round: number) {
  return Math.max(1, matches.filter((match) => match.bracketGroup === "winners" && match.round === round).length);
}

function pendingEntriesFromInitialByes(byeWinners: Array<{ teamId: string; matchNumber: number }>) {
  const pendingTeamIds: Record<string, string[]> = {};
  byeWinners.forEach(({ teamId, matchNumber }) => {
    enqueueRoundPending(pendingTeamIds, "W", 2, Math.ceil(matchNumber / 2), teamId);
  });
  return pendingTeamIds;
}
