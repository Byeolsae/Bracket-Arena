import type { BattleRoyalePlacement } from "./models";

export function createRandomHeadToHeadScore(options: { allowDraw?: boolean; maxScore?: number } = {}) {
  const maxScore = options.maxScore ?? 5;
  const scoreA = randomInt(0, maxScore);
  let scoreB = randomInt(0, maxScore);

  if (!options.allowDraw) {
    while (scoreA === scoreB) {
      scoreB = randomInt(0, maxScore);
    }
  }

  return { scoreA, scoreB };
}

export function createRandomBattleRoyalePlacements(teamIds: string[]): BattleRoyalePlacement[] {
  const orderedTeamIds = shuffle(teamIds);
  const killsByTeamId = new Map(orderedTeamIds.map((teamId) => [teamId, 0]));

  orderedTeamIds.forEach((eliminatedTeamId, eliminatedIndex) => {
    if (eliminatedIndex === orderedTeamIds.length - 1) return;
    if (Math.random() < 0.08) return;

    const killerCandidates = orderedTeamIds.slice(eliminatedIndex + 1);
    const killerTeamId = weightedPick(killerCandidates, (teamId) => {
      const placement = orderedTeamIds.indexOf(teamId) + 1;
      const survivalWeight = Math.max(1, orderedTeamIds.length + 1 - placement);
      const volatility = 0.65 + Math.random() * 1.35;
      return Math.pow(survivalWeight, 1.15) * volatility;
    });
    killsByTeamId.set(killerTeamId, (killsByTeamId.get(killerTeamId) ?? 0) + 1);
  });

  return orderedTeamIds.map((teamId, index) => ({
    teamId,
    placement: index + 1,
    kills: killsByTeamId.get(teamId) ?? 0,
    bonusPoints: 0,
    penaltyPoints: 0
  }));
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }

  return next;
}

function weightedPick<T>(items: T[], getWeight: (item: T) => number): T {
  const weights = items.map((item) => Math.max(0.01, getWeight(item)));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = Math.random() * totalWeight;

  for (let index = 0; index < items.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return items[index];
  }

  return items.at(-1) ?? items[0];
}
