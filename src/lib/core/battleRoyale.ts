import type {
  AdvancementRule,
  BattleRoyaleOptions,
  BattleRoyalePlacement,
  BattleRoyaleStage,
  BattleRoyaleStanding,
  Team
} from "./models";

const defaultBattleRoyalePlacementPoints: Record<number, number> = {
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
  advanceCount: 16,
  placementPoints: defaultBattleRoyalePlacementPoints,
  killPoint: 1,
  stageMode: "standard"
};

export const BATTLE_ROYALE_QUALIFIER_TEAM_COUNT = 24;
export const BATTLE_ROYALE_FINAL_TEAM_COUNT = 16;
export const BATTLE_ROYALE_GROUP_COUNT = 3;
export const BATTLE_ROYALE_GROUP_SIZE = 8;
export const BATTLE_ROYALE_GROUP_NAMES = ["A조", "B조", "C조"];
export const BATTLE_ROYALE_ALLOWED_MATCH_COUNTS = [5, 6] as const;

export type BattleRoyaleGroupStanding = {
  groupName: string;
  standings: BattleRoyaleStanding[];
};

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
        placements: createInitialBattleRoyalePlacements(groupTeams.map((team) => team.id)),
        isComplete: false
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
        placements: createInitialBattleRoyalePlacements([...leftGroup.teamIds, ...rightGroup.teamIds]),
        isComplete: false
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
    placements: createInitialBattleRoyalePlacements(teams.map((team) => team.id)),
    isComplete: false
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

export function getBattleRoyalePlacementPoints(
  options: Pick<BattleRoyaleOptions, "placementPoints"> | undefined,
  placement: number
) {
  if (placement <= 0) return 0;
  return options?.placementPoints?.[placement] ?? defaultBattleRoyalePlacementPoints[placement] ?? 0;
}

export function getBattleRoyaleKillPoints(
  options: Pick<BattleRoyaleOptions, "killPoint"> | undefined,
  kills: number
) {
  const killPoint = typeof options?.killPoint === "number" && options.killPoint > 0
    ? options.killPoint
    : defaultBattleRoyaleOptions.killPoint;
  return Math.max(0, Math.floor(kills)) * killPoint;
}

export function createInitialBattleRoyalePlacements(teamIds: string[]): BattleRoyalePlacement[] {
  return teamIds.map((teamId) => ({
    teamId,
    placement: 0,
    kills: 0,
    bonusPoints: 0,
    penaltyPoints: 0
  }));
}

export function hydrateBattleRoyaleStage(stage: BattleRoyaleStage): BattleRoyaleStage {
  let changed = false;
  const rounds = stage.rounds.map((round) => {
    const mergedPlacements =
      round.placements.length === round.teamIds.length
        ? round.placements
        : mergeBattleRoyalePlacements(round.teamIds, round.placements);
    const placements =
      round.isComplete === true || !hasLegacyInitialBattleRoyalePlacements(round.teamIds, mergedPlacements)
        ? mergedPlacements
        : createInitialBattleRoyalePlacements(round.teamIds);
    const inferredComplete = round.isComplete === true || hasEnteredBattleRoyaleResult(placements);

    if (round.placements === placements && round.isComplete === inferredComplete) return round;
    changed = true;
    return {
      ...round,
      placements,
      isComplete: inferredComplete
    };
  });

  return changed ? { ...stage, rounds } : stage;
}

export function applyBattleRoyaleResult(
  stage: BattleRoyaleStage,
  roundId: string,
  placements: BattleRoyalePlacement[]
): BattleRoyaleStage {
  return {
    ...stage,
    rounds: stage.rounds.map((round) =>
      round.id === roundId ? { ...round, placements, isComplete: hasEnteredBattleRoyaleResult(placements) } : round
    )
  };
}

export function calculateBattleRoyaleStandings(
  stage: BattleRoyaleStage,
  teams: Team[]
): BattleRoyaleStanding[] {
  const table = new Map<string, BattleRoyaleStanding>();
  teams.forEach((team, index) =>
    table.set(team.id, {
      rank: index + 1,
      teamId: team.id,
      roundsPlayed: 0,
      placementPoints: 0,
      killPoints: 0,
      totalPoints: 0,
      bonusPoints: 0,
      penaltyPoints: 0
    })
  );

  stage.rounds.forEach((round) => {
    if (!isBattleRoyaleRoundComplete(round)) return;
    round.placements.forEach((placement) => {
      const standing = table.get(placement.teamId);
      if (!standing) return;
      standing.roundsPlayed += 1;
      const placementPoints = getBattleRoyalePlacementPoints(stage.options, placement.placement);
      const killPoints = getBattleRoyaleKillPoints(stage.options, placement.kills);
      standing.placementPoints += placementPoints;
      standing.killPoints += killPoints;
      standing.totalPoints = 0;
      standing.bonusPoints += placement.bonusPoints ?? 0;
      standing.penaltyPoints += placement.penaltyPoints ?? 0;
    });
  });

  return rankBattleRoyaleStandings([...table.values()]);
}

export function calculateBattleRoyaleGroupStandings(
  stage: BattleRoyaleStage,
  teams: Team[]
): BattleRoyaleGroupStanding[] {
  const groups = getBattleRoyaleStandingGroups(stage, teams);
  return groups.map((group) => ({
    groupName: group.groupName,
    standings: calculateBattleRoyaleStandings(stage, group.teams)
  }));
}

export function rankBattleRoyaleStandings(standings: BattleRoyaleStanding[]) {
  return [...standings]
    .sort((left, right) =>
      right.totalPoints - left.totalPoints ||
      right.placementPoints - left.placementPoints ||
      right.killPoints - left.killPoints ||
      left.rank - right.rank ||
      left.teamId.localeCompare(right.teamId)
    )
    .map((standing, index) => ({ ...standing, rank: index + 1 }));
}

function getBattleRoyaleStandingGroups(stage: BattleRoyaleStage, teams: Team[]) {
  if (stage.options.stageMode === "qualifier") {
    const groupNames = stage.options.groupNames?.length ? stage.options.groupNames : BATTLE_ROYALE_GROUP_NAMES;
    return Array.from({ length: BATTLE_ROYALE_GROUP_COUNT }, (_, groupIndex) => {
      const start = groupIndex * BATTLE_ROYALE_GROUP_SIZE;
      return {
        groupName: groupNames[groupIndex] ?? `${String.fromCharCode(65 + groupIndex)}조`,
        teams: teams.slice(start, start + BATTLE_ROYALE_GROUP_SIZE)
      };
    }).filter((group) => group.teams.length > 0);
  }

  return [
    {
      groupName: stage.options.stageMode === "final" ? "결승 로비" : "통합",
      teams
    }
  ];
}

export function isBattleRoyaleRoundComplete(round: BattleRoyaleStage["rounds"][number]) {
  return round.isComplete === true || hasEnteredBattleRoyaleResult(round.placements);
}

function mergeBattleRoyalePlacements(teamIds: string[], placements: BattleRoyalePlacement[]) {
  const placementsByTeamId = new Map(placements.map((placement) => [placement.teamId, placement]));
  return teamIds.map((teamId) => (
    placementsByTeamId.get(teamId) ?? {
      teamId,
      placement: 0,
      kills: 0,
      bonusPoints: 0,
      penaltyPoints: 0
    }
  ));
}

function hasEnteredBattleRoyaleResult(placements: BattleRoyalePlacement[]) {
  if (!placements.length) return false;
  return placements.some((placement) => {
    return (
      placement.placement > 0 ||
      placement.kills > 0 ||
      Boolean(placement.bonusPoints) ||
      Boolean(placement.penaltyPoints)
    );
  });
}

function hasLegacyInitialBattleRoyalePlacements(teamIds: string[], placements: BattleRoyalePlacement[]) {
  if (placements.length !== teamIds.length) return false;
  const placementByTeamId = new Map(placements.map((placement) => [placement.teamId, placement]));
  return teamIds.every((teamId, index) => {
    const placement = placementByTeamId.get(teamId);
    return (
      placement?.placement === index + 1 &&
      placement.kills === 0 &&
      !placement.bonusPoints &&
      !placement.penaltyPoints
    );
  });
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
