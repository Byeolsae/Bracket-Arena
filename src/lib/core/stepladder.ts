import type { BracketStageMatch, StepladderBracket, Team } from "./models";

export function createStepladderBracket(teams: Team[]): StepladderBracket {
  const seeded = [...teams].sort(
    (a, b) => (a.defaultSeed ?? Number.MAX_SAFE_INTEGER) - (b.defaultSeed ?? Number.MAX_SAFE_INTEGER)
  );
  const lowToHigh = [...seeded].reverse();
  const matches: BracketStageMatch[] = [];

  for (let index = 0; index < lowToHigh.length - 1; index += 1) {
    const firstMatch = index === 0;
    const challenger = lowToHigh[index + 1];

    matches.push({
      id: `step-m${index + 1}`,
      round: index + 1,
      roundName: index === lowToHigh.length - 2 ? "Final Boss" : `Step ${index + 1}`,
      matchNumber: index + 1,
      participantA: firstMatch ? { teamId: lowToHigh[0].id, seed: lowToHigh[0].defaultSeed } : {},
      participantB: { teamId: challenger.id, seed: challenger.defaultSeed },
      status: firstMatch ? "ready" : "pending",
      nextMatchId: index < lowToHigh.length - 2 ? `step-m${index + 2}` : undefined,
      nextMatchSlot: index < lowToHigh.length - 2 ? "A" : undefined,
      bracketGroup: "stepladder"
    });
  }

  return {
    id: `stepladder-${Date.now()}`,
    format: "stepladder",
    teamIds: seeded.map((team) => team.id),
    matches,
    championId: undefined
  };
}

export const generateStepladderBracket = createStepladderBracket;

export function applyStepladderResult(
  stage: StepladderBracket,
  matchId: string,
  scoreA: number | undefined,
  scoreB: number | undefined,
  winnerId: string
): StepladderBracket {
  return updateStepladderResult(stage, matchId, scoreA, scoreB, winnerId);
}

export function advanceStepladderWinner(stage: StepladderBracket): StepladderBracket {
  return stage;
}

export function getStepladderChampion(stage: StepladderBracket): string | undefined {
  return stage.championId;
}

export function updateStepladderResult(
  bracket: StepladderBracket,
  matchId: string,
  scoreA: number | undefined,
  scoreB: number | undefined,
  winnerId: string
): StepladderBracket {
  const targetIndex = bracket.matches.findIndex((match) => match.id === matchId);
  const previousWinnerId = targetIndex >= 0 ? bracket.matches[targetIndex].winnerId : undefined;
  const shouldResetDownstream = previousWinnerId !== winnerId;
  const matches = bracket.matches.map((match) => {
    if (match.id !== matchId) return match;
    const participantIds = [match.participantA?.teamId, match.participantB?.teamId];

    return {
      ...match,
      scoreA,
      scoreB,
      winnerId,
      loserId: participantIds.find((teamId) => teamId && teamId !== winnerId),
      status: "complete" as const
    };
  });

  if (shouldResetDownstream && targetIndex >= 0) {
    for (let index = targetIndex + 1; index < matches.length; index += 1) {
      matches[index] = {
        ...matches[index],
        participantA: {},
        scoreA: undefined,
        scoreB: undefined,
        winnerId: undefined,
        loserId: undefined,
        status: "pending"
      };
    }
  }

  const completedMatch = matches.find((match) => match.id === matchId);

  if (completedMatch?.nextMatchId && completedMatch.nextMatchSlot && winnerId) {
    const nextIndex = matches.findIndex((match) => match.id === completedMatch.nextMatchId);
    const nextKey = completedMatch.nextMatchSlot === "A" ? "participantA" : "participantB";

    if (nextIndex >= 0) {
      const nextParticipantA =
        nextKey === "participantA"
          ? { ...matches[nextIndex].participantA, teamId: winnerId }
          : matches[nextIndex].participantA;
      const nextParticipantB =
        nextKey === "participantB"
          ? { ...matches[nextIndex].participantB, teamId: winnerId }
          : matches[nextIndex].participantB;

      matches[nextIndex] = {
        ...matches[nextIndex],
        participantA: nextParticipantA,
        participantB: nextParticipantB,
        status: nextParticipantA?.teamId && nextParticipantB?.teamId ? "ready" : "pending"
      };
    }
  }

  const finalMatch = matches[matches.length - 1];

  return {
    ...bracket,
    matches,
    championId: finalMatch?.winnerId
  };
}
