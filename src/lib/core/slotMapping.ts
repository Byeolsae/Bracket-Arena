import type { SlotMappingRule, Team } from "./models";
import { nextPowerOfTwo } from "./bye";

export type PlayoffSlotSummary = {
  advancingCount: number;
  bracketSize: number;
  byeCount: number;
  byeTeamIds: string[];
};

export function summarizePlayoffSlots(advancingTeams: Team[]): PlayoffSlotSummary {
  const bracketSize = nextPowerOfTwo(advancingTeams.length);
  const byeCount = bracketSize - advancingTeams.length;

  return {
    advancingCount: advancingTeams.length,
    bracketSize,
    byeCount,
    byeTeamIds: advancingTeams.slice(0, byeCount).map((team) => team.id)
  };
}

export function mapTeamsToNextStage(
  teams: Team[],
  slotMappingRule: SlotMappingRule = { id: "slot-default", mode: "seed_order" }
): Team[] {
  const seeded = [...teams].sort(
    (a, b) =>
      (a.defaultSeed ?? Number.MAX_SAFE_INTEGER) -
      (b.defaultSeed ?? Number.MAX_SAFE_INTEGER)
  );

  if (slotMappingRule.mode === "random") {
    return [...teams].sort(() => Math.random() - 0.5).map((team, index) => ({ ...team, defaultSeed: index + 1 }));
  }

  if (slotMappingRule.mode === "first_vs_last") {
    const ordered: Team[] = [];
    let left = 0;
    let right = seeded.length - 1;

    while (left <= right) {
      ordered.push(seeded[left]);
      if (left !== right) ordered.push(seeded[right]);
      left += 1;
      right -= 1;
    }

    return ordered.map((team, index) => ({ ...team, defaultSeed: index + 1 }));
  }

  return seeded.map((team, index) => ({ ...team, defaultSeed: index + 1 }));
}
