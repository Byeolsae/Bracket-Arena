import test from "node:test";
import assert from "node:assert/strict";
import type { Team, TripleEliminationStage } from "../src/lib/core/models";
import { createSingleEliminationTournament, updateMatchResult } from "../src/lib/core/singleElimination";
import { createDoubleEliminationBracket, updateDoubleEliminationResult } from "../src/lib/core/doubleElimination";
import { applyTripleEliminationResult, generateTripleEliminationBracket } from "../src/lib/core/tripleElimination";
import { generateLeagueSchedule } from "../src/lib/core/league";
import { calculateLeagueStandings } from "../src/lib/core/ranking";
import { getAdvancingTeams } from "../src/lib/core/advancement";
import { createSwissStage } from "../src/lib/core/swiss";
import { getTeamInitial } from "../src/lib/core/team";
import { buildSeedOrder } from "../src/lib/core/bye";
import {
  applyBattleRoyaleResult,
  calculateBattleRoyaleStandings,
  generateBattleRoyaleRounds
} from "../src/lib/core/battleRoyale";
import {
  getDoubleLosersMatchCountByRound,
  getDoubleLosersRoundCount,
  getEliminationBracketSize,
  getTripleLossGroupMatchCountByRound,
  getTripleLossGroupRoundCount,
  getUpperBracketRoundCount,
  getUpperFirstRoundMatchCount
} from "../src/lib/core/eliminationSizing";

function teams(count: number): Team[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Team ${index + 1}`,
    shortName: `T${index + 1}`,
    defaultSeed: index + 1,
    defaultRating: 1500 + index * 10
  }));
}

const singleEliminationTeamCounts = [2, 4, 8, 16, 32];
const doubleEliminationTeamCounts = [2, 4, 8, 16];
const tripleEliminationTeamCounts = [4, 8];

function chooseFirstParticipantWinner(match: { participantA?: { teamId?: string }; participantB?: { teamId?: string } }) {
  return match.participantA?.teamId ?? match.participantB?.teamId ?? "";
}

function isTriplePlacementComplete(stage: TripleEliminationStage) {
  return Boolean(stage.championId && stage.runnerUpId && stage.thirdPlaceId);
}

function playNextTripleReadyMatch(stage: TripleEliminationStage) {
  const readyMatch = stage.matches.find((match) => match.status === "ready");
  assert.ok(readyMatch, "triple elimination should have a ready match");
  const winnerId = chooseFirstParticipantWinner(readyMatch);
  assert.ok(winnerId);
  return applyTripleEliminationResult(stage, readyMatch.id, 2, 0, winnerId);
}

function completeReadyMatches(stage: TripleEliminationStage, group: string, round: number) {
  let nextStage = stage;

  for (let step = 0; step < 100; step += 1) {
    const readyMatch = nextStage.matches.find(
      (match) => match.bracketGroup === group && match.round === round && match.status === "ready"
    );
    if (!readyMatch) return nextStage;

    const winnerId = chooseFirstParticipantWinner(readyMatch);
    assert.ok(winnerId);
    nextStage = applyTripleEliminationResult(nextStage, readyMatch.id, 2, 0, winnerId);
  }

  assert.fail(`too many ready matches in ${group} round ${round}`);
}

function countMatches(stage: TripleEliminationStage, group: string, round: number) {
  return stage.matches.filter((match) => match.bracketGroup === group && match.round === round).length;
}

function matchHasTeam(
  match: { participantA?: { teamId?: string }; participantB?: { teamId?: string } },
  teamId: string
) {
  return match.participantA?.teamId === teamId || match.participantB?.teamId === teamId;
}

function didTeamsAlreadyPlay(stage: TripleEliminationStage, teamAId?: string, teamBId?: string, ignoreMatchId?: string) {
  if (!teamAId || !teamBId) return false;
  return stage.matches.some((match) => {
    if (match.id === ignoreMatchId || match.status !== "complete") return false;
    const leftId = match.participantA?.teamId;
    const rightId = match.participantB?.teamId;
    return (leftId === teamAId && rightId === teamBId) || (leftId === teamBId && rightId === teamAId);
  });
}

function assertEliminationIntegrity(
  matches: Array<{
    id: string;
    status: string;
    isBye?: boolean;
    winnerId?: string;
    participantA?: { teamId?: string };
    participantB?: { teamId?: string };
  }>,
  label: string
) {
  const readyTeamIds: string[] = [];

  matches.forEach((match) => {
    const teamAId = match.participantA?.teamId;
    const teamBId = match.participantB?.teamId;

    if (match.status === "ready") {
      assert.ok(teamAId, `${label}: ready match ${match.id} has TBD in slot A`);
      assert.ok(teamBId, `${label}: ready match ${match.id} has TBD in slot B`);
      assert.notEqual(teamAId, teamBId, `${label}: ready match ${match.id} has the same team twice`);
      readyTeamIds.push(teamAId, teamBId);
    }

    if (match.status === "complete") {
      assert.ok(match.winnerId, `${label}: complete match ${match.id} has no winner`);
      assert.ok(
        [teamAId, teamBId].includes(match.winnerId),
        `${label}: complete match ${match.id} winner is not one of its teams`
      );
    }
  });

  const duplicatedReadyTeamId = readyTeamIds.find(
    (teamId, index) => readyTeamIds.indexOf(teamId) !== index
  );
  assert.equal(duplicatedReadyTeamId, undefined, `${label}: team ${duplicatedReadyTeamId} appears in multiple ready matches`);
}

test("6-team single elimination creates an 8-slot bracket with 2 byes", () => {
  const tournament = createSingleEliminationTournament(teams(6));
  assert.equal(tournament.bracketSize, 8);
  assert.equal(tournament.matches.filter((match) => match.isBye).length, 2);
});

test("10-team single elimination creates a 16-slot bracket with 6 byes", () => {
  const tournament = createSingleEliminationTournament(teams(10));
  assert.equal(tournament.bracketSize, 16);
  assert.equal(tournament.matches.filter((match) => match.isBye).length, 6);
});

test("seed order spreads byes across bracket branches", () => {
  assert.deepEqual(buildSeedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  assert.deepEqual(buildSeedOrder(16), [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]);
});

test("single elimination result advances the winner and marks champion", () => {
  let tournament = createSingleEliminationTournament(teams(2));
  const final = tournament.matches[0];
  tournament = updateMatchResult(tournament, {
    matchId: final.id,
    scoreA: 1,
    scoreB: 0,
    winnerId: final.participantA?.teamId ?? ""
  });
  assert.equal(tournament.championId, final.participantA?.teamId);
});

test("single elimination completes for power-of-two team counts", () => {
  singleEliminationTeamCounts.forEach((teamCount) => {
    let tournament = createSingleEliminationTournament(teams(teamCount));
    assertEliminationIntegrity(tournament.matches, `single ${teamCount} teams`);

    for (let step = 0; step < teamCount * 2 && !tournament.championId; step += 1) {
      const readyMatch = tournament.matches.find(
        (match) => match.id !== "third-place" && match.status === "ready"
      );
      assert.ok(readyMatch, `single elimination should not stall with ${teamCount} teams`);
      const winnerId = chooseFirstParticipantWinner(readyMatch);
      assert.ok(winnerId);
      tournament = updateMatchResult(tournament, {
        matchId: readyMatch.id,
        scoreA: 2,
        scoreB: 0,
        winnerId
      });
      assertEliminationIntegrity(tournament.matches, `single ${teamCount} teams step ${step + 1}`);
    }

    assert.ok(tournament.championId, `single elimination should produce a champion with ${teamCount} teams`);
    assert.equal(tournament.bracketSize, teamCount);
  });
});

test("single elimination rejects teams over 32", () => {
  assert.throws(() => createSingleEliminationTournament(teams(33)), /up to 32 teams/);
});

test("double elimination sends winners bracket losers into lower bracket", () => {
  const roster = teams(8);
  let bracket = createDoubleEliminationBracket(roster);
  const wbRoundOne = bracket.matches
    .filter((match) => match.bracketGroup === "winners" && match.round === 1)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  bracket = updateDoubleEliminationResult(
    bracket,
    wbRoundOne[0].id,
    2,
    0,
    wbRoundOne[0].participantA?.teamId ?? ""
  );
  bracket = updateDoubleEliminationResult(
    bracket,
    wbRoundOne[1].id,
    2,
    0,
    wbRoundOne[1].participantA?.teamId ?? ""
  );

  const lowerRoundOne = bracket.matches.find(
    (match) => match.bracketGroup === "losers" && match.round === 1 && match.matchNumber === 1
  );

  assert.equal(lowerRoundOne?.participantA?.teamId, wbRoundOne[0].participantB?.teamId);
  assert.equal(lowerRoundOne?.participantB?.teamId, wbRoundOne[1].participantB?.teamId);
  assert.equal(lowerRoundOne?.status, "ready");
  assert.equal(bracket.lossCounts?.[wbRoundOne[0].participantB?.teamId ?? ""], 1);
  assert.ok(!bracket.eliminatedTeamIds?.includes(wbRoundOne[0].participantB?.teamId ?? ""));
});

test("double elimination applies byes for non-power-of-two teams", () => {
  const bracket = createDoubleEliminationBracket(teams(6));
  assert.equal(bracket.matches.filter((match) => match.isBye).length, 2);
  assert.equal(bracket.matches.filter((match) => match.status === "bye").length, 2);
});

test("12-team double elimination does not start upper bye teams in a late bracket column", () => {
  let bracket = createDoubleEliminationBracket(teams(12));
  assert.equal(bracket.matches.filter((match) => match.bracketGroup === "winners" && match.round > 1).length, 0);

  const wbRoundOne = bracket.matches
    .filter((match) => match.bracketGroup === "winners" && match.round === 1 && match.status === "ready")
    .sort((a, b) => a.matchNumber - b.matchNumber);
  assert.equal(wbRoundOne.length, 4);

  wbRoundOne.forEach((match) => {
    bracket = updateDoubleEliminationResult(bracket, match.id, 2, 0, match.participantA?.teamId ?? "");
  });

  assert.equal(
    bracket.matches.filter((match) => match.bracketGroup === "winners" && match.round === 2).length,
    4
  );
  assert.equal(
    bracket.matches.filter((match) => match.bracketGroup === "losers" && match.round === 1).length,
    2
  );
});

test("10-team double elimination promotes lower bracket bye losers without stalling", () => {
  let bracket = createDoubleEliminationBracket(teams(10));

  for (let step = 0; step < 120 && !bracket.championId; step += 1) {
    const readyMatch = bracket.matches
      .filter((match) => match.status === "ready")
      .sort((a, b) => {
        const groupOrder = groupSortOrder(a.bracketGroup) - groupSortOrder(b.bracketGroup);
        return groupOrder || a.round - b.round || a.matchNumber - b.matchNumber;
      })[0];

    assert.ok(readyMatch, "10-team double elimination should not stall on lower bracket byes");
    const winnerId = readyMatch.participantA?.teamId ?? readyMatch.participantB?.teamId;
    assert.ok(winnerId);
    bracket = updateDoubleEliminationResult(bracket, readyMatch.id, 2, 0, winnerId);
  }

  assert.ok(bracket.championId);
  assert.ok(bracket.matches.some((match) => match.bracketGroup === "losers" && match.round >= 4));
});

test("10-team double elimination keeps every winners-bracket loser alive in the lower bracket", () => {
  let bracket = createDoubleEliminationBracket(teams(10));
  const upperLosers = new Set<string>();

  while (true) {
    const readyUpperMatch = bracket.matches
      .filter((match) => match.bracketGroup === "winners" && match.status === "ready")
      .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)[0];

    if (!readyUpperMatch) break;

    const winnerId = readyUpperMatch.participantA?.teamId ?? "";
    const loserId = readyUpperMatch.participantB?.teamId;
    if (loserId) upperLosers.add(loserId);
    bracket = updateDoubleEliminationResult(bracket, readyUpperMatch.id, 2, 0, winnerId);
  }

  const lowerTeamIds = new Set([
    ...bracket.matches
      .filter((match) => match.bracketGroup === "losers")
      .flatMap((match) => [match.participantA?.teamId, match.participantB?.teamId, match.winnerId].filter(Boolean)),
    ...Object.entries(bracket.pendingTeamIds ?? {})
      .filter(([key]) => key.startsWith("L:"))
      .flatMap(([, teamIds]) => teamIds)
  ]);

  upperLosers.forEach((teamId) => {
    assert.ok(lowerTeamIds.has(teamId), `${teamId} should be alive in the lower bracket path`);
    assert.equal(bracket.lossCounts?.[teamId], 1);
    assert.ok(!bracket.eliminatedTeamIds?.includes(teamId));
  });
});

test("double elimination keeps generated 16-team rounds in the same columns", () => {
  let bracket = createDoubleEliminationBracket(teams(16));
  const wbRoundOne = bracket.matches
    .filter((match) => match.bracketGroup === "winners" && match.round === 1)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  wbRoundOne.forEach((match) => {
    bracket = updateDoubleEliminationResult(bracket, match.id, 2, 0, match.participantA?.teamId ?? "");
  });

  assert.equal(
    bracket.matches.filter((match) => match.bracketGroup === "winners" && match.round === 2).length,
    4
  );
  assert.equal(
    bracket.matches.filter((match) => match.bracketGroup === "losers" && match.round === 1).length,
    4
  );
});

function groupSortOrder(group: string | undefined) {
  if (group === "winners") return 0;
  if (group === "losers") return 1;
  if (group === "grand-final") return 2;
  return 3;
}

test("double elimination alternates lower survival matches with upper drops", () => {
  let bracket = createDoubleEliminationBracket(teams(8));
  const wbRoundOne = bracket.matches
    .filter((match) => match.bracketGroup === "winners" && match.round === 1)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  wbRoundOne.forEach((match) => {
    bracket = updateDoubleEliminationResult(bracket, match.id, 2, 0, match.participantA?.teamId ?? "");
  });

  const firstLowerRoundOne = bracket.matches.find(
    (match) => match.bracketGroup === "losers" && match.round === 1 && match.matchNumber === 1
  );
  assert.ok(firstLowerRoundOne);
  const lowerSurvivorId = firstLowerRoundOne.participantA?.teamId ?? "";
  bracket = updateDoubleEliminationResult(bracket, firstLowerRoundOne.id, 2, 0, lowerSurvivorId);

  const secondUpperRoundTwo = bracket.matches.find(
    (match) => match.bracketGroup === "winners" && match.round === 2 && match.matchNumber === 2
  );
  assert.ok(secondUpperRoundTwo);
  const upperDropId = secondUpperRoundTwo.participantB?.teamId ?? "";
  bracket = updateDoubleEliminationResult(
    bracket,
    secondUpperRoundTwo.id,
    2,
    0,
    secondUpperRoundTwo.participantA?.teamId ?? ""
  );

  const lowerRoundTwo = bracket.matches.find(
    (match) => match.bracketGroup === "losers" && match.round === 2 && match.matchNumber === 1
  );
  assert.equal(lowerRoundTwo?.participantA?.teamId, lowerSurvivorId);
  assert.equal(lowerRoundTwo?.participantB?.teamId, upperDropId);
  assert.equal(lowerRoundTwo?.status, "ready");
});

test("double elimination drops upper semifinal losers into opposite lower branches", () => {
  let bracket = createDoubleEliminationBracket(teams(8));
  const wbRoundOne = bracket.matches
    .filter((match) => match.bracketGroup === "winners" && match.round === 1)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  wbRoundOne.forEach((match) => {
    bracket = updateDoubleEliminationResult(bracket, match.id, 2, 0, match.participantA?.teamId ?? "");
  });

  const lbRoundOne = bracket.matches
    .filter((match) => match.bracketGroup === "losers" && match.round === 1)
    .sort((a, b) => a.matchNumber - b.matchNumber);
  lbRoundOne.forEach((match) => {
    bracket = updateDoubleEliminationResult(bracket, match.id, 2, 0, match.participantA?.teamId ?? "");
  });

  const wbRoundTwo = bracket.matches
    .filter((match) => match.bracketGroup === "winners" && match.round === 2)
    .sort((a, b) => a.matchNumber - b.matchNumber);
  const topDropId = wbRoundTwo[0].participantB?.teamId ?? "";
  const bottomDropId = wbRoundTwo[1].participantB?.teamId ?? "";

  bracket = updateDoubleEliminationResult(bracket, wbRoundTwo[0].id, 2, 0, wbRoundTwo[0].participantA?.teamId ?? "");
  bracket = updateDoubleEliminationResult(bracket, wbRoundTwo[1].id, 2, 0, wbRoundTwo[1].participantA?.teamId ?? "");

  const activeLowerIds = new Set(
    [
      ...bracket.matches
        .filter((match) => match.bracketGroup === "losers" && match.status !== "complete")
        .flatMap((match) => [match.participantA?.teamId, match.participantB?.teamId]),
      ...Object.entries(bracket.pendingTeamIds ?? {})
        .filter(([key]) => key.startsWith("L:"))
        .flatMap(([, teamIds]) => teamIds)
    ].filter(Boolean) as string[]
  );

  assert.ok(activeLowerIds.has(bottomDropId));
  assert.ok(activeLowerIds.has(topDropId));
  assert.equal(bracket.lossCounts?.[bottomDropId], 1);
  assert.equal(bracket.lossCounts?.[topDropId], 1);
  assert.ok(!bracket.eliminatedTeamIds?.includes(bottomDropId));
  assert.ok(!bracket.eliminatedTeamIds?.includes(topDropId));
});

test("double elimination keeps upper final loser alive in lower final", () => {
  let bracket = createDoubleEliminationBracket(teams(8));

  for (let step = 0; step < 20; step += 1) {
    const readyWinners = bracket.matches
      .filter((match) => match.bracketGroup === "winners" && match.status === "ready")
      .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber);
    if (!readyWinners.length) break;
    const match = readyWinners[0];
    bracket = updateDoubleEliminationResult(bracket, match.id, 2, 0, match.participantA?.teamId ?? "");
  }

  const upperFinal = bracket.matches.find(
    (match) => match.bracketGroup === "winners" && match.round === 3 && match.status === "complete"
  );
  assert.ok(upperFinal?.loserId);
  assert.equal(bracket.lossCounts?.[upperFinal.loserId], 1);

  const lowerFinalOrPending = [
    ...bracket.matches.filter((match) => match.bracketGroup === "losers" && match.round === 4),
    ...Object.entries(bracket.pendingTeamIds ?? {})
      .filter(([key, teamIds]) => key.startsWith("L:4:") && teamIds.includes(upperFinal.loserId ?? ""))
      .map(([key, teamIds]) => ({
        id: key,
        participantA: { teamId: teamIds[0] },
        participantB: { teamId: teamIds[1] }
      }))
  ];

  assert.ok(
    lowerFinalOrPending.some(
      (match) => match.participantA?.teamId === upperFinal.loserId || match.participantB?.teamId === upperFinal.loserId
    ),
    "upper final loser should be placed in lower final path instead of being eliminated"
  );
});

test("double elimination moves edited upper-round losers into lower bracket", () => {
  let bracket = createDoubleEliminationBracket(teams(8));
  const wbRoundOne = bracket.matches
    .filter((match) => match.bracketGroup === "winners" && match.round === 1)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  wbRoundOne.forEach((match) => {
    bracket = updateDoubleEliminationResult(bracket, match.id, 2, 0, match.participantA?.teamId ?? "");
  });

  const wbRoundTwo = bracket.matches
    .filter((match) => match.bracketGroup === "winners" && match.round === 2)
    .sort((a, b) => a.matchNumber - b.matchNumber);
  const originalDropId = wbRoundTwo[0].participantB?.teamId ?? "";
  const editedDropId = wbRoundTwo[0].participantA?.teamId ?? "";

  bracket = updateDoubleEliminationResult(bracket, wbRoundTwo[0].id, 2, 0, originalDropId);
  bracket = updateDoubleEliminationResult(bracket, wbRoundTwo[0].id, 3, 4, editedDropId);

  const lowerRoundTwo = bracket.matches.filter((match) => match.bracketGroup === "losers" && match.round === 2);
  const lowerRoundTwoPending = Object.entries(bracket.pendingTeamIds ?? {})
    .filter(([key]) => key.startsWith("L:2:"))
    .flatMap(([, teamIds]) => teamIds);
  assert.ok(
    lowerRoundTwo.some((match) => match.participantA?.teamId === originalDropId || match.participantB?.teamId === originalDropId) ||
      lowerRoundTwoPending.includes(originalDropId),
    "the edited loser should move down to lower bracket"
  );
});

test("elimination sizing scales automatically for larger brackets", () => {
  assert.equal(getEliminationBracketSize(17), 32);
  assert.equal(getUpperFirstRoundMatchCount(32), 16);
  assert.equal(getUpperBracketRoundCount(32), 5);
  assert.equal(getDoubleLosersRoundCount(16), 6);
  assert.deepEqual(getDoubleLosersMatchCountByRound(8), { 1: 2, 2: 2, 3: 1, 4: 1 });
  assert.deepEqual(getDoubleLosersMatchCountByRound(16), { 1: 4, 2: 4, 3: 2, 4: 2, 5: 1, 6: 1 });
  assert.equal(getTripleLossGroupRoundCount(8, 2), 4);
  assert.deepEqual(getTripleLossGroupMatchCountByRound(8, 1), { 1: 2, 2: 2, 3: 1, 4: 1 });
  assert.deepEqual(getTripleLossGroupMatchCountByRound(8, 2), { 1: 2, 2: 1, 3: 1, 4: 1 });
});

test("16-team double elimination keeps generating lower bracket paths", () => {
  let bracket = createDoubleEliminationBracket(teams(16));

  for (let step = 0; step < 240 && !bracket.championId; step += 1) {
    const readyMatch = bracket.matches.find((match) => match.status === "ready");
    assert.ok(readyMatch, "double elimination should not stall with many teams");
    const winnerId = readyMatch.participantA?.teamId ?? readyMatch.participantB?.teamId;
    assert.ok(winnerId);
    bracket = updateDoubleEliminationResult(bracket, readyMatch.id, 2, 0, winnerId);
  }

  assert.ok(bracket.championId);
  assert.ok((bracket.eliminatedTeamIds?.length ?? 0) >= 14);
  assert.ok(bracket.matches.some((match) => match.bracketGroup === "losers" && match.round >= 6));
});

test("double elimination completes for power-of-two team counts", () => {
  doubleEliminationTeamCounts.forEach((teamCount) => {
    let bracket = createDoubleEliminationBracket(teams(teamCount));
    assertEliminationIntegrity(bracket.matches, `double ${teamCount} teams`);

    for (let step = 0; step < teamCount * 6 && !bracket.championId; step += 1) {
      const readyMatch = bracket.matches.find((match) => match.status === "ready");
      assert.ok(readyMatch, `double elimination should not stall with ${teamCount} teams`);
      const winnerId = chooseFirstParticipantWinner(readyMatch);
      assert.ok(winnerId);
      bracket = updateDoubleEliminationResult(bracket, readyMatch.id, 2, 0, winnerId);
      assertEliminationIntegrity(bracket.matches, `double ${teamCount} teams step ${step + 1}`);
    }

    assert.ok(bracket.championId, `double elimination should produce a champion with ${teamCount} teams`);
    assert.ok(
      (bracket.eliminatedTeamIds?.length ?? 0) >= teamCount - 2,
      `double elimination should eliminate nearly every non-champion with ${teamCount} teams`
    );
  });
});

test("double elimination rejects teams over 16", () => {
  assert.throws(() => createDoubleEliminationBracket(teams(17)), /up to 16 teams/);
});

test("league top N advances and 6-team playoff adjusts to 8-slot bracket", () => {
  const roster = teams(8);
  let schedule = generateLeagueSchedule(roster);
  schedule = schedule.map((match) => ({
    ...match,
    scoreA: 1,
    scoreB: 0,
    winnerId: match.teamAId,
    loserId: match.teamBId,
    status: "complete"
  }));
  const standings = calculateLeagueStandings(schedule, roster);
  const advancing = getAdvancingTeams(standings, roster, 6);
  const playoff = createSingleEliminationTournament(advancing);
  assert.equal(advancing.length, 6);
  assert.equal(playoff.bracketSize, 8);
});

test("odd-team swiss creates one bye", () => {
  const stage = createSwissStage(teams(5));
  assert.equal(stage.matches.filter((match) => match.isBye).length, 1);
});

test("team placeholder initial is created without a logo", () => {
  assert.equal(getTeamInitial({ id: "x", name: "T1 Esports", shortName: "T1" }), "T");
});

test("triple elimination handles odd teams and eventually creates placement winners", () => {
  let stage = generateTripleEliminationBracket(teams(5));
  assert.ok(
    stage.matches.some(
      (match) => match.bracketGroup === "zero-loss" && match.round === 2 && match.status === "pending"
    )
  );

  for (let step = 0; step < 80 && !isTriplePlacementComplete(stage); step += 1) {
    const readyMatch = stage.matches.find((match) => match.status === "ready");
    assert.ok(readyMatch, "triple elimination should not stall before placements are found");
    const winnerId = readyMatch.participantA?.teamId ?? readyMatch.participantB?.teamId;
    assert.ok(winnerId);
    stage = applyTripleEliminationResult(stage, readyMatch.id, 2, 0, winnerId);
  }

  assert.ok(stage.championId);
  assert.ok(stage.runnerUpId);
  assert.ok(stage.thirdPlaceId);
  assert.equal(stage.eliminatedTeamIds.length, 2);
});

test("triple elimination does not eliminate a team until its third loss", () => {
  let stage = generateTripleEliminationBracket(teams(4));
  const firstMatch = stage.matches.find((match) => match.bracketGroup === "zero-loss" && match.status === "ready");
  assert.ok(firstMatch);
  const loserId = firstMatch.participantB?.teamId ?? "";

  stage = applyTripleEliminationResult(stage, firstMatch.id, 2, 0, firstMatch.participantA?.teamId ?? "");

  assert.equal(stage.lossCounts[loserId], 1);
  assert.ok(!stage.eliminatedTeamIds.includes(loserId));
  assert.ok(stage.pendingTeamIds?.["1"].includes(loserId));
});

test("triple elimination applies byes for non-power-of-two teams", () => {
  const stage = generateTripleEliminationBracket(teams(6));
  assert.equal(stage.matches.filter((match) => match.isBye).length, 2);
  assert.equal(stage.matches.filter((match) => match.status === "bye").length, 2);
});

test("6-team triple elimination keeps bye teams waiting for first-round winners", () => {
  const stage = generateTripleEliminationBracket(teams(6));
  assert.equal(
    stage.matches.filter((match) => match.bracketGroup === "zero-loss" && match.round === 2 && match.status === "pending").length,
    2
  );
  assert.equal(
    stage.matches.filter((match) => match.bracketGroup === "zero-loss" && match.round === 2 && match.status === "ready").length,
    0
  );
});

test("triple elimination keeps generated 8-team rounds in the same columns", () => {
  let stage = generateTripleEliminationBracket(teams(8));
  const zeroLossRoundOne = stage.matches
    .filter((match) => match.bracketGroup === "zero-loss" && match.round === 1)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  zeroLossRoundOne.forEach((match) => {
    stage = applyTripleEliminationResult(stage, match.id, 2, 0, match.participantA?.teamId ?? "");
  });

  assert.equal(
    stage.matches.filter((match) => match.bracketGroup === "zero-loss" && match.round === 2).length,
    2
  );
  assert.equal(
    stage.matches.filter((match) => match.bracketGroup === "one-loss" && match.round === 1).length,
    2
  );
});

test("triple elimination labels each placement bracket final", () => {
  let stage = generateTripleEliminationBracket(teams(8));

  for (let step = 0; step < 160 && !isTriplePlacementComplete(stage); step += 1) {
    const readyMatch = stage.matches.find((match) => match.status === "ready");
    assert.ok(readyMatch, "triple elimination should keep producing ready matches");

    const winnerId = readyMatch.participantA?.teamId ?? readyMatch.participantB?.teamId;
    assert.ok(winnerId);
    stage = applyTripleEliminationResult(stage, readyMatch.id, 2, 0, winnerId);
  }

  assert.ok(stage.championId);
  assert.ok(stage.runnerUpId);
  assert.ok(stage.thirdPlaceId);
  assert.ok(stage.matches.some((match) => match.roundName === "0-Loss Round 3" || match.roundName === "Upper Final"));
  assert.ok(stage.matches.some((match) => match.bracketGroup === "one-loss"));
  assert.ok(stage.matches.some((match) => match.bracketGroup === "two-loss"));
});

test("triple elimination does not expose internal crossover labels", () => {
  let stage = generateTripleEliminationBracket(teams(8));

  for (let step = 0; step < 160 && !isTriplePlacementComplete(stage); step += 1) {
    assert.ok(
      stage.matches.every((match) => !/Loss Crossover/i.test(match.roundName)),
      "triple elimination should use bracket-facing round labels"
    );

    const readyMatch = stage.matches.find((match) => match.status === "ready");
    assert.ok(readyMatch, "triple elimination should keep producing ready matches");
    const winnerId = readyMatch.participantA?.teamId ?? readyMatch.participantB?.teamId;
    assert.ok(winnerId);
    stage = applyTripleEliminationResult(stage, readyMatch.id, 2, 0, winnerId);
  }

  assert.ok(stage.championId);
  assert.ok(stage.runnerUpId);
  assert.ok(stage.thirdPlaceId);
});

test("triple elimination does not create cross-bracket grand finals", () => {
  let stage = generateTripleEliminationBracket(teams(8));

  for (let step = 0; step < 160 && !isTriplePlacementComplete(stage); step += 1) {
    const readyMatch = stage.matches.find((match) => match.status === "ready");
    assert.ok(readyMatch, "triple elimination should keep producing ready matches");
    const winnerId = readyMatch.participantA?.teamId ?? readyMatch.participantB?.teamId;
    assert.ok(winnerId);
    stage = applyTripleEliminationResult(stage, readyMatch.id, 2, 0, winnerId);
  }

  assert.equal(stage.matches.some((match) => match.bracketGroup === "grand-final"), false);
  assert.ok(stage.championId);
  assert.ok(stage.runnerUpId);
  assert.ok(stage.thirdPlaceId);
});

test("triple elimination standard mode sends middle final loser directly to lower final", () => {
  let stage = generateTripleEliminationBracket(teams(8));

  for (let step = 0; step < 120 && !stage.twoLossFinalistId; step += 1) {
    stage = playNextTripleReadyMatch(stage);
  }

  const reservedTeamId = stage.twoLossFinalistId;
  assert.ok(reservedTeamId, "standard mode should reserve the middle final loser");
  assert.equal(
    stage.matches.some(
      (match) =>
        match.bracketGroup === "two-loss" &&
        (match.status === "ready" || match.status === "pending") &&
        matchHasTeam(match, reservedTeamId)
    ),
    false,
    "reserved team should not be placed into an early lower bracket match"
  );

  for (let step = 0; step < 80; step += 1) {
    const lowerFinal = stage.matches.find(
      (match) => match.roundName === "Lower Final" && matchHasTeam(match, reservedTeamId)
    );
    if (lowerFinal) {
      assert.ok(lowerFinal.participantA?.teamId && lowerFinal.participantB?.teamId);
      return;
    }

    stage = playNextTripleReadyMatch(stage);
  }

  assert.fail("standard mode should create a lower final with the reserved middle final loser");
});

test("triple elimination standard mode follows the 8-team upper middle lower flow", () => {
  let stage = generateTripleEliminationBracket(teams(8));

  stage = completeReadyMatches(stage, "zero-loss", 1);
  assert.equal(countMatches(stage, "one-loss", 1), 2, "upper quarterfinal losers should create two middle quarterfinals");
  assert.equal(countMatches(stage, "two-loss", 1), 0, "standard lower bracket should wait for the middle bracket path");

  stage = completeReadyMatches(stage, "zero-loss", 2);
  assert.equal(
    countMatches(stage, "one-loss", 1),
    2,
    "upper semifinal losers should not be paired together as extra middle quarterfinals"
  );

  const upperRoundTwoDropIds = stage.matches
    .filter((match) => match.bracketGroup === "zero-loss" && match.round === 2 && match.status === "complete")
    .map((match) => match.loserId)
    .filter(Boolean);

  stage = completeReadyMatches(stage, "one-loss", 1);
  const middleRoundOneSurvivorIds = stage.matches
    .filter((match) => match.bracketGroup === "one-loss" && match.round === 1)
    .map((match) => match.winnerId)
    .filter(Boolean);
  assert.equal(countMatches(stage, "one-loss", 2), 2, "middle semifinals should pair survival winners with upper drops");
  assert.equal(countMatches(stage, "two-loss", 1), 2, "standard lower bracket should show TBD waiting slots");
  assert.equal(
    stage.matches.filter(
      (match) =>
        match.bracketGroup === "two-loss" &&
        match.round === 1 &&
        match.status === "pending" &&
        Boolean(match.participantA?.teamId) !== Boolean(match.participantB?.teamId)
    ).length,
    2,
    "standard lower bracket should wait as team versus TBD until the cross opponents are known"
  );

  const middleRoundTwo = stage.matches.filter((match) => match.bracketGroup === "one-loss" && match.round === 2);
  middleRoundTwo.forEach((match) => {
    const participantIds = [match.participantA?.teamId, match.participantB?.teamId].filter(Boolean);
    assert.equal(
      participantIds.filter((teamId) => middleRoundOneSurvivorIds.includes(teamId)).length,
      1,
      "middle round two should include one middle survivor"
    );
    assert.equal(
      participantIds.filter((teamId) => upperRoundTwoDropIds.includes(teamId)).length,
      1,
      "middle round two should include one upper drop"
    );
  });

  stage = completeReadyMatches(stage, "one-loss", 2);
  const middleRoundOneLoserIds = stage.matches
    .filter((match) => match.bracketGroup === "one-loss" && match.round === 1 && match.status === "complete")
    .map((match) => match.loserId)
    .filter(Boolean);
  const middleRoundTwoLoserIds = stage.matches
    .filter((match) => match.bracketGroup === "one-loss" && match.round === 2 && match.status === "complete")
    .map((match) => match.loserId)
    .filter(Boolean);

  assert.equal(
    countMatches(stage, "one-loss", 3),
    1,
    "middle survival winners should play each other before facing the upper final drop"
  );
  assert.equal(
    stage.matches.filter((match) => match.bracketGroup === "one-loss" && match.round === 3 && match.status === "ready")
      .length,
    1,
    "middle survival winners should produce one ready match"
  );
  assert.equal(
    countMatches(stage, "two-loss", 1),
    2,
    "lower bracket should keep the early lower losers in TBD waiting slots"
  );

  stage = completeReadyMatches(stage, "one-loss", 3);
  assert.equal(
    stage.matches.filter((match) => match.bracketGroup === "one-loss" && match.round === 4 && match.status === "pending")
      .length,
    1,
    "middle survival winner should wait for the upper final loser"
  );

  stage = completeReadyMatches(stage, "zero-loss", 3);
  assert.equal(
    stage.matches.filter((match) => match.bracketGroup === "one-loss" && match.round === 4 && match.status === "ready")
      .length,
    1,
    "middle final should be filled by the upper final loser"
  );

  stage = completeReadyMatches(stage, "one-loss", 4);
  assert.ok(stage.twoLossFinalistId, "middle final loser should be reserved for the lower final");
  assert.equal(countMatches(stage, "two-loss", 1), 2, "lower quarterfinals should be created after middle final");

  const lowerRoundOne = stage.matches.filter((match) => match.bracketGroup === "two-loss" && match.round === 1);
  lowerRoundOne.forEach((match) => {
    const participantIds = [match.participantA?.teamId, match.participantB?.teamId].filter(Boolean);
    assert.equal(
      participantIds.filter((teamId) => middleRoundOneLoserIds.includes(teamId)).length,
      1,
      "lower round one should include one middle round one loser"
    );
    assert.equal(
      participantIds.filter((teamId) => middleRoundTwoLoserIds.includes(teamId)).length,
      1,
      "lower round one should include one middle round two loser"
    );
    assert.equal(
      didTeamsAlreadyPlay(stage, participantIds[0], participantIds[1], match.id),
      false,
      "lower round one should avoid rematches when another cross pairing is available"
    );
  });

  stage = completeReadyMatches(stage, "two-loss", 1);
  const lowerRoundOneWinnerIds = stage.matches
    .filter((match) => match.bracketGroup === "two-loss" && match.round === 1 && match.status === "complete")
    .map((match) => match.winnerId)
    .filter(Boolean);
  const lowerRoundTwo = stage.matches.find(
    (match) => match.bracketGroup === "two-loss" && match.round === 2 && match.status === "ready"
  );
  assert.ok(lowerRoundTwo, "lower round one winners should create the next lower survival match");
  const lowerRoundTwoParticipantIds = [
    lowerRoundTwo.participantA?.teamId,
    lowerRoundTwo.participantB?.teamId
  ].filter(Boolean);
  assert.deepEqual(
    lowerRoundTwoParticipantIds.sort(),
    lowerRoundOneWinnerIds.sort(),
    "standard lower round two should pair lower round one winners before facing the reserved middle finalist"
  );

  const lowerRoundTwoWinnerId = chooseFirstParticipantWinner(lowerRoundTwo);
  stage = applyTripleEliminationResult(stage, lowerRoundTwo.id, 2, 0, lowerRoundTwoWinnerId);
  const lowerFinal = stage.matches.find(
    (match) =>
      match.bracketGroup === "two-loss" &&
      match.roundName === "Lower Final" &&
      match.status === "ready"
  );
  assert.ok(lowerFinal, "lower survival winner should face the reserved middle finalist when it is already known");
  assert.ok(matchHasTeam(lowerFinal, lowerRoundTwoWinnerId));
});

test("triple elimination waits first middle winners for upper drops before pairing survivors", () => {
  let stage = generateTripleEliminationBracket(teams(8));

  stage = completeReadyMatches(stage, "zero-loss", 1);
  stage = completeReadyMatches(stage, "one-loss", 1);

  assert.equal(
    countMatches(stage, "one-loss", 2),
    2,
    "first middle winners should wait in separate upper-drop slots"
  );
  assert.equal(
    stage.matches.filter((match) => match.bracketGroup === "one-loss" && match.round === 2 && match.status === "pending")
      .length,
    2,
    "first middle winners should show team versus TBD"
  );

  stage = completeReadyMatches(stage, "zero-loss", 2);
  assert.equal(
    stage.matches.filter((match) => match.bracketGroup === "one-loss" && match.round === 2 && match.status === "ready")
      .length,
    2,
    "upper round two drops should fill both waiting middle matches"
  );

  stage = completeReadyMatches(stage, "one-loss", 2);
  assert.equal(countMatches(stage, "one-loss", 3), 1, "middle round two winners should then play each other");
  assert.equal(
    stage.matches.filter((match) => match.bracketGroup === "one-loss" && match.round === 3 && match.status === "ready")
      .length,
    1
  );
});

test("triple elimination shows a lower survivor TBD slot while the middle finalist is unresolved", () => {
  let stage = generateTripleEliminationBracket(teams(8));

  stage = completeReadyMatches(stage, "zero-loss", 1);
  stage = completeReadyMatches(stage, "zero-loss", 2);
  stage = completeReadyMatches(stage, "one-loss", 1);
  stage = completeReadyMatches(stage, "one-loss", 2);
  stage = completeReadyMatches(stage, "two-loss", 1);

  const lowerRoundTwo = stage.matches.find(
    (match) => match.bracketGroup === "two-loss" && match.round === 2 && match.status === "ready"
  );
  assert.ok(lowerRoundTwo);

  const lowerRoundTwoWinnerId = chooseFirstParticipantWinner(lowerRoundTwo);
  stage = applyTripleEliminationResult(stage, lowerRoundTwo.id, 2, 0, lowerRoundTwoWinnerId);

  const lowerWaiting = stage.matches.find(
    (match) =>
      match.bracketGroup === "two-loss" &&
      match.roundName !== "Lower Final" &&
      match.status === "pending" &&
      Boolean(match.participantA?.teamId) !== Boolean(match.participantB?.teamId)
  );
  assert.ok(lowerWaiting, "lower survivor should wait as team versus TBD until the middle finalist is known");
  assert.ok(matchHasTeam(lowerWaiting, lowerRoundTwoWinnerId));
});

test("triple elimination creates only one lower final after the lower survivor is settled", () => {
  let stage = generateTripleEliminationBracket(teams(8));

  stage = completeReadyMatches(stage, "zero-loss", 1);
  stage = completeReadyMatches(stage, "zero-loss", 2);
  stage = completeReadyMatches(stage, "one-loss", 1);
  stage = completeReadyMatches(stage, "one-loss", 2);
  stage = completeReadyMatches(stage, "two-loss", 1);

  const lowerRoundTwo = stage.matches.find(
    (match) => match.bracketGroup === "two-loss" && match.round === 2 && match.status === "ready"
  );
  assert.ok(lowerRoundTwo);
  const lowerSurvivorId = chooseFirstParticipantWinner(lowerRoundTwo);
  stage = applyTripleEliminationResult(stage, lowerRoundTwo.id, 2, 0, lowerSurvivorId);

  assert.ok(
    stage.matches.some(
      (match) =>
        match.bracketGroup === "two-loss" &&
        match.roundName !== "Lower Final" &&
        match.status === "pending" &&
        matchHasTeam(match, lowerSurvivorId)
    ),
    "lower survivor should first wait in a normal round against TBD"
  );

  stage = completeReadyMatches(stage, "one-loss", 3);
  const lowerFinal = stage.matches.find(
    (match) =>
      match.bracketGroup === "two-loss" &&
      match.roundName === "Lower Final" &&
      match.status === "ready" &&
      matchHasTeam(match, lowerSurvivorId)
  );
  assert.ok(lowerFinal, "the actual lower final should be created after the lower survivor is settled");
  assert.ok(lowerFinal.participantA?.teamId && lowerFinal.participantB?.teamId);

  assert.equal(
    stage.matches.filter(
      (match) =>
        match.bracketGroup === "two-loss" &&
        match.roundName === "Lower Final" &&
        match.status === "pending" &&
        Boolean(match.participantA?.teamId) !== Boolean(match.participantB?.teamId)
    ).length,
    0,
    "8-team standard triple should end the lower path at the completed lower final"
  );
});

test("triple elimination creates a late middle challenge between middle and lower survivors", () => {
  let stage = generateTripleEliminationBracket(teams(8));

  for (let step = 0; step < 120; step += 1) {
    const placementChallenge = stage.matches.find(
      (match) =>
        match.id.startsWith("triple-placement-final") &&
        match.bracketGroup === "one-loss" &&
        match.roundName === "Middle Final" &&
        match.status === "ready" &&
        Boolean(match.participantA?.teamId) &&
        Boolean(match.participantB?.teamId)
    );
    if (placementChallenge) {
      const participantIds = [
        placementChallenge.participantA?.teamId,
        placementChallenge.participantB?.teamId
      ].filter(Boolean) as string[];
      assert.equal(participantIds.length, 2);
      assert.ok(
        participantIds.some((teamId) => stage.lossCounts[teamId] === 1),
        "placement challenge should include the middle survivor"
      );
      assert.ok(
        participantIds.some((teamId) => stage.lossCounts[teamId] === 2),
        "placement challenge should include the lower survivor"
      );
      return;
    }

    const readyMatch = stage.matches.find((match) => match.status === "ready");
    assert.ok(readyMatch, "triple elimination should keep producing matches until the placement challenge");
    const winnerId = chooseFirstParticipantWinner(readyMatch);
    stage = applyTripleEliminationResult(stage, readyMatch.id, 2, 0, winnerId);
  }

  assert.fail("standard triple should create a late middle challenge before final placements");
});

test("triple elimination sends the final middle loser to a late lower final", () => {
  let stage = generateTripleEliminationBracket(teams(8));

  stage = completeReadyMatches(stage, "zero-loss", 1);
  stage = completeReadyMatches(stage, "zero-loss", 2);
  stage = completeReadyMatches(stage, "one-loss", 1);
  stage = completeReadyMatches(stage, "one-loss", 2);
  stage = completeReadyMatches(stage, "two-loss", 1);

  const lowerRoundTwo = stage.matches.find(
    (match) => match.bracketGroup === "two-loss" && match.round === 2 && match.status === "ready"
  );
  assert.ok(lowerRoundTwo);
  const lowerRoundTwoWinnerId = chooseFirstParticipantWinner(lowerRoundTwo);
  stage = applyTripleEliminationResult(stage, lowerRoundTwo.id, 2, 0, lowerRoundTwoWinnerId);

  stage = completeReadyMatches(stage, "one-loss", 3);

  const lowerFinalBeforeFinalMiddleMatch = stage.matches.find(
    (match) =>
      match.bracketGroup === "two-loss" &&
      match.roundName === "Lower Final" &&
      match.status === "ready"
  );
  assert.ok(lowerFinalBeforeFinalMiddleMatch, "lower path should be able to settle before the final middle match");
  const lowerWinnerId = chooseFirstParticipantWinner(lowerFinalBeforeFinalMiddleMatch);
  stage = applyTripleEliminationResult(stage, lowerFinalBeforeFinalMiddleMatch.id, 2, 0, lowerWinnerId);

  stage = completeReadyMatches(stage, "zero-loss", 3);
  const finalMiddleMatch = stage.matches.find(
    (match) =>
      match.bracketGroup === "one-loss" &&
      match.round === Math.max(...stage.matches.filter((item) => item.bracketGroup === "one-loss").map((item) => item.round)) &&
      match.status === "ready"
  );
  assert.ok(finalMiddleMatch, "upper final loser should fill the final middle match");
  const middleWinnerId = chooseFirstParticipantWinner(finalMiddleMatch);
  const finalMiddleLoserId = [
    finalMiddleMatch.participantA?.teamId,
    finalMiddleMatch.participantB?.teamId
  ].find((teamId) => teamId && teamId !== middleWinnerId);
  assert.ok(finalMiddleLoserId);
  stage = applyTripleEliminationResult(stage, finalMiddleMatch.id, 2, 0, middleWinnerId);

  const lateLowerFinal = stage.matches.find(
    (match) =>
      match.bracketGroup === "two-loss" &&
      match.roundName === "Lower Final" &&
      match.status === "ready" &&
      matchHasTeam(match, lowerWinnerId) &&
      matchHasTeam(match, finalMiddleLoserId)
  );
  assert.ok(lateLowerFinal, "final middle loser should drop to lower and face the lower survivor");
});

test("8-team triple elimination keeps generating loss groups", () => {
  let stage = generateTripleEliminationBracket(teams(8));

  for (let step = 0; step < 160 && !isTriplePlacementComplete(stage); step += 1) {
    const readyMatch = stage.matches.find((match) => match.status === "ready");
    assert.ok(readyMatch, "triple elimination should not stall with many teams");
    const winnerId = readyMatch.participantA?.teamId ?? readyMatch.participantB?.teamId;
    assert.ok(winnerId);
    stage = applyTripleEliminationResult(stage, readyMatch.id, 2, 0, winnerId);
  }

  assert.ok(stage.championId);
  assert.ok(stage.runnerUpId);
  assert.ok(stage.thirdPlaceId);
  assert.equal(stage.eliminatedTeamIds.length, 5);
  assert.ok(stage.matches.some((match) => match.bracketGroup === "two-loss" && match.roundName === "Lower Final"));
});

test("triple elimination completes for power-of-two team counts", () => {
  tripleEliminationTeamCounts.forEach((teamCount) => {
    let stage = generateTripleEliminationBracket(teams(teamCount));
    assertEliminationIntegrity(stage.matches, `triple ${teamCount} teams`);

    for (let step = 0; step < teamCount * 10 && !isTriplePlacementComplete(stage); step += 1) {
      const readyMatch = stage.matches.find((match) => match.status === "ready");
      assert.ok(readyMatch, `triple elimination should not stall with ${teamCount} teams`);
      const winnerId = chooseFirstParticipantWinner(readyMatch);
      assert.ok(winnerId);
      stage = applyTripleEliminationResult(stage, readyMatch.id, 2, 0, winnerId);
      assertEliminationIntegrity(stage.matches, `triple ${teamCount} teams step ${step + 1}`);
    }

    assert.ok(stage.championId, `triple elimination should produce a champion with ${teamCount} teams`);
    if (teamCount >= 3) {
      assert.ok(stage.runnerUpId, `triple elimination should produce a runner-up with ${teamCount} teams`);
      assert.ok(stage.thirdPlaceId, `triple elimination should produce a third place with ${teamCount} teams`);
      assert.equal(stage.eliminatedTeamIds.length, teamCount - 3);
    }
  });
});

test("triple elimination rejects teams over 8", () => {
  assert.throws(() => generateTripleEliminationBracket(teams(9)), /up to 8 teams/);
});

test("battle royale standings only count completed rounds", () => {
  const roster = teams(24);
  let stage = generateBattleRoyaleRounds(roster, { stageMode: "qualifier", roundCount: 5 });

  const emptyStandings = calculateBattleRoyaleStandings(stage, roster);
  assert.equal(emptyStandings.every((standing) => standing.roundsPlayed === 0), true);

  const firstRound = stage.rounds[0];
  stage = applyBattleRoyaleResult(
    stage,
    firstRound.id,
    firstRound.teamIds.map((teamId, index) => ({
      teamId,
      placement: index + 1,
      kills: teamId === "team-16" ? 50 : 0,
      bonusPoints: 0,
      penaltyPoints: 0
    }))
  );

  const standings = calculateBattleRoyaleStandings(stage, roster);
  assert.equal(standings.find((standing) => standing.teamId === "team-1")?.roundsPlayed, 1);
  assert.equal(standings.find((standing) => standing.teamId === "team-17")?.roundsPlayed, 0);
  assert.equal(standings.find((standing) => standing.teamId === "team-1")?.placementPoints, 10);
  assert.equal(standings.find((standing) => standing.teamId === "team-16")?.placementPoints, 0);
  assert.equal(standings.find((standing) => standing.teamId === "team-16")?.killPoints, 50);
});

test("battle royale standings use placement points only", () => {
  const roster = teams(24);
  let stage = generateBattleRoyaleRounds(roster, { stageMode: "qualifier", roundCount: 5 });
  const firstRound = stage.rounds[0];

  stage = applyBattleRoyaleResult(
    stage,
    firstRound.id,
    firstRound.teamIds.map((teamId, index) => ({
      teamId,
      placement: teamId === "team-1" ? 2 : teamId === "team-2" ? 1 : index + 1,
      kills: teamId === "team-1" ? 50 : 0,
      bonusPoints: 0,
      penaltyPoints: 0
    }))
  );

  const standings = calculateBattleRoyaleStandings(stage, roster);
  assert.equal(standings[0].teamId, "team-2");
  assert.equal(standings[0].placementPoints, 10);
  assert.equal(standings[0].killPoints, 0);
  assert.equal(standings[1].teamId, "team-1");
  assert.equal(standings[1].placementPoints, 6);
  assert.equal(standings[1].killPoints, 50);
});

test("battle royale standings track kill points without changing placement-point order", () => {
  const roster = teams(24);
  let stage = generateBattleRoyaleRounds(roster, { stageMode: "qualifier", roundCount: 5 });
  const firstRound = stage.rounds[0];

  stage = applyBattleRoyaleResult(
    stage,
    firstRound.id,
    firstRound.teamIds.map((teamId, index) => ({
      teamId,
      placement: index + 1,
      kills: teamId === "team-2" ? 20 : 0,
      bonusPoints: 0,
      penaltyPoints: 0
    }))
  );

  const standings = calculateBattleRoyaleStandings(stage, roster);
  assert.equal(standings[0].teamId, "team-1");
  assert.equal(standings[1].teamId, "team-2");
  assert.equal(standings[1].killPoints, 20);
});

test("battle royale group standings keep group order", () => {
  const roster = teams(24);
  let stage = generateBattleRoyaleRounds(roster, { stageMode: "qualifier", roundCount: 5 });

  const abRound = stage.rounds[0];
  stage = applyBattleRoyaleResult(
    stage,
    abRound.id,
    abRound.teamIds.map((teamId, index) => ({
      teamId,
      placement: index + 1,
      kills: teamId === "team-16" ? 50 : 0,
      bonusPoints: 0,
      penaltyPoints: 0
    }))
  );

  const acRound = stage.rounds[1];
  stage = applyBattleRoyaleResult(
    stage,
    acRound.id,
    acRound.teamIds.map((teamId, index) => ({
      teamId,
      placement: index + 1,
      kills: teamId === "team-24" ? 40 : 0,
      bonusPoints: 0,
      penaltyPoints: 0
    }))
  );

  const overallStandings = calculateBattleRoyaleStandings(stage, roster);
  const bGroupStandings = calculateBattleRoyaleStandings(stage, roster.slice(8, 16));
  const cGroupStandings = calculateBattleRoyaleStandings(stage, roster.slice(16, 24));

  assert.equal(overallStandings[0].teamId, "team-1");
  assert.equal(overallStandings[1].teamId, "team-2");
  assert.equal(bGroupStandings[0].teamId, "team-9");
  assert.equal(bGroupStandings[0].rank, 1);
  assert.equal(cGroupStandings[0].teamId, "team-17");
  assert.equal(cGroupStandings[0].rank, 1);
});

test("battle royale standings count entered legacy rounds without complete flags", () => {
  const roster = teams(24);
  const stage = generateBattleRoyaleRounds(roster, { stageMode: "qualifier", roundCount: 5 });
  const firstRound = stage.rounds[0];
  const legacyStage = {
    ...stage,
    rounds: stage.rounds.map((round) =>
      round.id === firstRound.id
        ? {
            ...round,
            isComplete: false,
            placements: round.teamIds.map((teamId, index) => ({
              teamId,
              placement: index + 1,
              kills: teamId === "team-16" ? 50 : 0,
              bonusPoints: 0,
              penaltyPoints: 0
            }))
          }
        : round
    )
  };

  const standings = calculateBattleRoyaleStandings(legacyStage, roster);
  assert.equal(standings.find((standing) => standing.teamId === "team-16")?.roundsPlayed, 1);
});
