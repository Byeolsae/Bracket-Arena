import type { LeagueMatch, LeagueStanding, Team } from "./models";

export function calculateLeagueStandings(
  matches: LeagueMatch[],
  teams: Team[]
): LeagueStanding[] {
  const standings = new Map<string, LeagueStanding>();

  teams.forEach((team, index) => {
    standings.set(team.id, {
      rank: 0,
      teamId: team.id,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      seed: team.defaultSeed ?? index + 1
    });
  });

  matches.forEach((match) => {
    if (
      match.status !== "complete" ||
      !match.teamAId ||
      !match.teamBId ||
      match.scoreA === undefined ||
      match.scoreB === undefined
    ) {
      return;
    }

    const teamA = standings.get(match.teamAId);
    const teamB = standings.get(match.teamBId);

    if (!teamA || !teamB) {
      return;
    }

    teamA.played += 1;
    teamB.played += 1;
    teamA.goalsFor += match.scoreA;
    teamA.goalsAgainst += match.scoreB;
    teamB.goalsFor += match.scoreB;
    teamB.goalsAgainst += match.scoreA;

    if (match.scoreA > match.scoreB) {
      teamA.wins += 1;
      teamB.losses += 1;
      teamA.points += 3;
    } else if (match.scoreB > match.scoreA) {
      teamB.wins += 1;
      teamA.losses += 1;
      teamB.points += 3;
    } else {
      teamA.draws += 1;
      teamB.draws += 1;
      teamA.points += 1;
      teamB.points += 1;
    }

    teamA.goalDifference = teamA.goalsFor - teamA.goalsAgainst;
    teamB.goalDifference = teamB.goalsFor - teamB.goalsAgainst;
  });

  return rankStandings([...standings.values()]);
}

export function rankStandings(standings: LeagueStanding[]): LeagueStanding[] {
  return [...standings]
    .sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
      if (a.wins !== b.wins) return b.wins - a.wins;
      return a.seed - b.seed;
    })
    .map((standing, index) => ({
      ...standing,
      rank: index + 1
    }));
}
