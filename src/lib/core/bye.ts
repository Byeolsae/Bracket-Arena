import type { Match, MatchParticipant, Team } from "./models";

export function nextPowerOfTwo(value: number): number {
  if (value <= 2) {
    return 2;
  }

  return 2 ** Math.ceil(Math.log2(value));
}

export function getRoundCount(bracketSize: number): number {
  return Math.log2(bracketSize);
}

export function sortTeamsForSeeding(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    const seedA = a.defaultSeed ?? Number.MAX_SAFE_INTEGER;
    const seedB = b.defaultSeed ?? Number.MAX_SAFE_INTEGER;

    if (seedA !== seedB) {
      return seedA - seedB;
    }

    return a.name.localeCompare(b.name);
  });
}

export function buildSeedOrder(bracketSize: number): number[] {
  const normalizedSize = nextPowerOfTwo(bracketSize);
  const order: number[] = [];

  for (let seed = 1; seed <= normalizedSize / 2; seed += 1) {
    order.push(seed, normalizedSize + 1 - seed);
  }

  return order;
}

export function createSeededParticipants(teams: Team[]): MatchParticipant[] {
  const bracketSize = nextPowerOfTwo(teams.length);
  const sortedTeams = sortTeamsForSeeding(teams);
  const seedOrder = buildSeedOrder(bracketSize);

  return seedOrder.map((seed) => {
    const team = sortedTeams[seed - 1];

    if (!team) {
      return { seed, isBye: true };
    }

    return {
      teamId: team.id,
      seed: team.defaultSeed ?? seed
    };
  });
}

export function applyAutomaticByes(matches: Match[]): Match[] {
  return matches.map((match) => {
    const teamA = match.participantA?.teamId;
    const teamB = match.participantB?.teamId;
    const byeA = match.participantA?.isBye;
    const byeB = match.participantB?.isBye;

    if (teamA && byeB) {
      return {
        ...match,
        winnerId: teamA,
        status: "bye",
        isBye: true
      };
    }

    if (teamB && byeA) {
      return {
        ...match,
        winnerId: teamB,
        status: "bye",
        isBye: true
      };
    }

    if (teamA && teamB) {
      return {
        ...match,
        status: "ready"
      };
    }

    return match;
  });
}
