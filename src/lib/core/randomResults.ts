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
  const killsByTeamId = createBattleRoyaleKillDistribution(orderedTeamIds);

  return orderedTeamIds.map((teamId, index) => ({
    teamId,
    placement: index + 1,
    kills: killsByTeamId.get(teamId) ?? 0,
    bonusPoints: 0,
    penaltyPoints: 0
  }));
}

function createBattleRoyaleKillDistribution(teamIdsByPlacement: string[]) {
  const maxKills = Math.min(64, teamIdsByPlacement.length * 4);
  const totalKills = Math.min(maxKills, Math.max(18, Math.round(randomNormal(45, 8))));
  const killsByTeamId = new Map(teamIdsByPlacement.map((teamId) => [teamId, 0]));

  const weights = teamIdsByPlacement.map((teamId, index) => {
    const placement = index + 1;
    const survivalRatio = (teamIdsByPlacement.length + 1 - placement) / teamIdsByPlacement.length;
    const placementBias = 0.75 + Math.pow(survivalRatio, 1.35) * 2.25;
    const volatility = 0.45 + Math.random() * 1.75;
    return {
      teamId,
      weight: placementBias * volatility
    };
  });

  Array.from({ length: totalKills }).forEach(() => {
    const pickedTeamId = weightedPick(weights, (entry) => entry.weight).teamId;
    killsByTeamId.set(pickedTeamId, (killsByTeamId.get(pickedTeamId) ?? 0) + 1);
  });

  return killsByTeamId;
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

function randomNormal(mean: number, standardDeviation: number) {
  const first = Math.random() || 0.001;
  const second = Math.random() || 0.001;
  const standardNormal = Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
  return mean + standardNormal * standardDeviation;
}
