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
  return shuffle(teamIds).map((teamId, index) => ({
    teamId,
    placement: index + 1,
    kills: randomInt(0, 12),
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
