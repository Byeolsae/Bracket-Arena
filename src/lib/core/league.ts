import type { AdvancementRule, LeagueMatch, LeagueOptions, LeagueStage, Team } from "./models";
import { calculateLeagueStandings } from "./ranking";

const defaultLeagueOptions: LeagueOptions = {
  rounds: 1,
  allowDraw: true,
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  advanceCount: 4,
  tiebreakers: ["points", "goalDifference", "goalsFor", "wins", "seed"]
};

export function generateLeagueSchedule(
  teams: Team[],
  options: Partial<LeagueOptions> = {}
): LeagueMatch[] {
  const merged = { ...defaultLeagueOptions, ...options };
  const teamIds = teams.map((team) => team.id);
  const hasBye = teamIds.length % 2 === 1;
  const slots = hasBye ? [...teamIds, undefined] : [...teamIds];
  const rounds = slots.length - 1;
  const matchesPerRound = slots.length / 2;
  const matches: LeagueMatch[] = [];
  let rotating = [...slots];

  for (let round = 1; round <= rounds; round += 1) {
    for (let index = 0; index < matchesPerRound; index += 1) {
      const teamAId = rotating[index];
      const teamBId = rotating[rotating.length - 1 - index];

      if (!teamAId || !teamBId) {
        const restingTeamId = teamAId || teamBId;
        if (restingTeamId) {
          matches.push({
            id: `league-r${round}-m${index + 1}-bye`,
            round,
            matchNumber: index + 1,
            teamAId: restingTeamId,
            status: "bye",
            isBye: true
          });
        }
        continue;
      }

      matches.push({
        id: `league-r${round}-m${index + 1}`,
        round,
        matchNumber: index + 1,
        teamAId,
        teamBId,
        status: "pending"
      });
    }

    rotating = [rotating[0], rotating[rotating.length - 1], ...rotating.slice(1, -1)];
  }

  if (merged.rounds === 1) {
    return matches;
  }

  const secondLeg = matches
    .filter((match) => !match.isBye)
    .map((match) => ({
      ...match,
      id: `${match.id}-leg2`,
      round: match.round + rounds,
      teamAId: match.teamBId,
      teamBId: match.teamAId,
      scoreA: undefined,
      scoreB: undefined,
      winnerId: undefined,
      loserId: undefined,
      status: "pending" as const
    }));

  const secondLegByes = matches
    .filter((match) => match.isBye)
    .map((match) => ({
      ...match,
      id: `${match.id}-leg2`,
      round: match.round + rounds
    }));

  return [...matches, ...secondLeg, ...secondLegByes];
}

export function createLeagueStage(
  teams: Team[],
  options: Partial<LeagueOptions> = {}
): LeagueStage {
  const merged = { ...defaultLeagueOptions, ...options };

  return {
    id: `league-stage-${Date.now()}`,
    type: "league",
    teamIds: teams.map((team) => team.id),
    options: merged,
    matches: generateLeagueSchedule(teams, merged),
    warnings:
      teams.length % 2 === 1
        ? ["홀수 팀 리그입니다. 각 라운드마다 한 팀이 휴식(BYE)을 받습니다."]
        : []
  };
}

export function updateLeagueMatchResult(
  matches: LeagueMatch[],
  matchId: string,
  scoreA?: number,
  scoreB?: number
): LeagueMatch[] {
  return matches.map((match) => {
    if (match.id !== matchId) {
      return match;
    }

    if (scoreA === undefined || scoreB === undefined) {
      return {
        ...match,
        scoreA: undefined,
        scoreB: undefined,
        winnerId: undefined,
        loserId: undefined,
        status: "pending"
      };
    }

    const winnerId =
      scoreA === scoreB ? undefined : scoreA > scoreB ? match.teamAId : match.teamBId;
    const loserId =
      scoreA === scoreB ? undefined : scoreA > scoreB ? match.teamBId : match.teamAId;

    return {
      ...match,
      scoreA,
      scoreB,
      winnerId,
      loserId,
      status: "complete"
    };
  });
}

export function applyLeagueMatchResult(
  stage: LeagueStage,
  matchId: string,
  scoreA?: number,
  scoreB?: number,
  winnerId?: string,
  isDraw?: boolean
): LeagueStage {
  return {
    ...stage,
    matches: stage.matches.map((match) => {
      if (match.id !== matchId || match.isBye) return match;
      if (scoreA === undefined || scoreB === undefined) {
        return {
          ...match,
          scoreA: undefined,
          scoreB: undefined,
          winnerId: undefined,
          loserId: undefined,
          status: "pending" as const
        };
      }

      const draw = isDraw ?? scoreA === scoreB;
      const resolvedWinnerId = draw
        ? undefined
        : winnerId ?? (scoreA > scoreB ? match.teamAId : match.teamBId);

      return {
        ...match,
        scoreA,
        scoreB,
        winnerId: resolvedWinnerId,
        loserId: draw
          ? undefined
          : resolvedWinnerId === match.teamAId
            ? match.teamBId
            : match.teamAId,
        status: "complete" as const
      };
    })
  };
}

export function getLeagueAdvancingTeams(
  standings: ReturnType<typeof calculateLeagueStandings>,
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

export { calculateLeagueStandings };
