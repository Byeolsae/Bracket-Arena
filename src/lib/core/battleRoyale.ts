import type {
  AdvancementRule,
  BattleRoyaleOptions,
  BattleRoyalePlacement,
  BattleRoyaleStage,
  BattleRoyaleStanding,
  Team
} from "./models";

const defaultPlacementPoints: Record<number, number> = {
  1: 10,
  2: 6,
  3: 5,
  4: 4,
  5: 3,
  6: 2,
  7: 1,
  8: 1
};

const defaultBattleRoyaleOptions: BattleRoyaleOptions = {
  roundCount: 5,
  teamsPerRound: 16,
  placementPoints: defaultPlacementPoints,
  killPoint: 1,
  advanceCount: 16,
  stageMode: "standard",
  scoringMode: "combined"
};

export const BATTLE_ROYALE_QUALIFIER_TEAM_COUNT = 24;
export const BATTLE_ROYALE_FINAL_TEAM_COUNT = 16;
export const BATTLE_ROYALE_GROUP_COUNT = 3;
export const BATTLE_ROYALE_GROUP_SIZE = 8;
export const BATTLE_ROYALE_GROUP_NAMES = ["A조", "B조", "C조"];
export const BATTLE_ROYALE_ALLOWED_MATCH_COUNTS = [5, 6] as const;

export function generateBattleRoyaleRounds(
  teams: Team[],
  options: Partial<BattleRoyaleOptions> = {}
): BattleRoyaleStage {
  const merged = { ...defaultBattleRoyaleOptions, ...options };
  const matchCount = normalizeBattleRoyaleMatchCount(merged.roundCount);
  const stageMode = merged.stageMode ?? "standard";

  if (stageMode === "qualifier") {
    return generateBattleRoyaleQualifier(teams, { ...merged, roundCount: matchCount, matchesPerPair: matchCount });
  }

  if (stageMode === "final") {
    return generateBattleRoyaleFinal(teams, { ...merged, roundCount: matchCount });
  }

  const groupsPerRound = Math.ceil(teams.length / merged.teamsPerRound);
  const rounds = Array.from({ length: merged.roundCount }).flatMap((_, roundIndex) =>
    Array.from({ length: groupsPerRound }).map((__, groupIndex) => {
      const start = groupIndex * merged.teamsPerRound;
      const groupTeams = teams.slice(start, start + merged.teamsPerRound);
      return {
        id: `br-r${roundIndex + 1}-g${groupIndex + 1}`,
        round: roundIndex + 1,
        groupName: groupsPerRound > 1 ? `Group ${groupIndex + 1}` : undefined,
        teamIds: groupTeams.map((team) => team.id),
        placements: []
      };
    })
  );

  return {
    id: `battle-royale-${Date.now()}`,
    type: "battle_royale",
    rounds,
    options: { ...merged, roundCount: matchCount },
    warnings:
      teams.length > merged.teamsPerRound
        ? [`한 라운드 참가 수를 초과해 ${groupsPerRound}개 그룹으로 나눴습니다.`]
        : []
  };
}

function generateBattleRoyaleQualifier(teams: Team[], options: BattleRoyaleOptions): BattleRoyaleStage {
  const groups = Array.from({ length: BATTLE_ROYALE_GROUP_COUNT }, (_, groupIndex) => {
    const start = groupIndex * BATTLE_ROYALE_GROUP_SIZE;
    return {
      name: BATTLE_ROYALE_GROUP_NAMES[groupIndex],
      teamIds: teams.slice(start, start + BATTLE_ROYALE_GROUP_SIZE).map((team) => team.id)
    };
  });
  const pairings = [
    [0, 1],
    [0, 2],
    [1, 2]
  ] as const;
  const rounds = Array.from({ length: options.matchesPerPair ?? options.roundCount }).flatMap((_, matchIndex) =>
    pairings.map(([leftIndex, rightIndex], pairingIndex) => {
      const leftGroup = groups[leftIndex];
      const rightGroup = groups[rightIndex];
      return {
        id: `br-qualifier-m${matchIndex + 1}-p${pairingIndex + 1}`,
        round: matchIndex * pairings.length + pairingIndex + 1,
        groupName: `${matchIndex + 1}경기 · ${leftGroup.name}/${rightGroup.name} 로비`,
        teamIds: [...leftGroup.teamIds, ...rightGroup.teamIds],
        placements: []
      };
    })
  );

  return {
    id: `battle-royale-${Date.now()}`,
    type: "battle_royale",
    rounds,
    options: {
      ...options,
      stageMode: "qualifier",
      groupCount: BATTLE_ROYALE_GROUP_COUNT,
      groupNames: BATTLE_ROYALE_GROUP_NAMES,
      teamsPerRound: 16,
      advanceCount: BATTLE_ROYALE_FINAL_TEAM_COUNT
    },
    warnings:
      teams.length === BATTLE_ROYALE_QUALIFIER_TEAM_COUNT
        ? []
        : [`배틀로얄 예선은 ${BATTLE_ROYALE_QUALIFIER_TEAM_COUNT}팀 고정입니다. 현재 ${teams.length}팀입니다.`]
  };
}

function generateBattleRoyaleFinal(teams: Team[], options: BattleRoyaleOptions): BattleRoyaleStage {
  const rounds = Array.from({ length: options.roundCount }).map((_, roundIndex) => ({
    id: `br-final-r${roundIndex + 1}`,
    round: roundIndex + 1,
    groupName: "결승 로비",
    teamIds: teams.map((team) => team.id),
    placements: []
  }));

  return {
    id: `battle-royale-${Date.now()}`,
    type: "battle_royale",
    rounds,
    options: {
      ...options,
      stageMode: "final",
      teamsPerRound: BATTLE_ROYALE_FINAL_TEAM_COUNT,
      advanceCount: 0
    },
    warnings:
      teams.length === BATTLE_ROYALE_FINAL_TEAM_COUNT
        ? []
        : [`배틀로얄 본선은 ${BATTLE_ROYALE_FINAL_TEAM_COUNT}팀 고정입니다. 현재 ${teams.length}팀입니다.`]
  };
}

export function normalizeBattleRoyaleMatchCount(value: number | undefined) {
  return value === 6 ? 6 : 5;
}

export function applyBattleRoyaleResult(
  stage: BattleRoyaleStage,
  roundId: string,
  placements: BattleRoyalePlacement[]
): BattleRoyaleStage {
  return {
    ...stage,
    rounds: stage.rounds.map((round) =>
      round.id === roundId ? { ...round, placements } : round
    )
  };
}

export function calculateBattleRoyaleStandings(
  stage: BattleRoyaleStage,
  teams: Team[]
): BattleRoyaleStanding[] {
  const table = new Map<string, BattleRoyaleStanding>();
  teams.forEach((team) =>
    table.set(team.id, {
      rank: 0,
      teamId: team.id,
      roundsPlayed: 0,
      placementPoints: 0,
      killPoints: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalPoints: 0
    })
  );

  stage.rounds.forEach((round) => {
    getCompleteRoundPlacements(round.teamIds, round.placements).forEach((placement) => {
      const standing = table.get(placement.teamId);
      if (!standing) return;
      standing.roundsPlayed += 1;
      standing.placementPoints += stage.options.placementPoints[placement.placement] ?? 0;
      standing.killPoints += placement.kills * stage.options.killPoint;
      standing.bonusPoints += placement.bonusPoints ?? 0;
      standing.penaltyPoints += placement.penaltyPoints ?? 0;
      standing.totalPoints = getBattleRoyaleTotalPoints(
        standing.placementPoints,
        standing.killPoints,
        stage.options.scoringMode
      );
    });
  });

  return [...table.values()]
    .sort((a, b) => b.totalPoints - a.totalPoints || b.killPoints - a.killPoints)
    .map((standing, index) => ({ ...standing, rank: index + 1 }));
}

function getCompleteRoundPlacements(teamIds: string[], placements: BattleRoyalePlacement[]) {
  const placementsByTeamId = new Map(placements.map((placement) => [placement.teamId, placement]));
  return teamIds.map((teamId, index) => (
    placementsByTeamId.get(teamId) ?? {
      teamId,
      placement: index + 1,
      kills: 0,
      bonusPoints: 0,
      penaltyPoints: 0
    }
  ));
}

function getBattleRoyaleTotalPoints(
  placementPoints: number,
  killPoints: number,
  scoringMode: BattleRoyaleOptions["scoringMode"] = "combined"
) {
  if (scoringMode === "placement") return placementPoints;
  if (scoringMode === "kills") return killPoints;
  return placementPoints + killPoints;
}

export function getBattleRoyaleAdvancingTeams(
  standings: BattleRoyaleStanding[],
  teams: Team[],
  advancementRule: AdvancementRule
): Team[] {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  return standings
    .slice(0, advancementRule.count)
    .map((standing, index) => {
      const team = teamsById.get(standing.teamId);
      return team ? { ...team, defaultSeed: index + 1 } : undefined;
    })
    .filter(Boolean) as Team[];
}
