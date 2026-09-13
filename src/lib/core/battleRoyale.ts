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
  roundCount: 4,
  teamsPerRound: 16,
  placementPoints: defaultPlacementPoints,
  killPoint: 1,
  advanceCount: 8
};

export function generateBattleRoyaleRounds(
  teams: Team[],
  options: Partial<BattleRoyaleOptions> = {}
): BattleRoyaleStage {
  const merged = { ...defaultBattleRoyaleOptions, ...options };
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
    options: merged,
    warnings:
      teams.length > merged.teamsPerRound
        ? [`한 라운드 참가 수를 초과해 ${groupsPerRound}개 그룹으로 나눴습니다.`]
        : []
  };
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
    round.placements.forEach((placement) => {
      const standing = table.get(placement.teamId);
      if (!standing) return;
      standing.roundsPlayed += 1;
      standing.placementPoints += stage.options.placementPoints[placement.placement] ?? 0;
      standing.killPoints += placement.kills * stage.options.killPoint;
      standing.bonusPoints += placement.bonusPoints ?? 0;
      standing.penaltyPoints += placement.penaltyPoints ?? 0;
      standing.totalPoints =
        standing.placementPoints +
        standing.killPoints +
        standing.bonusPoints -
        standing.penaltyPoints;
    });
  });

  return [...table.values()]
    .sort((a, b) => b.totalPoints - a.totalPoints || b.killPoints - a.killPoints)
    .map((standing, index) => ({ ...standing, rank: index + 1 }));
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
