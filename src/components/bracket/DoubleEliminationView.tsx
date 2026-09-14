"use client";

import type React from "react";
import { useMemo, useState } from "react";
import type { BracketStageMatch, DoubleEliminationBracket, Team } from "@/lib/core/models";
import { getCurrentPlayableMatchIds } from "@/lib/core/bracketOrder";
import { BracketAxisLabel } from "@/components/bracket/BracketAxisLabel";
import { BracketLane } from "@/components/bracket/BracketLane";
import { BracketZoomControls } from "@/components/bracket/BracketZoomControls";
import { RandomRoundButton } from "@/components/bracket/RandomRoundButton";
import { autoFillCurrentBracketRound } from "@/components/bracket/randomRound";
import { TeamLogo } from "@/components/teams/TeamLogo";
import {
  getDoubleLosersMatchCountByRound,
  getUpperBracketRoundCount,
  getUpperFirstRoundMatchCount
} from "@/lib/core/eliminationSizing";

type DoubleEliminationViewProps = {
  bracket: DoubleEliminationBracket;
  teams: Team[];
  onSaveResult: (
    matchId: string,
    result: { scoreA?: number; scoreB?: number; winnerId: string }
  ) => void;
  onClearResult: (matchId: string) => void;
};

export function DoubleEliminationView({
  bracket,
  teams,
  onSaveResult,
  onClearResult
}: DoubleEliminationViewProps) {
  const [zoom, setZoom] = useState(1);
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const champion = bracket.championId ? teamsById.get(bracket.championId) : undefined;
  const actualWinners = bracket.matches.filter((match) => match.bracketGroup === "winners");
  const actualLosers = bracket.matches.filter((match) => match.bracketGroup === "losers");
  const grandFinal = bracket.matches.filter((match) => match.bracketGroup === "grand-final");
  const bracketTeamCount = Math.max(bracket.teamIds.length, teams.length);
  const winnersFirstRoundSize = getUpperFirstRoundMatchCount(bracketTeamCount);
  const losersFirstRoundSize = Math.max(1, Math.ceil(winnersFirstRoundSize / 2));
  const winnersRoundCount = getUpperBracketRoundCount(bracketTeamCount);
  const grandFinalRound = winnersRoundCount + 1;
  const loserMatchCounts = getDoubleLosersMatchCountByRound(bracketTeamCount);
  const loserFinalRound = Math.max(...Object.keys(loserMatchCounts).map(Number), 0);
  const grandFinalAsWinnerMatch = grandFinal.slice(0, 1).map((match) => ({
    ...match,
    bracketGroup: "winners" as const,
    round: grandFinalRound,
    roundName: `Winners Bracket ${grandFinalRound}`,
    matchNumber: 1
  }));
  const winners = [
    ...actualWinners,
    ...createWaitingMatchesByPrefix(actualWinners, bracket.pendingTeamIds, "W", "winners", "Winners Bracket"),
    ...grandFinalAsWinnerMatch
  ].filter((match) => hasAnyAssignedParticipant(match));
  const losers = [
    ...actualLosers,
    ...createWaitingMatchesByPrefix(actualLosers, bracket.pendingTeamIds, "L", "losers", "Losers Bracket")
  ]
    .filter((match) => hasAnyAssignedParticipant(match))
    .map((match) =>
      match.round === loserFinalRound && loserFinalRound > 1
        ? { ...match, roundName: "Losers Final" }
        : match
    );
  const winnersDisplayRoundCount = Math.max(1, getActualRoundCount(winners));
  const losersDisplayRoundCount = getActualRoundCount(losers);
  const activeMatchIds = getCurrentPlayableMatchIds([...winners, ...losers]);
  const completedGrandFinal = [...grandFinal].reverse().find((match) => match.status === "complete");
  const runnerUp = completedGrandFinal?.loserId ? teamsById.get(completedGrandFinal.loserId) : undefined;
  const eliminatedIds = bracket.matches
    .map((match) => match.eliminatedTeamId)
    .filter(Boolean) as string[];
  const thirdPlaceId = [...eliminatedIds].reverse().find((teamId) => teamId !== runnerUp?.id && teamId !== champion?.id);
  const thirdPlace = thirdPlaceId ? teamsById.get(thirdPlaceId) : undefined;
  const winnersPlacementText = champion ? `1위 결정 · ${champion.shortName || champion.name}` : "1위 결정";
  const losersPlacementText = thirdPlace ? `패자조 · ${thirdPlace.shortName || thirdPlace.name}` : "패자조";

  return (
    <div className="space-y-5">
      <section className="bracket-board">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-arena/85 px-5 py-4">
          <div>
            <p className="section-kicker">Double Elimination</p>
            <h2 className="mt-1 text-3xl font-black uppercase tracking-wide text-ink">
              Double-Elimination Tournament
            </h2>
            <p className="mt-1 text-sm text-muted">
              승자조에서 한 번 지면 패자조로 내려가고, 패자조에서 다시 지면 탈락합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <BracketZoomControls
              zoom={zoom}
              onChange={setZoom}
              actions={
                <RandomRoundButton
                  onClick={() => autoFillCurrentBracketRound([...winners, ...losers], onSaveResult, activeMatchIds)}
                />
              }
            />
          </div>
        </div>

        <div className="bracket-board-inner">
          <div className="max-h-[78vh] overflow-auto overscroll-contain pb-6">
            <div
              className="min-h-[1100px] min-w-[2300px] origin-top-left space-y-16 p-8 pr-[520px] pb-[420px]"
              style={{
                transform: `scale(${zoom})`,
                width: `${100 * zoom}%`
              }}
            >
              <BracketStackSection title="Winners bracket" label="Winners Bracket" tone="cyan">
                <BracketLane
                  title="Winners bracket"
                  subtitle={winnersPlacementText}
                  matches={winners}
                  teamsById={teamsById}
                  tone="cyan"
                  progressiveTone
                  splitBranches
                  padToTreeRounds={false}
                  scrollable={false}
                  expectedFirstRoundMatchCount={winnersFirstRoundSize}
                  expectedRoundCount={winnersDisplayRoundCount}
                  expectedMatchCountsByRound={undefined}
                  activeMatchIds={activeMatchIds}
                  minHeight="600px"
                  onSaveResult={onSaveResult}
                  onClearResult={onClearResult}
                />
              </BracketStackSection>

              <BracketStackSection title="Losers bracket" label="Losers Bracket" tone="red">
                <BracketLane
                  title="Losers bracket"
                  subtitle={losersPlacementText}
                  matches={losers}
                  teamsById={teamsById}
                  tone="red"
                  progressiveTone
                  splitBranches
                  padToTreeRounds={false}
                  scrollable={false}
                  expectedFirstRoundMatchCount={losersFirstRoundSize}
                  expectedRoundCount={Math.max(1, losersDisplayRoundCount)}
                  expectedMatchCountsByRound={undefined}
                  activeMatchIds={activeMatchIds}
                  minHeight="430px"
                  onSaveResult={onSaveResult}
                  onClearResult={onClearResult}
                />
              </BracketStackSection>
            </div>
          </div>
        </div>
      </section>

      <section className="arena-card p-4">
        <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-danger">Eliminated</h3>
        <div className="flex flex-wrap gap-2">
          {eliminatedIds.map((teamId) => {
            const team = teamsById.get(teamId);
            return (
              <div key={teamId} className="flex items-center gap-2 border border-line bg-field px-2 py-1 opacity-55">
                <TeamLogo team={team} size="sm" />
                <span className="text-sm font-black uppercase text-ink">
                  {team?.shortName || team?.name || "TBD"}
                </span>
              </div>
            );
          })}
          {!eliminatedIds.length ? <span className="text-sm text-muted">아직 탈락한 팀이 없습니다.</span> : null}
        </div>
      </section>
    </div>
  );
}

function BracketStackSection({
  title,
  label,
  tone,
  children
}: {
  title: string;
  label: string;
  tone: "red" | "gold" | "cyan";
  children: React.ReactNode;
}) {
  return (
    <section
      className={`grid grid-cols-[64px_minmax(0,1fr)] gap-x-10 border-l-4 bg-arena/25 py-5 pr-4 ${
        tone === "gold" ? "border-gold/60" : tone === "cyan" ? "border-cyan/60" : "border-danger/60"
      }`}
    >
      <BracketAxisLabel label={label} tone={tone} />
      <div className="min-w-0 space-y-4">
        <h3 className="text-2xl font-black tracking-tight text-ink">{title}</h3>
        {children}
      </div>
    </section>
  );
}

function createWaitingMatchesByPrefix(
  matches: BracketStageMatch[],
  pendingTeamIds: Record<string, string[]> | undefined,
  prefix: "W" | "L",
  group: "winners" | "losers",
  roundNamePrefix: string
): BracketStageMatch[] {
  const entries = Object.entries(pendingTeamIds ?? {})
    .filter(([key]) => key.startsWith(`${prefix}:`))
    .sort(([left], [right]) => {
      const roundDiff = roundFromPendingKey(left) - roundFromPendingKey(right);
      return roundDiff || matchNumberFromPendingKey(left) - matchNumberFromPendingKey(right);
    });

  return entries.flatMap(([key, teamIds]) => {
    const round = roundFromPendingKey(key);
    const explicitMatchNumber = matchNumberFromPendingKey(key);
    const existingInRound = matches.filter((match) => match.round === round).length;

    const waitingMatches: BracketStageMatch[] = [];

    for (let index = 0; index < teamIds.length; index += 2) {
      const teamAId = teamIds[index];
      const teamBId = teamIds[index + 1];
      if (!teamAId || !teamBId) continue;
      const matchNumber = explicitMatchNumber || existingInRound + waitingMatches.length + 1;
      waitingMatches.push({
        id: `waiting-${group}-${round}-${matchNumber}-${teamAId}-${teamBId}`,
        round,
        roundName: `${roundNamePrefix} ${round}`,
        matchNumber,
        participantA: { teamId: teamAId },
        participantB: { teamId: teamBId },
        status: "pending" as const,
        bracketGroup: group
      });
    }

    return waitingMatches;
  });
}

function roundFromPendingKey(key: string) {
  return Number(key.split(":")[1] ?? 1);
}

function matchNumberFromPendingKey(key: string) {
  return Number(key.split(":")[2] ?? 0);
}

function getActualRoundCount(matches: BracketStageMatch[]) {
  return matches.length ? Math.max(...matches.map((match) => match.round)) : 0;
}

function hasAnyAssignedParticipant(match: BracketStageMatch) {
  return isDisplayableTeamId(match.participantA?.teamId) || isDisplayableTeamId(match.participantB?.teamId);
}

function isDisplayableTeamId(teamId?: string | null) {
  if (!teamId) return false;
  const normalized = teamId.toLowerCase();
  return normalized !== "bye" && !normalized.startsWith("tbd") && !normalized.startsWith("pending");
}
