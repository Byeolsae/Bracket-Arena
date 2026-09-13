"use client";

import { useMemo, useState } from "react";
import type { BracketStageMatch, Team, Tournament } from "@/lib/core/models";
import { getCurrentPlayableMatchIds } from "@/lib/core/bracketOrder";
import { getMatchesByRound } from "@/lib/core/singleElimination";
import { BracketAxisLabel } from "@/components/bracket/BracketAxisLabel";
import { BracketLane } from "@/components/bracket/BracketLane";
import { BracketZoomControls } from "@/components/bracket/BracketZoomControls";
import { RandomRoundButton } from "@/components/bracket/RandomRoundButton";
import { autoFillCurrentBracketRound } from "@/components/bracket/randomRound";

type BracketViewProps = {
  tournament: Tournament;
  teams: Team[];
  onSaveResult: (
    matchId: string,
    result: { scoreA?: number; scoreB?: number; winnerId: string }
  ) => void;
  onClearResult: (matchId: string) => void;
};

export function BracketView({ tournament, teams, onSaveResult, onClearResult }: BracketViewProps) {
  const [zoom, setZoom] = useState(1);
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const mainMatches = useMemo(() => {
    const rounds = getMatchesByRound(tournament.matches);
    const thirdPlaceMatch = tournament.matches.find((match) => match.id === "third-place") as
      | BracketStageMatch
      | undefined;
    return (thirdPlaceMatch ? [...rounds.flat(), thirdPlaceMatch] : rounds.flat()) as BracketStageMatch[];
  }, [tournament.matches]);
  const activeMatchIds = useMemo(() => getCurrentPlayableMatchIds(mainMatches), [mainMatches]);
  const champion = tournament.championId ? teamsById.get(tournament.championId) : undefined;
  const placementText = champion ? `1위 결정 · ${champion.shortName || champion.name}` : "1위 결정";

  return (
    <div className="space-y-5">
      <section className="bracket-board">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-arena/85 px-5 py-4">
          <div>
            <p className="section-kicker">Bracket Stage</p>
            <h2 className="mt-1 text-3xl font-black uppercase tracking-wide text-ink">{tournament.name}</h2>
            <p className="mt-1 text-sm text-muted">
              {tournament.teamIds.length} teams / {tournament.bracketSize} bracket / single elimination
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <BracketZoomControls
              zoom={zoom}
              onChange={setZoom}
              actions={
                <RandomRoundButton
                  onClick={() => autoFillCurrentBracketRound(mainMatches, onSaveResult, activeMatchIds)}
                />
              }
            />
          </div>
        </div>

        <div className="bracket-board-inner">
          <div className="max-h-[78vh] overflow-auto overscroll-contain pb-6">
            <div
              className="min-h-[760px] min-w-[1760px] origin-top-left p-8 pr-[420px] pb-[320px]"
              style={{
                transform: `scale(${zoom})`,
                width: `${100 * zoom}%`
              }}
            >
              <section className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-10 border-l-4 border-cyan/60 bg-arena/25 py-5 pr-4">
                <BracketAxisLabel label="Main Bracket" tone="cyan" />
                <div className="min-w-0">
                  <BracketLane
                    title="Main Bracket"
                    subtitle={placementText}
                    matches={mainMatches}
                    teamsById={teamsById}
                    tone="cyan"
                    progressiveTone
                    scrollable={false}
                    activeMatchIds={activeMatchIds}
                    onSaveResult={onSaveResult}
                    onClearResult={onClearResult}
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
