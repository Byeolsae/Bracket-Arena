export type BattleRoyaleResult = { teamId: string; placement: number | null; kills: number };
export type BattleRoyaleLobby = {
  id: string;
  name: string;
  teamIds: string[];
  matches: { id: string; results: BattleRoyaleResult[] }[];
};
export type BattleRoyaleStage = {
  ruleset?: "pubg" | "algs";
  matchPoint?: boolean;
  tieBreakOrder?: string[];
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
const algsPlacementScores = [0, 12, 9, 7, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1];

export function getBattleRoyalePlacementPoints(placement: number | null, ruleset: BattleRoyaleStage["ruleset"] = "pubg") {
  return placement !== null && Number.isInteger(placement)
    ? (ruleset === "algs" ? algsPlacementScores : placementScores)[placement] ?? 0 : 0;
}

export function getBattleRoyaleKillPoints(kills: number) {
  return Number.isFinite(kills) ? Math.max(0, Math.floor(kills)) : 0;
}

export function getBattleRoyaleScore(result: BattleRoyaleResult, ruleset: BattleRoyaleStage["ruleset"] = "pubg") {
  const placementPoints = getBattleRoyalePlacementPoints(result.placement, ruleset);
  const killPoints = getBattleRoyaleKillPoints(result.kills);
  return { placementPoints, killPoints, totalPoints: placementPoints + killPoints };
}

export function createAlgsStage(teamIds: string[], matchPoint = true): BattleRoyaleStage {
  if (teamIds.length !== 20 || new Set(teamIds).size !== 20) throw new Error("ALGS는 중복 없는 20팀이 필요합니다.");
  const tieBreakOrder = [...teamIds];
  // Persist the final random tiebreak draw so re-renders and reloads cannot reshuffle standings.
  for (let index = tieBreakOrder.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [tieBreakOrder[index], tieBreakOrder[other]] = [tieBreakOrder[other], tieBreakOrder[index]];
  }
  return {
    ruleset: "algs", matchPoint, tieBreakOrder, role: "final", teamIds: [...teamIds], groups: [],
    lobbies: [{ id: "algs", name: "ALGS", teamIds: [...teamIds],
      matches: Array.from({ length: 6 }, (_, index) => ({ id: `algs-${index + 1}`,
        results: teamIds.map((teamId) => ({ teamId, placement: null, kills: 0 })) })) }]
  };
}

function isMatchComplete(match: BattleRoyaleLobby["matches"][number], teamIds: string[]) {
  return match.results.length === teamIds.length &&
    new Set(match.results.map((result) => result.teamId)).size === teamIds.length &&
    match.results.every((result) => teamIds.includes(result.teamId) && result.placement !== null &&
      Number.isInteger(result.placement) && result.placement >= 1 && result.placement <= teamIds.length) &&
    new Set(match.results.map((result) => result.placement)).size === teamIds.length;
}

export function getAlgsMatchPointStatus(stage: BattleRoyaleStage) {
  const totals = new Map(stage.teamIds.map((id) => [id, 0]));
  let championId: string | undefined;
  let winningMatchIndex: number | undefined;
  const eligibleTeamIds = new Set<string>();
  if (stage.ruleset !== "algs" || !stage.matchPoint) return { championId, winningMatchIndex, eligibleTeamIds };
  const lobby = stage.lobbies[0];
  // Only consecutive complete matches can confirm eligibility or a champion.
  for (const [index, match] of lobby.matches.entries()) {
    if (!isMatchComplete(match, lobby.teamIds)) break;
    const winner = match.results.find((result) => result.placement === 1)!;
    if (eligibleTeamIds.has(winner.teamId)) {
      championId = winner.teamId;
      winningMatchIndex = index;
    }
    for (const result of match.results) {
      const total = (totals.get(result.teamId) ?? 0) + getBattleRoyaleScore(result, "algs").totalPoints;
      totals.set(result.teamId, total);
      if (total >= 50) eligibleTeamIds.add(result.teamId);
    }
    if (championId) break;
  }
  return { championId, winningMatchIndex, eligibleTeamIds };
}

export function appendAlgsMatch(stage: BattleRoyaleStage): BattleRoyaleStage {
  if (stage.ruleset !== "algs" || !stage.matchPoint || getAlgsMatchPointStatus(stage).championId ||
    !stage.lobbies.every((lobby) => lobby.matches.every((match) => isMatchComplete(match, lobby.teamIds)))) return stage;
  return { ...stage, lobbies: stage.lobbies.map((lobby) => ({ ...lobby, matches: [...lobby.matches, {
    id: `${lobby.id}-${lobby.matches.length + 1}`,
    results: lobby.teamIds.map((teamId) => ({ teamId, placement: null, kills: 0 }))
  }] })) };
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
  const status = getAlgsMatchPointStatus(stage);
  const lobbies = stage.lobbies.filter((lobby) => !lobbyId || lobby.id === lobbyId);
  const teamIds = lobbyId ? lobbies.flatMap((lobby) => lobby.teamIds) : stage.teamIds;
  const rows = new Map(teamIds.map((teamId) => [teamId, {
    teamId, rank: 0, played: 0, placementPoints: 0, killPoints: 0, totalPoints: 0, wins: 0
  }]));
  const history = new Map(teamIds.map((id) => [id, [] as BattleRoyaleResult[]]));
  for (const lobby of lobbies) for (const match of lobby.matches.slice(0, status.winningMatchIndex === undefined ? undefined : status.winningMatchIndex + 1)) for (const result of match.results) {
    const row = rows.get(result.teamId);
    if (!row) continue;
    const score = getBattleRoyaleScore(result, stage.ruleset);
    history.get(result.teamId)?.push(result);
    row.played += result.placement !== null ? 1 : 0;
    row.placementPoints += score.placementPoints;
    row.killPoints += score.killPoints;
    row.totalPoints += score.totalPoints;
    row.wins += result.placement === 1 ? 1 : 0;
  }
  // Stable input order is the final tiebreaker when all recorded scores match.
  const compareAlgs = (a: string, b: string) => {
    const left = history.get(a)!;
    const right = history.get(b)!;
    const criteria = [
      (result: BattleRoyaleResult) => getBattleRoyaleScore(result, "algs").totalPoints,
      (result: BattleRoyaleResult) => -(result.placement ?? 21),
      (result: BattleRoyaleResult) => getBattleRoyaleKillPoints(result.kills)
    ];
    for (const value of criteria) {
      const x = left.map(value).sort((a, b) => b - a);
      const y = right.map(value).sort((a, b) => b - a);
      for (let index = 0; index < x.length; index++) if (x[index] !== y[index]) return y[index] - x[index];
    }
    const order = stage.tieBreakOrder ?? stage.teamIds;
    return order.indexOf(a) - order.indexOf(b);
  };
  return [...rows.values()].sort((a, b) =>
    Number(b.teamId === status.championId) - Number(a.teamId === status.championId) ||
    b.totalPoints - a.totalPoints || (stage.ruleset === "algs" ? compareAlgs(a.teamId, b.teamId) : b.killPoints - a.killPoints || b.wins - a.wins))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function isBattleRoyaleComplete(stage: BattleRoyaleStage) {
  if (stage.ruleset === "algs" && stage.matchPoint) return Boolean(getAlgsMatchPointStatus(stage).championId);
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
