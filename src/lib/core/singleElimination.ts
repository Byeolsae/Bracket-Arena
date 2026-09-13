import type { Match, Team, Tournament } from "./models";
import {
  applyAutomaticByes,
  createSeededParticipants,
  getRoundCount,
  nextPowerOfTwo
} from "./bye";
import { assertEliminationTeamLimit } from "./eliminationSizing";

type ResultInput = {
  matchId: string;
  scoreA?: number;
  scoreB?: number;
  winnerId: string;
};

export function createSingleEliminationTournament(
  teams: Team[],
  name = "New Tournament"
): Tournament {
  assertEliminationTeamLimit("single", teams.length);
  const now = new Date().toISOString();
  const bracketSize = nextPowerOfTwo(teams.length);
  const rounds = getRoundCount(bracketSize);
  const participants = createSeededParticipants(teams);
  const firstRoundCount = bracketSize / 2;
  const firstRound: Match[] = [];

  for (let index = 0; index < firstRoundCount; index += 1) {
    firstRound.push({
      id: createMatchId(1, index + 1),
      round: 1,
      roundName: getRoundName(1, rounds),
      matchNumber: index + 1,
      participantA: participants[index * 2],
      participantB: participants[index * 2 + 1],
      status: "pending"
    });
  }

  const matches = generateReadySingleMatches(applyAutomaticByes(firstRound), rounds);

  return {
    id: createId("tournament"),
    name,
    format: "single-elimination",
    teamIds: teams.map((team) => team.id),
    bracketSize,
    rounds,
    matches,
    pendingTeamIds: {},
    championId: findChampionId(matches, rounds),
    runnerUpId: findRunnerUpId(matches, rounds),
    thirdPlaceId: findThirdPlaceId(matches),
    fourthPlaceId: findFourthPlaceId(matches),
    createdAt: now,
    updatedAt: now
  };
}

export const generateSingleEliminationBracket = createSingleEliminationTournament;

export function ensureThirdPlaceMatch(tournament: Tournament): Tournament {
  return {
    ...tournament,
    matches: generateReadySingleMatches(tournament.matches, tournament.rounds)
  };
}

export function applySingleEliminationResult(
  stage: Tournament,
  matchId: string,
  scoreA: number | undefined,
  scoreB: number | undefined,
  winnerId: string
): Tournament {
  return updateMatchResult(stage, { matchId, scoreA, scoreB, winnerId });
}

export function advanceWinnerToNextMatch(stage: Tournament): Tournament {
  return {
    ...stage,
    matches: generateReadySingleMatches(stage.matches, stage.rounds)
  };
}

export function getSingleEliminationChampion(stage: Tournament): string | undefined {
  return stage.championId;
}

export function updateMatchResult(tournament: Tournament, input: ResultInput): Tournament {
  const match = tournament.matches.find((item) => item.id === input.matchId);
  if (!match) return tournament;

  const participantTeamIds = [match.participantA?.teamId, match.participantB?.teamId].filter(Boolean);
  if (!participantTeamIds.includes(input.winnerId)) return tournament;

  const loserId = participantTeamIds.find((teamId) => teamId !== input.winnerId);
  const updatedMatches = tournament.matches.map((item) =>
    item.id === input.matchId
      ? {
          ...item,
          scoreA: input.scoreA,
          scoreB: input.scoreB,
          winnerId: input.winnerId,
          loserId,
          status: "complete" as const
        }
      : item
  );
  const matches = generateReadySingleMatches(updatedMatches, tournament.rounds);

  return {
    ...tournament,
    matches,
    championId: findChampionId(matches, tournament.rounds),
    runnerUpId: findRunnerUpId(matches, tournament.rounds),
    thirdPlaceId: findThirdPlaceId(matches),
    fourthPlaceId: findFourthPlaceId(matches),
    updatedAt: new Date().toISOString()
  };
}

export function clearMatchResult(tournament: Tournament, matchId: string): Tournament {
  const target = tournament.matches.find((match) => match.id === matchId);
  if (!target) return tournament;

  const keptMatches = tournament.matches
    .filter((match) => match.round <= target.round && match.id !== "third-place")
    .map((match) =>
      match.id === matchId
        ? {
            ...match,
            scoreA: undefined,
            scoreB: undefined,
            winnerId: undefined,
            loserId: undefined,
            status: match.isBye ? ("bye" as const) : match.participantA?.teamId && match.participantB?.teamId ? ("ready" as const) : ("pending" as const)
          }
        : match
    );
  const matches = generateReadySingleMatches(applyAutomaticByes(keptMatches), tournament.rounds);

  return {
    ...tournament,
    matches,
    championId: findChampionId(matches, tournament.rounds),
    runnerUpId: findRunnerUpId(matches, tournament.rounds),
    thirdPlaceId: findThirdPlaceId(matches),
    fourthPlaceId: findFourthPlaceId(matches),
    updatedAt: new Date().toISOString()
  };
}

export function getMatchesByRound(matches: Match[]): Match[][] {
  const bracketMatches = matches.filter((match) => match.id !== "third-place");
  const roundCount = Math.max(0, ...bracketMatches.map((match) => match.round));

  return Array.from({ length: roundCount }, (_, index) =>
    bracketMatches
      .filter((match) => match.round === index + 1)
      .sort((a, b) => a.matchNumber - b.matchNumber)
  );
}

function generateReadySingleMatches(matches: Match[], totalRounds: number): Match[] {
  const existingById = new Map(matches.map((match) => [match.id, match]));
  const nextMatches = matches
    .filter((match) => match.round === 1 && match.id !== "third-place")
    .map(cloneMatch);
  let changed = true;

  while (changed) {
    changed = false;

    for (let round = 1; round < totalRounds; round += 1) {
      const currentRoundMatches = nextMatches
        .filter((match) => match.round === round && match.id !== "third-place")
        .sort((a, b) => a.matchNumber - b.matchNumber);

      for (let index = 0; index < currentRoundMatches.length; index += 2) {
        const left = currentRoundMatches[index];
        const right = currentRoundMatches[index + 1];
        if (!left?.winnerId || !right?.winnerId) continue;

        const nextRound = round + 1;
        const nextMatchNumber = Math.floor(index / 2) + 1;
        const id = createMatchId(nextRound, nextMatchNumber);
        const participantA = { teamId: left.winnerId, sourceMatchId: left.id };
        const participantB = { teamId: right.winnerId, sourceMatchId: right.id };
        const existing = existingById.get(id);

        if (nextMatches.some((match) => match.id === id)) continue;

        nextMatches.push(
          preserveResultIfSameParticipants(existing, {
            id,
            round: nextRound,
            roundName: getRoundName(nextRound, totalRounds),
            matchNumber: nextMatchNumber,
            participantA,
            participantB,
            status: "ready"
          })
        );
        changed = true;

        if (nextRound === totalRounds && totalRounds >= 2 && left.loserId && right.loserId) {
          const thirdPlaceExists = nextMatches.some((match) => match.id === "third-place");
          if (!thirdPlaceExists) {
            const participantA = { teamId: left.loserId, sourceMatchId: left.id };
            const participantB = { teamId: right.loserId, sourceMatchId: right.id };
            const existing = existingById.get("third-place");

            nextMatches.push(
              preserveResultIfSameParticipants(existing, {
                id: "third-place",
                round: nextRound,
                roundName: "3rd Place",
                matchNumber: 2,
                participantA,
                participantB,
                status: "ready"
              })
            );
            changed = true;
          }
        }
      }
    }
  }

  return nextMatches.sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber);
}

function cloneMatch(match: Match): Match {
  return {
    ...match,
    participantA: match.participantA ? { ...match.participantA } : undefined,
    participantB: match.participantB ? { ...match.participantB } : undefined
  };
}

function preserveResultIfSameParticipants(existing: Match | undefined, next: Match): Match {
  if (!existing) return next;

  const sameParticipants =
    existing.participantA?.teamId === next.participantA?.teamId &&
    existing.participantB?.teamId === next.participantB?.teamId;

  if (!sameParticipants) return next;

  return {
    ...next,
    scoreA: existing.scoreA,
    scoreB: existing.scoreB,
    winnerId: existing.winnerId,
    loserId: existing.loserId,
    status: existing.status
  };
}

function findChampionId(matches: Match[], rounds: number): string | undefined {
  return matches.find((match) => match.round === rounds && match.id !== "third-place")?.winnerId;
}

function findRunnerUpId(matches: Match[], rounds: number): string | undefined {
  return matches.find((match) => match.round === rounds && match.id !== "third-place")?.loserId;
}

function findThirdPlaceId(matches: Match[]): string | undefined {
  return matches.find((match) => match.id === "third-place")?.winnerId;
}

function findFourthPlaceId(matches: Match[]): string | undefined {
  return matches.find((match) => match.id === "third-place")?.loserId;
}

function getRoundName(round: number, totalRounds: number): string {
  const remaining = totalRounds - round;
  if (remaining === 0) return "Final";
  if (remaining === 1) return "Semifinal";
  if (remaining === 2) return "Quarterfinal";
  return `Round of ${2 ** (remaining + 1)}`;
}

function createMatchId(round: number, matchNumber: number): string {
  return `r${round}-m${matchNumber}`;
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
