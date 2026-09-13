import type {
  BracketStageMatch,
  DoubleEliminationBracket,
  GroupDoubleEliminationStage,
  GroupStageOptions,
  MatchParticipant,
  Team
} from "./models";
import { buildSeedOrder } from "./bye";
import { createGroups } from "./group";

const GSL_GROUP_SIZE = 4;
const GROUP_DOUBLE_ADVANCE = 2;

type GroupDoubleEliminationOptions = Partial<GroupStageOptions> & {
  groupSize?: number;
  teamsPerGroup?: number;
};

export function createGroupDoubleEliminationStage(
  teams: Team[],
  options: GroupDoubleEliminationOptions = {}
): GroupDoubleEliminationStage {
  const groupSize = GSL_GROUP_SIZE;
  const advancePerGroup = GROUP_DOUBLE_ADVANCE;
  const groupCount = options.groupCount ?? Math.max(1, Math.ceil(Math.max(1, teams.length) / groupSize));
  const groups = createGroups(teams, groupCount, {
    assignmentMode: options.assignmentMode ?? "seeded",
    groupCount,
    groupNames: options.groupNames,
    manualGroupAssignments: options.manualGroupAssignments,
    allowUnevenGroups: true
  });
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  return {
    id: `group-double-${Date.now()}`,
    type: "group_double_elimination",
    groups,
    teamsPerGroup: groupSize,
    advancePerGroup,
    brackets: groups.map((group) => {
      const groupTeams = group.teamIds.map((teamId) => teamsById.get(teamId)).filter(Boolean) as Team[];

      return {
        groupId: group.id,
        bracket: createGslGroupBracket(groupTeams, group.name)
      };
    }),
    warnings: createGroupSizeWarnings(groups, groupSize, "그룹 더블 엘리미네이션")
  };
}

export function applyGroupDoubleEliminationResult(
  stage: GroupDoubleEliminationStage,
  groupId: string,
  matchId: string,
  scoreA: number | undefined,
  scoreB: number | undefined,
  winnerId: string
): GroupDoubleEliminationStage {
  return {
    ...stage,
    brackets: stage.brackets.map((entry) =>
      entry.groupId === groupId
        ? { ...entry, bracket: applyLinkedBracketResult(entry.bracket, matchId, scoreA, scoreB, winnerId) }
        : entry
    )
  };
}

export function getGroupDoubleEliminationAdvancingTeams(
  stage: GroupDoubleEliminationStage,
  teams: Team[]
): Team[] {
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  return stage.brackets.flatMap((entry) => {
    const orderedTeamIds = [
      entry.bracket.matches.find((match) => match.roundName === "Winners Match")?.winnerId,
      entry.bracket.matches.find((match) => match.roundName === "Decider Match")?.winnerId
    ].filter(Boolean);

    return (orderedTeamIds as string[])
      .slice(0, stage.advancePerGroup)
      .map((teamId) => teamsById.get(teamId))
      .filter(Boolean) as Team[];
  });
}

function createGslGroupBracket(teams: Team[], groupName: string): DoubleEliminationBracket {
  const prefix = makeSafeId(groupName);
  const participants = seedParticipants(teams, GSL_GROUP_SIZE);
  const matches: BracketStageMatch[] = [
    createMatch({
      id: `${prefix}-gsl-opening-1`,
      round: 1,
      roundName: "Opening Match 1",
      matchNumber: 1,
      bracketGroup: "winners",
      participantA: participants[0],
      participantB: participants[1],
      nextMatchId: `${prefix}-gsl-winners`,
      nextMatchSlot: "A",
      loserNextMatchId: `${prefix}-gsl-losers`,
      loserNextMatchSlot: "A"
    }),
    createMatch({
      id: `${prefix}-gsl-opening-2`,
      round: 1,
      roundName: "Opening Match 2",
      matchNumber: 2,
      bracketGroup: "winners",
      participantA: participants[2],
      participantB: participants[3],
      nextMatchId: `${prefix}-gsl-winners`,
      nextMatchSlot: "B",
      loserNextMatchId: `${prefix}-gsl-losers`,
      loserNextMatchSlot: "B"
    }),
    createMatch({
      id: `${prefix}-gsl-winners`,
      round: 2,
      roundName: "Winners Match",
      matchNumber: 1,
      bracketGroup: "winners",
      loserNextMatchId: `${prefix}-gsl-decider`,
      loserNextMatchSlot: "A"
    }),
    createMatch({
      id: `${prefix}-gsl-losers`,
      round: 2,
      roundName: "Elimination Match",
      matchNumber: 2,
      bracketGroup: "losers",
      nextMatchId: `${prefix}-gsl-decider`,
      nextMatchSlot: "B"
    }),
    createMatch({
      id: `${prefix}-gsl-decider`,
      round: 3,
      roundName: "Decider Match",
      matchNumber: 1,
      bracketGroup: "grand-final"
    })
  ];

  applyAutoByes(matches);

  return {
    id: `${prefix}-gsl`,
    format: "double-elimination",
    teamIds: teams.map((team) => team.id),
    bracketReset: false,
    grandFinalBestOf: 1,
    matches,
    eliminatedTeamIds: []
  };
}

export function applyLinkedBracketResult<T extends { matches: BracketStageMatch[]; championId?: string }>(
  bracket: T,
  matchId: string,
  scoreA: number | undefined,
  scoreB: number | undefined,
  winnerId: string
): T {
  const matches = bracket.matches.map((match) => ({ ...match }));
  const match = matches.find((item) => item.id === matchId);
  if (!match) return bracket;

  const participantIds = [match.participantA?.teamId, match.participantB?.teamId].filter(Boolean) as string[];
  if (!participantIds.includes(winnerId)) return bracket;

  clearDependentMatches(matches, match);

  const loserId = participantIds.find((teamId) => teamId !== winnerId);
  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.winnerId = winnerId;
  match.loserId = loserId;
  match.status = "complete";

  routeParticipant(matches, match.nextMatchId, match.nextMatchSlot, winnerId, match.id);
  if (loserId) routeParticipant(matches, match.loserNextMatchId, match.loserNextMatchSlot, loserId, match.id);
  applyAutoByes(matches);

  return { ...bracket, matches, championId: getTerminalWinner(matches) };
}

export function applyAutoByes(matches: BracketStageMatch[]) {
  let changed = true;

  while (changed) {
    changed = false;

    for (const match of matches) {
      if (match.status === "complete" || match.status === "bye") continue;

      const teamA = match.participantA?.teamId;
      const teamB = match.participantB?.teamId;
      const byeA = match.participantA?.isBye === true;
      const byeB = match.participantB?.isBye === true;
      const winnerId = teamA && byeB ? teamA : teamB && byeA ? teamB : undefined;

      if (!winnerId) continue;

      match.scoreA = undefined;
      match.scoreB = undefined;
      match.winnerId = winnerId;
      match.loserId = undefined;
      match.status = "bye";

      routeParticipant(matches, match.nextMatchId, match.nextMatchSlot, winnerId, match.id);
      routeBye(matches, match.loserNextMatchId, match.loserNextMatchSlot, match.id);
      changed = true;
    }
  }
}

function clearDependentMatches(matches: BracketStageMatch[], source: BracketStageMatch) {
  const queue = [source.nextMatchId, source.loserNextMatchId].filter(Boolean) as string[];
  const seen = new Set<string>();

  while (queue.length) {
    const id = queue.shift() as string;
    if (seen.has(id)) continue;
    seen.add(id);

    const match = matches.find((item) => item.id === id);
    if (!match) continue;

    if (match.participantA?.sourceMatchId === source.id) match.participantA = { sourceMatchId: source.id };
    if (match.participantB?.sourceMatchId === source.id) match.participantB = { sourceMatchId: source.id };
    match.scoreA = undefined;
    match.scoreB = undefined;
    match.winnerId = undefined;
    match.loserId = undefined;
    match.status = match.participantA?.teamId && match.participantB?.teamId ? "ready" : "pending";

    if (match.nextMatchId) queue.push(match.nextMatchId);
    if (match.loserNextMatchId) queue.push(match.loserNextMatchId);
  }
}

function routeBye(
  matches: BracketStageMatch[],
  nextMatchId: string | undefined,
  nextMatchSlot: "A" | "B" | undefined,
  sourceMatchId: string
) {
  if (!nextMatchId || !nextMatchSlot) return;
  const nextMatch = matches.find((match) => match.id === nextMatchId);
  if (!nextMatch) return;

  const participant = { sourceMatchId, isBye: true };
  if (nextMatchSlot === "A") nextMatch.participantA = participant;
  else nextMatch.participantB = participant;
  nextMatch.status = nextMatch.participantA?.teamId && nextMatch.participantB?.teamId ? "ready" : "pending";
}

function routeParticipant(
  matches: BracketStageMatch[],
  nextMatchId: string | undefined,
  nextMatchSlot: "A" | "B" | undefined,
  teamId: string,
  sourceMatchId: string
) {
  if (!nextMatchId || !nextMatchSlot) return;
  const nextMatch = matches.find((match) => match.id === nextMatchId);
  if (!nextMatch) return;

  const participant = { teamId, sourceMatchId };
  if (nextMatchSlot === "A") nextMatch.participantA = participant;
  else nextMatch.participantB = participant;
  nextMatch.status = nextMatch.participantA?.teamId && nextMatch.participantB?.teamId ? "ready" : "pending";
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
    .map((group) => `${label}은 조별 최대 ${maxSize}팀까지 지원합니다. ${group.name}: ${group.teamIds.length}팀`);
}

function getTerminalWinner(matches: BracketStageMatch[]) {
  const terminalMatches = matches.filter((match) => !match.nextMatchId && match.status === "complete");
  return terminalMatches.at(-1)?.winnerId;
}

function makeSafeId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return `group-${hash.toString(36)}`;
}
