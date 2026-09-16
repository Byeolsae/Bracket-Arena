import type {
  AdvancementRule,
  GroupStage,
  LeagueStage,
  LeagueStanding,
  SwissStage,
  Team,
  Tournament
} from "./models";
import { createSingleEliminationTournament } from "./singleElimination";
import { calculateGroupStandings, getGroupAdvancingTeams } from "./group";
import { calculateLeagueStandings, getLeagueAdvancingTeams } from "./league";
import { getSwissAdvancingTeams, getRankedSwissRecords } from "./swiss";

export type StageWithResults =
  | Tournament
  | LeagueStage
  | GroupStage
  | SwissStage;

export function getAdvancingTeams(
  standings: LeagueStanding[],
  teams: Team[],
  advanceCount: number
): Team[];
export function getAdvancingTeams(
  stage: StageWithResults,
  teams: Team[],
  rule: AdvancementRule
): Team[];
export function getAdvancingTeams(
  source: LeagueStanding[] | StageWithResults,
  teams: Team[],
  ruleOrCount: AdvancementRule | number
): Team[] {
  if (!Array.isArray(source)) {
    return getStageAdvancingTeams(source, teams, ruleOrCount as AdvancementRule);
  }

  const standings = source;
  const advanceCount = typeof ruleOrCount === "number" ? ruleOrCount : ruleOrCount.count;
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  return standings
    .slice(0, Math.max(0, advanceCount))
    .map((standing, index) => {
      const team = teamsById.get(standing.teamId);

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

export function getStageResults(stage: StageWithResults, teams: Team[]) {
  if ("type" in stage && stage.type === "league") {
    return calculateLeagueStandings(stage.matches, teams);
  }

  if ("type" in stage && stage.type === "group") {
    return calculateGroupStandings(stage, teams);
  }

  if ("config" in stage && "records" in stage) {
    return getRankedSwissRecords(stage);
  }

  if ("matches" in stage) {
    return stage.matches;
  }

  return [];
}

export function getStageAdvancingTeams(
  stage: StageWithResults,
  teams: Team[],
  rule: AdvancementRule
): Team[] {
  if ("type" in stage && stage.type === "league") {
    return getLeagueAdvancingTeams(calculateLeagueStandings(stage.matches, teams), teams, rule);
  }

  if ("type" in stage && stage.type === "group") {
    return getGroupAdvancingTeams(
      calculateGroupStandings(stage, teams),
      teams,
      { ...rule, count: rule.mode === "group_top_n_plus_wildcard" ? rule.count : stage.options.advancePerGroup },
      rule.mode === "group_top_n_plus_wildcard" ? stage.options.wildcardCount : 0
    );
  }

  if ("config" in stage && "records" in stage) {
    return getSwissAdvancingTeams(stage, teams);
  }

  if ("championId" in stage && stage.championId) {
    const team = teams.find((item) => item.id === stage.championId);
    return team ? [{ ...team, defaultSeed: 1 }] : [];
  }

  return getAdvancingTeams([], teams, 0);
}

export function createPlayoffFromLeague(advancingTeams: Team[], name = "League Playoffs") {
  return createSingleEliminationTournament(advancingTeams, name);
}
