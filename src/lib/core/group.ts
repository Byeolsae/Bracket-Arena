import type {
  AdvancementRule,
  Group,
  GroupStage,
  GroupStageOptions,
  LeagueMatch,
  LeagueStanding,
  Team
} from "./models";
import { generateLeagueSchedule, updateLeagueMatchResult } from "./league";
import { calculateLeagueStandings } from "./ranking";

const defaultGroupOptions: GroupStageOptions = {
  groupCount: 4,
  assignmentMode: "seeded",
  doubleRoundRobin: false,
  allowDraw: true,
  advancePerGroup: 2,
  wildcardCount: 0,
  allowUnevenGroups: true
};

export function createGroups(
  teams: Team[],
  groupCount: number,
  options: Partial<GroupStageOptions> = {}
): Group[] {
  const safeGroupCount = normalizeGroupCount(teams.length, groupCount);
  const merged = { ...defaultGroupOptions, ...options, groupCount: safeGroupCount };
  const ordered =
    merged.assignmentMode === "random"
      ? [...teams].sort(() => Math.random() - 0.5)
      : [...teams].sort(
          (a, b) =>
            (a.defaultSeed ?? Number.MAX_SAFE_INTEGER) -
            (b.defaultSeed ?? Number.MAX_SAFE_INTEGER)
        );
  const groups = Array.from({ length: safeGroupCount }, (_, index) => ({
    id: `group-${index + 1}`,
    name: merged.groupNames?.[index] ?? `${String.fromCharCode(65 + index)}그룹`,
    teamIds: [] as string[]
  }));

  ordered.forEach((team, index) => {
    const groupIndex =
      merged.assignmentMode === "manual"
        ? clampGroupIndex(merged.manualGroupAssignments?.[team.id] ?? index, safeGroupCount)
        : merged.assignmentMode === "seeded"
        ? index % safeGroupCount
        : Math.min(safeGroupCount - 1, index % safeGroupCount);
    groups[groupIndex].teamIds.push(team.id);
  });

  return groups;
}

function normalizePositiveInteger(value: number | undefined, fallback: number) {
  const next = Math.floor(Number(value));
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

function normalizeNonNegativeInteger(value: number | undefined, fallback: number) {
  const next = Math.floor(Number(value));
  return Number.isFinite(next) && next >= 0 ? next : fallback;
}

function normalizeGroupCount(teamCount: number, requested: number | undefined) {
  const maxGroups = Math.max(1, teamCount);
  return Math.max(1, Math.min(maxGroups, normalizePositiveInteger(requested, 1)));
}

function normalizeAdvancePerGroup(groups: Group[], requested: number | undefined) {
  const maxGroupSize = Math.max(0, ...groups.map((group) => group.teamIds.length));
  if (maxGroupSize <= 0) return 0;
  return Math.max(1, Math.min(maxGroupSize, normalizePositiveInteger(requested, 1)));
}

function clampGroupIndex(index: number, groupCount: number) {
  return Math.max(0, Math.min(groupCount - 1, Math.floor(index)));
}

export function generateGroupStageSchedule(
  groups: Group[],
  teams: Team[],
  options: Partial<GroupStageOptions> = {}
): LeagueMatch[] {
  const merged = { ...defaultGroupOptions, ...options };
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  return groups.flatMap((group, groupIndex) => {
    const groupTeams = group.teamIds.map((id) => teamsById.get(id)).filter(Boolean) as Team[];
    return generateLeagueSchedule(groupTeams, { rounds: merged.doubleRoundRobin ? 2 : 1 }).map(
      (match) => ({
        ...match,
        id: `${group.id}-${match.id}`,
        round: match.round,
        matchNumber: groupIndex * 100 + match.matchNumber
      })
    );
  });
}

export function createGroupStage(
  teams: Team[],
  options: Partial<GroupStageOptions> = {}
): GroupStage {
  const merged = { ...defaultGroupOptions, ...options };
  const groups = createGroups(teams, merged.groupCount, merged);
  const advancePerGroup = normalizeAdvancePerGroup(groups, merged.advancePerGroup);
  const directAdvancers = groups.reduce(
    (sum, group) => sum + Math.min(group.teamIds.length, advancePerGroup),
    0
  );
  const wildcardCount = Math.min(
    Math.max(0, teams.length - directAdvancers),
    normalizeNonNegativeInteger(merged.wildcardCount, 0)
  );
  const safeOptions = {
    ...merged,
    groupCount: groups.length,
    advancePerGroup,
    wildcardCount
  };
  const warnings: string[] = [];

  if (merged.groupCount !== groups.length) {
    warnings.push(`참가팀 ${teams.length}팀 기준으로 조 개수를 ${groups.length}개로 보정했습니다.`);
  }
  if (merged.advancePerGroup !== advancePerGroup) {
    warnings.push(`조별 진출팀 수를 조 인원에 맞춰 ${advancePerGroup}팀으로 보정했습니다.`);
  }
  if (merged.wildcardCount !== wildcardCount) {
    warnings.push(`와일드카드 진출팀 수를 남은 팀 수에 맞춰 ${wildcardCount}팀으로 보정했습니다.`);
  }
  if (teams.length > 0 && teams.length % groups.length !== 0) {
    warnings.push(`${teams.length}팀을 ${groups.length}개 조로 균등 분배했습니다. 일부 조 인원이 다릅니다.`);
  }

  return {
    id: `group-stage-${Date.now()}`,
    type: "group",
    groups,
    options: safeOptions,
    matches: generateGroupStageSchedule(groups, teams, safeOptions),
    warnings
  };
}

export function applyGroupMatchResult(
  stage: GroupStage,
  matchId: string,
  scoreA?: number,
  scoreB?: number,
  winnerId?: string,
  isDraw?: boolean
): GroupStage {
  return {
    ...stage,
    matches: stage.matches.map((match) => {
      if (match.id !== matchId || match.isBye) return match;
      const [updated] = updateLeagueMatchResult([match], match.id, scoreA, scoreB);
      return {
        ...updated,
        winnerId: isDraw ? undefined : winnerId ?? updated.winnerId,
        loserId: isDraw ? undefined : updated.loserId
      };
    })
  };
}

export function calculateGroupStandings(
  stage: GroupStage,
  teams: Team[]
): Record<string, LeagueStanding[]> {
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  return Object.fromEntries(
    stage.groups.map((group) => {
      const groupTeams = group.teamIds.map((id) => teamsById.get(id)).filter(Boolean) as Team[];
      const groupMatches = stage.matches.filter((match) => match.id.startsWith(group.id));
      return [group.id, calculateLeagueStandings(groupMatches, groupTeams)];
    })
  );
}

export function getGroupAdvancingTeams(
  groupStandings: Record<string, LeagueStanding[]>,
  teams: Team[],
  advancementRule: AdvancementRule,
  wildcardCount = 0
): Team[] {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const directCount = normalizeNonNegativeInteger(advancementRule.count, 0);
  const safeWildcardCount = normalizeNonNegativeInteger(wildcardCount, 0);
  const direct: LeagueStanding[] = [];
  const wildcardPool: LeagueStanding[] = [];
  const seen = new Set<string>();

  Object.values(groupStandings).forEach((standings) => {
    standings.slice(0, directCount).forEach((standing) => {
      if (!seen.has(standing.teamId)) {
        seen.add(standing.teamId);
        direct.push(standing);
      }
    });
    wildcardPool.push(...standings.slice(directCount).filter((standing) => !seen.has(standing.teamId)));
  });

  const wildcards = wildcardPool
    .sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
      return a.seed - b.seed;
    })
    .slice(0, safeWildcardCount);

  return [...direct, ...wildcards]
    .map((standing, index) => {
      const team = teamsById.get(standing.teamId);
      return team ? { ...team, defaultSeed: index + 1 } : undefined;
    })
    .filter(Boolean) as Team[];
}
