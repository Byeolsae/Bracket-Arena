export type BattleRoyaleResult = { teamId: string; placement: number | null; kills: number };
export type BattleRoyaleLobby = {
  id: string;
  name: string;
  teamIds: string[];
  matches: { id: string; results: BattleRoyaleResult[] }[];
};
export type BattleRoyaleStage = {
  role: "qualifier" | "final";
  teamIds: string[];
  groups: { name: string; teamIds: string[] }[];
  lobbies: BattleRoyaleLobby[];
};
export type BattleRoyaleStanding = {
  teamId: string;
  rank: number;
  played: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
  wins: number;
};

const placementScores = [0, 10, 6, 5, 4, 3, 2, 1, 1];

export function getBattleRoyalePlacementPoints(placement: number | null) {
  return placement !== null && Number.isInteger(placement) ? placementScores[placement] ?? 0 : 0;
}

export function getBattleRoyaleKillPoints(kills: number) {
  return Number.isFinite(kills) ? Math.max(0, Math.floor(kills)) : 0;
}

export function getBattleRoyaleScore(result: BattleRoyaleResult) {
  const placementPoints = getBattleRoyalePlacementPoints(result.placement);
  const killPoints = getBattleRoyaleKillPoints(result.kills);
  return { placementPoints, killPoints, totalPoints: placementPoints + killPoints };
}

export function createBattleRoyaleStage(
  teamIds: string[],
  role: BattleRoyaleStage["role"],
  roundCount: number,
  assignments: Record<string, number> = {}
): BattleRoyaleStage {
  const expected = role === "qualifier" ? 24 : 16;
  if (teamIds.length !== expected || new Set(teamIds).size !== expected) {
    throw new Error(`배틀로얄 ${role === "qualifier" ? "예선" : "본선"}은 중복 없는 ${expected}팀이 필요합니다.`);
  }
  const groups = role === "qualifier"
    ? ["A", "B", "C"].map((name) => ({ name, teamIds: [] as string[] }))
    : [];
  if (groups.length) {
    if (Object.keys(assignments).length) {
      for (const teamId of teamIds) {
        const group = groups[assignments[teamId]];
        if (!group) throw new Error("모든 팀의 A/B/C 조 배정이 필요합니다.");
        group.teamIds.push(teamId);
      }
    } else {
      teamIds.forEach((teamId, index) => groups[Math.floor(index / 8)].teamIds.push(teamId));
    }
    if (groups.some((group) => group.teamIds.length !== 8)) throw new Error("A/B/C 각 조는 8팀이어야 합니다.");
  }
  const lobbyTeams = role === "qualifier"
    ? [[0, 1], [0, 2], [1, 2]].map(([a, b]) => ({
        name: groups[a].name + groups[b].name,
        teamIds: [...groups[a].teamIds, ...groups[b].teamIds]
      }))
    : [{ name: "본선", teamIds: [...teamIds] }];
  return {
    role,
    teamIds: [...teamIds],
    groups,
    lobbies: lobbyTeams.map((lobby) => ({
      ...lobby,
      id: lobby.name,
      matches: Array.from({ length: roundCount === 6 ? 6 : 5 }, (_, index) => ({
        id: `${lobby.name}-${index + 1}`,
        results: lobby.teamIds.map((teamId) => ({ teamId, placement: null, kills: 0 }))
      }))
    }))
  };
}

export function updateBattleRoyaleResult(
  stage: BattleRoyaleStage,
  lobbyId: string,
  matchId: string,
  teamId: string,
  patch: Partial<Pick<BattleRoyaleResult, "placement" | "kills">>
): BattleRoyaleStage {
  return {
    ...stage,
    lobbies: stage.lobbies.map((lobby) => lobby.id !== lobbyId ? lobby : {
      ...lobby,
      matches: lobby.matches.map((match) => {
        if (match.id !== matchId) return match;
        const placement = patch.placement;
        if (placement !== undefined && placement !== null && (
          !Number.isInteger(placement) || placement < 1 || placement > lobby.teamIds.length ||
          match.results.some((result) => result.teamId !== teamId && result.placement === placement)
        )) throw new Error("같은 경기에서 순위가 중복되거나 범위를 벗어날 수 없습니다.");
        return {
          ...match,
          results: match.results.map((result) => result.teamId !== teamId ? result : {
            ...result,
            placement: placement === undefined ? result.placement : placement,
            kills: patch.kills === undefined ? result.kills : getBattleRoyaleKillPoints(patch.kills)
          })
        };
      })
    })
  };
}

export function calculateBattleRoyaleStandings(stage: BattleRoyaleStage, lobbyId?: string): BattleRoyaleStanding[] {
  const lobbies = stage.lobbies.filter((lobby) => !lobbyId || lobby.id === lobbyId);
  const teamIds = lobbyId ? lobbies.flatMap((lobby) => lobby.teamIds) : stage.teamIds;
  const rows = new Map(teamIds.map((teamId) => [teamId, {
    teamId, rank: 0, played: 0, placementPoints: 0, killPoints: 0, totalPoints: 0, wins: 0
  }]));
  for (const lobby of lobbies) for (const match of lobby.matches) for (const result of match.results) {
    const row = rows.get(result.teamId);
    if (!row) continue;
    const score = getBattleRoyaleScore(result);
    row.played += result.placement !== null ? 1 : 0;
    row.placementPoints += score.placementPoints;
    row.killPoints += score.killPoints;
    row.totalPoints += score.totalPoints;
    row.wins += result.placement === 1 ? 1 : 0;
  }
  // Stable input order is the final tiebreaker when all recorded scores match.
  return [...rows.values()].sort((a, b) => b.totalPoints - a.totalPoints || b.killPoints - a.killPoints || b.wins - a.wins)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function isBattleRoyaleComplete(stage: BattleRoyaleStage) {
  return stage.lobbies.length > 0 && stage.lobbies.every((lobby) => lobby.matches.length > 0 &&
    lobby.matches.every((match) => match.results.length === lobby.teamIds.length &&
      match.results.every((result) => result.placement !== null) &&
      new Set(match.results.map((result) => result.placement)).size === lobby.teamIds.length));
}

export function randomizeBattleRoyaleResults(
  stage: BattleRoyaleStage,
  target: { lobbyId?: string; matchId?: string } = {},
  random: () => number = Math.random
): BattleRoyaleStage {
  return {
    ...stage,
    lobbies: stage.lobbies.map((lobby) => target.lobbyId && target.lobbyId !== lobby.id ? lobby : {
      ...lobby,
      matches: lobby.matches.map((match) => {
        if (target.matchId && target.matchId !== match.id) return match;
        const placements = lobby.teamIds.map((_, index) => index + 1);
        for (let index = placements.length - 1; index > 0; index -= 1) {
          const other = Math.floor(random() * (index + 1));
          [placements[index], placements[other]] = [placements[other], placements[index]];
        }
        return {
          ...match,
          results: lobby.teamIds.map((teamId, index) => ({
            teamId, placement: placements[index], kills: Math.floor(random() * 13)
          }))
        };
      })
    })
  };
}
