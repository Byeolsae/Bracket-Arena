import type {
  BracketStageMatch,
  GroupStageOptions,
  GroupTripleEliminationStage,
  MatchParticipant,
  Team,
  TripleEliminationStage
} from "./models";
import { buildSeedOrder } from "./bye";
import { createGroups } from "./group";
import { applyAutoByes, applyLinkedBracketResult } from "./groupDoubleElimination";

const GROUP_TRIPLE_SIZE = 8;
const GROUP_TRIPLE_ADVANCE = 4;

export function createGroupTripleEliminationStage(
  teams: Team[],
  options: Partial<GroupStageOptions> = {}
): GroupTripleEliminationStage {
  const groupCount = options.groupCount ?? Math.max(1, Math.ceil(Math.max(1, teams.length) / GROUP_TRIPLE_SIZE));
  const groups = createGroups(teams, groupCount, {
    assignmentMode: options.assignmentMode ?? "seeded",
    groupCount,
    groupNames: options.groupNames,
    manualGroupAssignments: options.manualGroupAssignments,
    allowUnevenGroups: true
  });
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  return {
    id: `group-triple-${Date.now()}`,
    type: "group_triple_elimination",
    groups,
    advancePerGroup: GROUP_TRIPLE_ADVANCE,
    brackets: groups.map((group) => ({
      groupId: group.id,
      bracket: createGroupTripleBracket(
        group.teamIds.map((teamId) => teamsById.get(teamId)).filter(Boolean) as Team[],
        group.name
      )
    })),
    warnings: createGroupSizeWarnings(groups, GROUP_TRIPLE_SIZE, "그룹 트리플 엘리미네이션")
  };
}

export function applyGroupTripleEliminationResult(
  stage: GroupTripleEliminationStage,
  groupId: string,
  matchId: string,
  scoreA: number | undefined,
  scoreB: number | undefined,
  winnerId: string
): GroupTripleEliminationStage {
  return {
    ...stage,
    brackets: stage.brackets.map((entry) =>
      entry.groupId === groupId
        ? {
            ...entry,
            bracket: applyLinkedBracketResult(entry.bracket, matchId, scoreA, scoreB, winnerId)
          }
        : entry
    )
  };
}

export function getGroupTripleEliminationAdvancingTeams(
  stage: GroupTripleEliminationStage,
  teams: Team[]
): Team[] {
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  return stage.brackets.flatMap((entry) => {
    const matches = entry.bracket.matches;
    const upperFinal = matches.find((match) => match.roundName === "Upper Final");
    const middleFinal = matches.find((match) => match.roundName === "Middle Final");
    const lowerFinal = matches.find((match) => match.roundName === "Lower Final");
    const orderedTeamIds = [
      upperFinal?.winnerId,
      upperFinal?.loserId,
      middleFinal?.winnerId,
      lowerFinal?.winnerId
    ].filter(Boolean) as string[];

    return Array.from(new Set(orderedTeamIds))
      .slice(0, GROUP_TRIPLE_ADVANCE)
      .map((teamId) => teamsById.get(teamId))
      .filter(Boolean) as Team[];
  });
}

function createGroupTripleBracket(teams: Team[], groupName: string): TripleEliminationStage {
  const participants = seedParticipants(teams, GROUP_TRIPLE_SIZE);
  const prefix = makeSafeId(groupName);
  const matches: BracketStageMatch[] = [
    createMatch({
      id: `${prefix}-upper-qf-1`,
      round: 1,
      roundName: "Upper Quarterfinal",
      matchNumber: 1,
      bracketGroup: "zero-loss",
      participantA: participants[0],
      participantB: participants[1],
      nextMatchId: `${prefix}-upper-sf-1`,
      nextMatchSlot: "A",
      loserNextMatchId: `${prefix}-middle-qf-1`,
      loserNextMatchSlot: "A"
    }),
    createMatch({
      id: `${prefix}-upper-qf-2`,
      round: 1,
      roundName: "Upper Quarterfinal",
      matchNumber: 2,
      bracketGroup: "zero-loss",
      participantA: participants[2],
      participantB: participants[3],
      nextMatchId: `${prefix}-upper-sf-1`,
      nextMatchSlot: "B",
      loserNextMatchId: `${prefix}-middle-qf-1`,
      loserNextMatchSlot: "B"
    }),
    createMatch({
      id: `${prefix}-upper-qf-3`,
      round: 1,
      roundName: "Upper Quarterfinal",
      matchNumber: 3,
      bracketGroup: "zero-loss",
      participantA: participants[4],
      participantB: participants[5],
      nextMatchId: `${prefix}-upper-sf-2`,
      nextMatchSlot: "A",
      loserNextMatchId: `${prefix}-middle-qf-2`,
      loserNextMatchSlot: "A"
    }),
    createMatch({
      id: `${prefix}-upper-qf-4`,
      round: 1,
      roundName: "Upper Quarterfinal",
      matchNumber: 4,
      bracketGroup: "zero-loss",
      participantA: participants[6],
      participantB: participants[7],
      nextMatchId: `${prefix}-upper-sf-2`,
      nextMatchSlot: "B",
      loserNextMatchId: `${prefix}-middle-qf-2`,
      loserNextMatchSlot: "B"
    }),
    createMatch({
      id: `${prefix}-upper-sf-1`,
      round: 2,
      roundName: "Upper Semifinal",
      matchNumber: 1,
      bracketGroup: "zero-loss",
      nextMatchId: `${prefix}-upper-final`,
      nextMatchSlot: "A",
      loserNextMatchId: `${prefix}-middle-sf-1`,
      loserNextMatchSlot: "B"
    }),
    createMatch({
      id: `${prefix}-upper-sf-2`,
      round: 2,
      roundName: "Upper Semifinal",
      matchNumber: 2,
      bracketGroup: "zero-loss",
      nextMatchId: `${prefix}-upper-final`,
      nextMatchSlot: "B",
      loserNextMatchId: `${prefix}-middle-sf-2`,
      loserNextMatchSlot: "B"
    }),
    createMatch({
      id: `${prefix}-upper-final`,
      round: 3,
      roundName: "Upper Final",
      matchNumber: 1,
      bracketGroup: "zero-loss"
    }),
    createMatch({
      id: `${prefix}-middle-qf-1`,
      round: 1,
      roundName: "Middle Quarterfinal",
      matchNumber: 1,
      bracketGroup: "one-loss",
      nextMatchId: `${prefix}-middle-sf-1`,
      nextMatchSlot: "A",
      loserNextMatchId: `${prefix}-lower-qf`,
      loserNextMatchSlot: "A"
    }),
    createMatch({
      id: `${prefix}-middle-qf-2`,
      round: 1,
      roundName: "Middle Quarterfinal",
      matchNumber: 2,
      bracketGroup: "one-loss",
      nextMatchId: `${prefix}-middle-sf-2`,
      nextMatchSlot: "A",
      loserNextMatchId: `${prefix}-lower-qf`,
      loserNextMatchSlot: "B"
    }),
    createMatch({
      id: `${prefix}-middle-sf-1`,
      round: 2,
      roundName: "Middle Semifinal",
      matchNumber: 1,
      bracketGroup: "one-loss",
      nextMatchId: `${prefix}-middle-final`,
      nextMatchSlot: "A",
      loserNextMatchId: `${prefix}-lower-sf-1`,
      loserNextMatchSlot: "A"
    }),
    createMatch({
      id: `${prefix}-middle-sf-2`,
      round: 2,
      roundName: "Middle Semifinal",
      matchNumber: 2,
      bracketGroup: "one-loss",
      nextMatchId: `${prefix}-middle-final`,
      nextMatchSlot: "B",
      loserNextMatchId: `${prefix}-lower-sf-1`,
      loserNextMatchSlot: "B"
    }),
    createMatch({
      id: `${prefix}-middle-final`,
      round: 3,
      roundName: "Middle Final",
      matchNumber: 1,
      bracketGroup: "one-loss",
      loserNextMatchId: `${prefix}-lower-sf-2`,
      loserNextMatchSlot: "B"
    }),
    createMatch({
      id: `${prefix}-lower-qf`,
      round: 1,
      roundName: "Lower Quarterfinal",
      matchNumber: 1,
      bracketGroup: "two-loss",
      nextMatchId: `${prefix}-lower-sf-2`,
      nextMatchSlot: "A"
    }),
    createMatch({
      id: `${prefix}-lower-sf-1`,
      round: 2,
      roundName: "Lower Semifinal",
      matchNumber: 1,
      bracketGroup: "two-loss",
      nextMatchId: `${prefix}-lower-final`,
      nextMatchSlot: "A"
    }),
    createMatch({
      id: `${prefix}-lower-sf-2`,
      round: 2,
      roundName: "Lower Semifinal",
      matchNumber: 2,
      bracketGroup: "two-loss",
      nextMatchId: `${prefix}-lower-final`,
      nextMatchSlot: "B"
    }),
    createMatch({
      id: `${prefix}-lower-final`,
      round: 3,
      roundName: "Lower Final",
      matchNumber: 1,
      bracketGroup: "two-loss"
    })
  ];

  applyAutoByes(matches);

  return {
    id: `${prefix}-group-triple`,
    format: "triple-elimination",
    teamIds: teams.map((team) => team.id),
    matches,
    lossCounts: {},
    eliminatedTeamIds: [],
    warnings: teams.length < GROUP_TRIPLE_SIZE ? [`${groupName}: 부족한 ${GROUP_TRIPLE_SIZE - teams.length}개 슬롯은 부전승으로 처리됩니다.`] : []
  };
}

function createMatch(input: Omit<BracketStageMatch, "status">): BracketStageMatch {
  return {
    ...input,
    status: input.participantA?.teamId && input.participantB?.teamId ? "ready" : "pending"
  };
}

function seedParticipants(teams: Team[], size: number): MatchParticipant[] {
  return buildSeedOrder(size).map((seed) => {
    const team = teams[seed - 1];
    return team ? { teamId: team.id, seed } : { seed, isBye: true };
  });
}

function createGroupSizeWarnings(groups: Array<{ name: string; teamIds: string[] }>, maxSize: number, label: string) {
  return groups
    .filter((group) => group.teamIds.length > maxSize)
    .map((group) => `${label}은 조별 ${maxSize}팀까지만 지원합니다. ${group.name}: ${group.teamIds.length}팀`);
}

function makeSafeId(value: string) {
  const readableId = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return readableId || `group-${hash.toString(36)}`;
}
