"use client";

import { useState } from "react";
import type { StepladderBracket, Team } from "@/lib/core/models";
import { createRandomHeadToHeadScore } from "@/lib/core/randomResults";
import { BracketZoomControls } from "@/components/bracket/BracketZoomControls";
import { RandomRoundButton } from "@/components/bracket/RandomRoundButton";
import { MatchCard } from "@/components/bracket/MatchCard";
import { TeamLogo } from "@/components/teams/TeamLogo";

type StepladderViewProps = {
  bracket: StepladderBracket;
  teams: Team[];
  onSaveResult: (
    matchId: string,
    result: { scoreA?: number; scoreB?: number; winnerId: string }
  ) => void;
  onClearResult: (matchId: string) => void;
};

export function StepladderView({
  bracket,
  teams,
  onSaveResult,
  onClearResult
}: StepladderViewProps) {
  const [zoom, setZoom] = useState(1);
  const [hoveredTeamId, setHoveredTeamId] = useState<string | undefined>();
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const champion = bracket.championId ? teamsById.get(bracket.championId) : undefined;
  const placements = getStepladderPlacements(bracket, teamsById);
  const currentMatch = bracket.matches.find(
    (match) =>
      match.status !== "complete" &&
      match.participantA?.teamId &&
      match.participantB?.teamId
  );

  const autoFillCurrentStep = () => {
    if (!currentMatch?.participantA?.teamId || !currentMatch.participantB?.teamId) return;
    const { scoreA, scoreB } = createRandomHeadToHeadScore();
    onSaveResult(currentMatch.id, {
      scoreA,
      scoreB,
      winnerId: scoreA > scoreB ? currentMatch.participantA.teamId : currentMatch.participantB.teamId
    });
  };

  return (
    <section className="bracket-board">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-arena/85 px-5 py-4">
        <div>
          <p className="section-kicker">Stepladder</p>
          <h2 className="mt-1 text-3xl font-black uppercase tracking-wide text-ink">
            낮은 시드부터 최상위 시드까지
          </h2>
          <p className="mt-1 text-sm text-muted">
            승자가 다음 상위 시드와 계속 맞붙는 계단식 토너먼트입니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <PodiumChip label="챔피언" tone="gold" team={champion} />
          <PodiumChip label="러너업" tone="silver" team={placements.runnerUp} />
          <PodiumChip label="3등" tone="bronze" team={placements.thirdPlace} />
          <BracketZoomControls
            zoom={zoom}
            onChange={setZoom}
            actions={
              <RandomRoundButton
                onClick={autoFillCurrentStep}
                disabled={!currentMatch}
                label="현재 스텝 자동"
                title="현재 진행 가능한 스텝에 랜덤 점수를 입력합니다"
              />
            }
          />
        </div>
      </div>

      <div className="bracket-board-inner max-h-[72vh] overflow-auto">
        <div
          className="min-w-max origin-top-left pb-4 transition-transform duration-150"
          style={{
            transform: `scale(${zoom})`,
            width: `${100 / zoom}%`
          }}
        >
          <div className="flex min-w-max items-start gap-10">
            {bracket.matches.map((match, index) => {
              const toneClassName = stepRoundTone(index, bracket.matches.length);

              return (
                <div
                  key={match.id}
                  className="relative w-[280px] shrink-0"
                  style={{ paddingTop: `${index * 56}px` }}
                >
                  <div className={`bracket-round-label ${toneClassName}`}>
                    {index === bracket.matches.length - 1 ? "Final Boss" : `Step ${index + 1}`}
                  </div>
                  <div className="mt-3">
                    <MatchCard
                      match={match}
                      teamsById={teamsById}
                      active={match.id === currentMatch?.id}
                      locked={match.status !== "ready" && match.status !== "complete"}
                      roundToneClassName={toneClassName}
                      onTeamHover={setHoveredTeamId}
                      onTeamHoverEnd={() => setHoveredTeamId(undefined)}
                      onSaveResult={onSaveResult}
                      onClearResult={onClearResult}
                    />
                  </div>
                  {index < bracket.matches.length - 1 && doesMatchAdvanceTeam(match, hoveredTeamId) ? (
                    <div className="pointer-events-none absolute -right-8 top-[calc(50%+28px)] hidden h-0.5 w-8 bg-cyan shadow-[0_0_14px_rgba(47,230,255,0.75)] md:block" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function doesMatchAdvanceTeam(match: StepladderBracket["matches"][number], teamId?: string) {
  if (!teamId) return false;
  return match.winnerId === teamId || (match.status === "bye" && match.participantA?.teamId === teamId);
}

function PodiumChip({
  label,
  tone,
  team
}: {
  label: string;
  tone: "gold" | "silver" | "bronze";
  team?: Team;
}) {
  const toneClass = {
    gold: "border-gold/60 bg-gold/15 text-gold",
    silver: "border-slate-300/60 bg-slate-200/10 text-slate-200",
    bronze: "border-orange-500/60 bg-orange-500/10 text-orange-300"
  }[tone];

  return (
    <div className={`flex h-10 items-center gap-2 border px-3 ${toneClass}`}>
      <span className="text-xs font-black uppercase tracking-wide">{label}</span>
      <TeamLogo team={team} size="sm" highlighted={Boolean(team)} />
      <span className="max-w-28 truncate text-xs font-black uppercase text-ink">
        {team ? team.shortName || team.name : "미정"}
      </span>
    </div>
  );
}

function getStepladderPlacements(bracket: StepladderBracket, teamsById: Map<string, Team>) {
  const completedMatches = bracket.matches.filter((match) => match.status === "complete");
  const finalMatch = completedMatches[completedMatches.length - 1];
  const semifinalMatch = completedMatches[completedMatches.length - 2];

  return {
    runnerUp: finalMatch?.loserId ? teamsById.get(finalMatch.loserId) : undefined,
    thirdPlace: semifinalMatch?.loserId ? teamsById.get(semifinalMatch.loserId) : undefined
  };
}

function stepRoundTone(index: number, total: number) {
  const remaining = total - index;
  if (remaining === 1) return "bg-gold text-arena shadow-[0_0_20px_hsl(var(--gold)/0.22)]";
  if (remaining === 2) return "bg-slate-200 text-slate-950 shadow-[0_0_18px_rgba(226,232,240,0.18)]";
  if (remaining === 3) return "bg-orange-500 text-white shadow-[0_0_18px_rgba(249,115,22,0.2)]";

  const palette = [
    "bg-cyan text-arena",
    "bg-lime text-arena",
    "bg-magenta text-white",
    "bg-danger text-white",
    "bg-blue-500 text-white",
    "bg-emerald-400 text-slate-950",
    "bg-fuchsia-500 text-white",
    "bg-rose-500 text-white"
  ];

  return palette[index % palette.length];
}
