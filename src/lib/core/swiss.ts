import type {
  SwissConfig,
  SwissMatch,
  SwissRecord,
  SwissStage,
  Team
} from "./models";
import { rankStandings } from "./ranking";
import type { LeagueStanding } from "./models";

const defaultSwissConfig: SwissConfig = {
  maxRounds: 5,
  advanceMode: "wins",
  advanceWins: 3,
  eliminateLosses: 3,
  advanceCount: 8,
  allowDraw: false,
  avoidRematch: true,
  allowBye: true,
  preventMultipleByes: true,
  byeCountsAsWin: true
};

export function getRecommendedSwissConfig(teamCount: number): Partial<SwissConfig> {
  const threshold = teamCount <= 16 ? 3 : teamCount <= 32 ? 5 : teamCount <= 64 ? 6 : 7;

  return {
    maxRounds: threshold * 2 - 1,
    advanceMode: "wins",
    advanceWins: threshold,
    eliminateLosses: threshold,
    advanceCount: Math.max(1, Math.floor(teamCount / 2))
  };
}

export type SwissPowerProfile = {
  teamCount: number;
  isPowerOfTwo: boolean;
  scaleFrom16: number;
  configuredRounds: number;
  recommendedRounds: number;
  extendedRoundOptions: number[];
  message: string;
};

export function getSwissPowerProfile(teamCount: number, config: SwissConfig): SwissPowerProfile {
  const isPowerOfTwo = teamCount > 1 && (teamCount & (teamCount - 1)) === 0;
  const recommendedRounds =
    config.advanceMode === "wins"
      ? Math.max(1, config.advanceWins + config.eliminateLosses - 1)
      : Math.max(1, config.maxRounds);
  const scaleFrom16 = teamCount / 16;
  const extendedRoundOptions = Array.from(
    new Set([recommendedRounds, recommendedRounds + 2, Math.ceil(Math.log2(Math.max(2, teamCount))) + 2])
  ).sort((a, b) => a - b);

  return {
    teamCount,
    isPowerOfTwo,
    scaleFrom16,
    configuredRounds: config.maxRounds,
    recommendedRounds,
    extendedRoundOptions,
    message: isPowerOfTwo
      ? `${teamCount}팀은 2의 거듭제곱이라 모든 라운드에서 짝수 매칭을 유지하기 쉽습니다. ${teamCount}팀/${config.maxRounds}라운드는 16팀 구조를 ${formatScale(scaleFrom16)}배로 확장한 형태로 볼 수 있습니다.`
      : `${teamCount}팀은 2의 거듭제곱이 아니라 Swiss 진행 중 BYE가 발생할 수 있습니다. 안정적인 운영을 원하면 가까운 2의 거듭제곱 팀 수로 맞추는 구성이 좋습니다.`
  };
}

export function createSwissStage(teams: Team[], config?: Partial<SwissConfig>): SwissStage {
  const mergedConfig = { ...defaultSwissConfig, ...getRecommendedSwissConfig(teams.length), ...config };
  const records = createInitialSwissRecords(teams);
  const stage: SwissStage = {
    id: `swiss-${Date.now()}`,
    teamIds: teams.map((team) => team.id),
    config: mergedConfig,
    currentRound: 0,
    matches: [],
    records,
    isComplete: false
  };

  return generateNextSwissRound(stage);
}

export function updateSwissMatchResult(
  stage: SwissStage,
  matchId: string,
  scoreA?: number,
  scoreB?: number,
  winnerId?: string
): SwissStage {
  const matches = stage.matches.map((match) => {
    if (match.id !== matchId || match.isBye) {
      return match;
    }

    const isAllowedDraw = stage.config.allowDraw && scoreA === scoreB;

    if (scoreA === undefined || scoreB === undefined || (!winnerId && !isAllowedDraw)) {
      return {
        ...match,
        scoreA: undefined,
        scoreB: undefined,
        winnerId: undefined,
        loserId: undefined,
        status: "pending" as const
      };
    }

    const loserId = isAllowedDraw
      ? undefined
      : winnerId === match.teamAId
        ? match.teamBId
        : match.teamAId;

    return {
      ...match,
      scoreA,
      scoreB,
      winnerId: isAllowedDraw ? undefined : winnerId,
      loserId,
      status: "complete" as const
    };
  });

  return finalizeSwissStage({
    ...stage,
    matches,
    records: calculateSwissRecords(matches, stage.teamIds, stage.records, stage.config)
  });
}

export function generateNextSwissRound(stage: SwissStage): SwissStage {
  if (stage.currentRound >= stage.config.maxRounds || stage.isComplete) {
    return finalizeSwissStage(stage);
  }

  const currentRoundMatches = stage.matches.filter(
    (match) => match.round === stage.currentRound && !match.isBye
  );
  const currentRoundComplete =
    stage.currentRound === 0 ||
    currentRoundMatches.every((match) => match.status === "complete");

  if (!currentRoundComplete) {
    return stage;
  }

  const records = calculateSwissRecords(
    stage.matches,
    stage.teamIds,
    stage.records,
    stage.config
  );
  const activeRecords = records.filter((record) => record.status === "active");

  if (activeRecords.length <= 1) {
    return finalizeSwissStage({ ...stage, records, isComplete: true });
  }

  const nextRound = stage.currentRound + 1;
  const pairings = createSwissPairings(activeRecords, stage.config);
  const matches: SwissMatch[] = pairings.map((pairing, index) => {
    if (!pairing.teamBId) {
      return {
        id: `swiss-r${nextRound}-m${index + 1}`,
        round: nextRound,
        matchNumber: index + 1,
        teamAId: pairing.teamAId,
        scoreA: stage.config.byeCountsAsWin ? 1 : undefined,
        scoreB: stage.config.byeCountsAsWin ? 0 : undefined,
        winnerId: stage.config.byeCountsAsWin ? pairing.teamAId : undefined,
        status: "bye",
        isBye: true
      };
    }

    return {
      id: `swiss-r${nextRound}-m${index + 1}`,
      round: nextRound,
      matchNumber: index + 1,
      teamAId: pairing.teamAId,
      teamBId: pairing.teamBId,
      status: "pending"
    };
  });

  const nextStage = {
    ...stage,
    currentRound: nextRound,
    matches: [...stage.matches, ...matches]
  };

  return finalizeSwissStage({
    ...nextStage,
    records: calculateSwissRecords(
      nextStage.matches,
      nextStage.teamIds,
      records,
      stage.config
    )
  });
}

export function generateSwissRound(
  stage: SwissStage,
  _teams: Team[],
  _config: Partial<SwissConfig> = {}
): SwissStage {
  void _teams;
  void _config;
  return generateNextSwissRound(stage);
}

export function groupSwissParticipantsByRecordOrPoints(
  states: SwissRecord[],
  _config: Partial<SwissConfig> = {}
): Record<string, SwissRecord[]> {
  void _config;
  return states.reduce<Record<string, SwissRecord[]>>((groups, state) => {
    const key = `${state.wins}-${state.losses}`;
    groups[key] = groups[key] ?? [];
    groups[key].push(state);
    return groups;
  }, {});
}

export function pairSwissParticipants(
  states: SwissRecord[],
  config: SwissConfig
): Array<{ teamAId: string; teamBId?: string }> {
  return createSwissPairings(states, config);
}

export function findBestOpponent(
  candidate: SwissRecord,
  pool: SwissRecord[],
  config: SwissConfig
): SwissRecord | undefined {
  return pool[findOpponentIndex(candidate, pool, config)];
}

export function assignSwissBye(states: SwissRecord[], config: SwissConfig): SwissRecord | undefined {
  return states[findByeIndex(states, config)];
}

export function assignSidesForMatch(
  teamAState: SwissRecord,
  teamBState: SwissRecord,
  _config: Partial<SwissConfig> = {}
): { teamAId: string; teamBId: string; sideA: "A" | "B"; sideB: "A" | "B"; warning?: string } {
  void _config;
  const aSideACount = teamAState.sideHistory?.filter((side) => side === "A").length ?? 0;
  const bSideACount = teamBState.sideHistory?.filter((side) => side === "A").length ?? 0;
  const sideA = aSideACount <= bSideACount ? "A" : "B";
  return {
    teamAId: teamAState.teamId,
    teamBId: teamBState.teamId,
    sideA,
    sideB: sideA === "A" ? "B" : "A"
  };
}

export function getSwissAdvancingTeams(stage: SwissStage, teams: Team[]): Team[] {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const records = getRankedSwissRecords(stage);

  const advancingRecords =
    stage.config.advanceMode === "wins"
      ? records.filter((record) => record.wins >= stage.config.advanceWins)
      : records.slice(0, stage.config.advanceCount);

  return advancingRecords
    .slice(0, stage.config.advanceCount)
    .map((record, index) => {
      const team = teamsById.get(record.teamId);

      if (!team) {
        return undefined;
      }

      return {
        ...team,
        defaultSeed: index + 1
      };
    })
    .filter(Boolean) as Team[];
}

export function applySwissMatchResult(
  stage: SwissStage,
  matchId: string,
  scoreA?: number,
  scoreB?: number,
  winnerId?: string,
  isDraw?: boolean
): SwissStage {
  return updateSwissMatchResult(stage, matchId, scoreA, scoreB, isDraw ? undefined : winnerId);
}

export function calculateSwissStandings(
  stage: SwissStage,
  _teams: Team[],
  _config: Partial<SwissConfig> = {}
): SwissRecord[] {
  void _teams;
  void _config;
  return getRankedSwissRecords(stage);
}

export function getSwissEliminatedTeams(stage: SwissStage, teams: Team[]): Team[] {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  return stage.records
    .filter((record) => record.status === "eliminated")
    .map((record) => teamsById.get(record.teamId))
    .filter(Boolean) as Team[];
}

export function getRankedSwissRecords(stage: SwissStage): SwissRecord[] {
  const standings: LeagueStanding[] = stage.records.map((record) => ({
    rank: 0,
    teamId: record.teamId,
    played: record.played,
    wins: record.wins,
    draws: record.draws,
    losses: record.losses,
    goalsFor: record.goalsFor,
    goalsAgainst: record.goalsAgainst,
    goalDifference: record.goalDifference,
    points: record.points,
    seed: record.seed
  }));
  const ranks = new Map(rankStandings(standings).map((standing) => [standing.teamId, standing.rank]));

  return [...stage.records]
    .sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
      if (a.wins !== b.wins) return b.wins - a.wins;
      return a.seed - b.seed;
    })
    .map((record) => ({
      ...record,
      rank: ranks.get(record.teamId) ?? 0
    }));
}

function createInitialSwissRecords(teams: Team[]): SwissRecord[] {
  return teams.map((team, index) => ({
    teamId: team.id,
    wins: 0,
    draws: 0,
    losses: 0,
    played: 0,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    seed: team.defaultSeed ?? index + 1,
    byeCount: 0,
    hadBye: false,
    sideHistory: [],
    status: "active",
    opponents: []
  }));
}

function calculateSwissRecords(
  matches: SwissMatch[],
  teamIds: string[],
  fallbackRecords: SwissRecord[],
  config: SwissConfig
): SwissRecord[] {
  const fallbackById = new Map(fallbackRecords.map((record) => [record.teamId, record]));
  const records = new Map<string, SwissRecord>();

  teamIds.forEach((teamId, index) => {
    const fallback = fallbackById.get(teamId);
    records.set(teamId, {
      teamId,
      wins: 0,
      draws: 0,
      losses: 0,
      played: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      seed: fallback?.seed ?? index + 1,
      byeCount: 0,
      hadBye: false,
      sideHistory: [],
      status: "active",
      opponents: []
    });
  });

  matches.forEach((match) => {
    if (!match.teamAId || match.status === "pending") {
      return;
    }

    const recordA = records.get(match.teamAId);
    const recordB = match.teamBId ? records.get(match.teamBId) : undefined;

    if (!recordA) {
      return;
    }

    if (match.isBye) {
      recordA.byeCount += 1;
      recordA.hadBye = true;

      if (config.byeCountsAsWin) {
        recordA.played += 1;
        recordA.wins += 1;
        recordA.points += 3;
        recordA.goalsFor += match.scoreA ?? 1;
        recordA.goalsAgainst += match.scoreB ?? 0;
      }

      return;
    }

    if (
      !recordB ||
      match.scoreA === undefined ||
      match.scoreB === undefined ||
      !match.teamBId
    ) {
      return;
    }

    recordA.played += 1;
    recordB.played += 1;
    recordA.goalsFor += match.scoreA;
    recordA.goalsAgainst += match.scoreB;
    recordB.goalsFor += match.scoreB;
    recordB.goalsAgainst += match.scoreA;
    recordA.opponents.push(match.teamBId);
    recordB.opponents.push(match.teamAId);
    recordA.sideHistory = [...(recordA.sideHistory ?? []), "A"];
    recordB.sideHistory = [...(recordB.sideHistory ?? []), "B"];

    if (match.scoreA === match.scoreB && config.allowDraw) {
      recordA.draws += 1;
      recordB.draws += 1;
      recordA.points += 1;
      recordB.points += 1;
    } else if (match.winnerId === match.teamAId || match.scoreA > match.scoreB) {
      recordA.wins += 1;
      recordB.losses += 1;
      recordA.points += 3;
    } else {
      recordB.wins += 1;
      recordA.losses += 1;
      recordB.points += 3;
    }
  });

  return [...records.values()].map((record) => ({
    ...record,
    goalDifference: record.goalsFor - record.goalsAgainst,
    status: getSwissTeamStatus(record, config)
  }));
}

function getSwissTeamStatus(record: SwissRecord, config: SwissConfig) {
  if (config.advanceMode === "wins" && record.wins >= config.advanceWins) {
    return "advanced";
  }

  if (record.losses >= config.eliminateLosses) {
    return "eliminated";
  }

  return "active";
}

function createSwissPairings(records: SwissRecord[], config: SwissConfig) {
  const sorted = [...records].sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    if (a.points !== b.points) return b.points - a.points;
    return a.seed - b.seed;
  });
  const pairings: Array<{ teamAId: string; teamBId?: string }> = [];
  const pool = [...sorted];

  if (pool.length % 2 === 1 && config.allowBye) {
    const byeIndex = findByeIndex(pool, config);
    const [byeRecord] = pool.splice(byeIndex, 1);
    pairings.push({ teamAId: byeRecord.teamId });
  }

  while (pool.length > 1) {
    const first = pool.shift();

    if (!first) {
      break;
    }

    const opponentIndex = findOpponentIndex(first, pool, config);
    const [opponent] = pool.splice(opponentIndex, 1);
    pairings.push({ teamAId: first.teamId, teamBId: opponent.teamId });
  }

  if (pool.length === 1) {
    pairings.push({ teamAId: pool[0].teamId });
  }

  return pairings;
}

function findByeIndex(records: SwissRecord[], config: SwissConfig): number {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (!config.preventMultipleByes || records[index].byeCount === 0) {
      return index;
    }
  }

  return records.length - 1;
}

function findOpponentIndex(
  first: SwissRecord,
  candidates: SwissRecord[],
  config: SwissConfig
): number {
  if (!config.avoidRematch) {
    return 0;
  }

  const sameRecordIndex = candidates.findIndex(
    (candidate) =>
      candidate.wins === first.wins &&
      candidate.losses === first.losses &&
      !first.opponents.includes(candidate.teamId)
  );

  if (sameRecordIndex >= 0) {
    return sameRecordIndex;
  }

  const nonRematchIndex = candidates.findIndex(
    (candidate) => !first.opponents.includes(candidate.teamId)
  );

  return nonRematchIndex >= 0 ? nonRematchIndex : 0;
}

function finalizeSwissStage(stage: SwissStage): SwissStage {
  const currentRoundMatches = stage.matches.filter(
    (match) => match.round === stage.currentRound && !match.isBye
  );
  const currentRoundComplete =
    currentRoundMatches.length === 0 ||
    currentRoundMatches.every((match) => match.status === "complete");
  const completeByRoundLimit = stage.currentRound >= stage.config.maxRounds && currentRoundComplete;
  const activeCount = stage.records.filter((record) => record.status === "active").length;

  return {
    ...stage,
    isComplete: completeByRoundLimit || activeCount <= 1
  };
}

function formatScale(value: number) {
  if (!Number.isFinite(value)) return "1";
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2);
}
