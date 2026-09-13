import { nextPowerOfTwo } from "./bye";

export const MAX_SINGLE_ELIMINATION_TEAMS = 32;
export const MAX_DOUBLE_ELIMINATION_TEAMS = 16;
export const MAX_TRIPLE_ELIMINATION_TEAMS = 8;

export function assertEliminationTeamLimit(
  format: "single" | "double" | "triple",
  teamCount: number
) {
  const maxTeams =
    format === "single"
      ? MAX_SINGLE_ELIMINATION_TEAMS
      : format === "double"
        ? MAX_DOUBLE_ELIMINATION_TEAMS
        : MAX_TRIPLE_ELIMINATION_TEAMS;

  if (teamCount > maxTeams) {
    throw new Error(`${format} elimination supports up to ${maxTeams} teams.`);
  }
}

export function getEliminationBracketSize(teamCount: number): number {
  return nextPowerOfTwo(Math.max(2, teamCount));
}

export function getUpperBracketRoundCount(teamCount: number): number {
  return Math.max(1, Math.log2(getEliminationBracketSize(teamCount)));
}

export function getUpperFirstRoundMatchCount(teamCount: number): number {
  return Math.max(1, getEliminationBracketSize(teamCount) / 2);
}

export function getDoubleLosersRoundCount(teamCount: number): number {
  const upperRounds = getUpperBracketRoundCount(teamCount);
  return Math.max(1, 2 * (upperRounds - 1));
}

export function getUpperMatchCountByRound(teamCount: number): Record<number, number> {
  const firstRoundMatches = getUpperFirstRoundMatchCount(teamCount);
  const roundCount = getUpperBracketRoundCount(teamCount);

  return Object.fromEntries(
    Array.from({ length: roundCount }, (_, index) => {
      const round = index + 1;
      return [round, Math.max(1, Math.ceil(firstRoundMatches / 2 ** index))];
    })
  );
}

export function getDoubleLosersMatchCountByRound(teamCount: number): Record<number, number> {
  const upperFirstRoundMatches = getUpperFirstRoundMatchCount(teamCount);
  const roundCount = getDoubleLosersRoundCount(teamCount);

  return Object.fromEntries(
    Array.from({ length: roundCount }, (_, index) => {
      const round = index + 1;
      const divisor = 2 ** Math.ceil(round / 2);
      return [round, Math.max(1, Math.ceil(upperFirstRoundMatches / divisor))];
    })
  );
}

export function getTripleLossGroupRoundCount(teamCount: number, lossCount: 0 | 1 | 2): number {
  const upperRounds = getUpperBracketRoundCount(teamCount);
  if (lossCount === 1) return getDoubleLosersRoundCount(teamCount);
  if (lossCount === 2) return Math.max(1, upperRounds + 1);
  return upperRounds;
}

export function getLossGroupFirstRoundMatchCount(teamCount: number, lossCount: 0 | 1 | 2): number {
  const upperFirstRoundMatches = getUpperFirstRoundMatchCount(teamCount);
  if (lossCount === 1) return Math.max(1, Math.ceil(upperFirstRoundMatches / 2));
  if (lossCount === 2) return Math.max(1, upperFirstRoundMatches - 2);
  return upperFirstRoundMatches;
}

export function getTripleLossGroupMatchCountByRound(
  teamCount: number,
  lossCount: 0 | 1 | 2
): Record<number, number> {
  if (lossCount === 0) return getUpperMatchCountByRound(teamCount);
  if (lossCount === 1) return getDoubleLosersMatchCountByRound(teamCount);

  const firstRoundMatches = getLossGroupFirstRoundMatchCount(teamCount, 2);
  const roundCount = getTripleLossGroupRoundCount(teamCount, 2);

  return Object.fromEntries(
    Array.from({ length: roundCount }, (_, index) => {
      const round = index + 1;
      return [round, Math.max(1, Math.ceil(firstRoundMatches / 2 ** index))];
    })
  );
}
