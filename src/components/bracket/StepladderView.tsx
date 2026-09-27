"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BracketStageMatch, StepladderBracket, Team } from "@/lib/core/models";
import { createRandomHeadToHeadScore } from "@/lib/core/randomResults";
import { BracketZoomControls } from "@/components/bracket/BracketZoomControls";
import { RandomRoundButton } from "@/components/bracket/RandomRoundButton";
import { MatchCard } from "@/components/bracket/MatchCard";
import { getBracketSizing } from "@/components/bracket/bracketSizing";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { useUiStore, type TeamDisplaySize } from "@/store/uiStore";

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
  const boardRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [connectorPaths, setConnectorPaths] = useState<string[]>([]);
  const bracketTeamLayout = useUiStore((state) => state.bracketTeamLayout);
  const teamDisplaySize = useUiStore((state) => state.teamDisplaySize);
  const stepSize = stepladderStepSizeClass[teamDisplaySize];
  const sizing = getBracketSizing(teamDisplaySize, bracketTeamLayout);
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const champion = bracket.championId ? teamsById.get(bracket.championId) : undefined;
  const placements = getStepladderPlacements(bracket, teamsById);
  const displayedMatches = useMemo(() => bracket.matches, [bracket.matches]);
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

  useEffect(() => {
    let frameId = 0;

    const updateConnectorPaths = () => {
      const root = boardRef.current;
      const nextPaths = root ? buildStepladderConnectionPaths(root, displayedMatches) : [];
      setConnectorPaths((currentPaths) =>
        currentPaths.join("|") === nextPaths.join("|") ? currentPaths : nextPaths
      );
    };

    const scheduleUpdate = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateConnectorPaths);
    };

    scheduleUpdate();
    const timeoutId = window.setTimeout(scheduleUpdate, 100);
    window.addEventListener("resize", scheduleUpdate);

    const observer =
      boardRef.current && "ResizeObserver" in window
        ? new ResizeObserver(scheduleUpdate)
        : undefined;
    if (boardRef.current) observer?.observe(boardRef.current);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", scheduleUpdate);
      observer?.disconnect();
    };
  }, [bracketTeamLayout, displayedMatches, teamDisplaySize, zoom]);

  return (
    <section className="bracket-board">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-arena/85 px-5 py-4">
        <div>
          <p className="section-kicker">스텝래더</p>
          <h2 className="mt-1 text-2xl font-black uppercase tracking-wide text-ink sm:text-3xl">
            스텝래더 브래킷
          </h2>
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
          <div ref={boardRef} className="relative isolate flex min-w-max items-start gap-16 pb-16 pr-16 pt-2">
            <StepladderConnectorOverlay paths={connectorPaths} />
            {bracket.matches.map((match, index) => {
              const toneClassName = "bracket-heading-tone";

              return (
                <div
                  key={match.id}
                  className="relative z-10 shrink-0"
                  style={{ width: sizing.cardWidth, paddingTop: `${index * stepSize.stepOffset}px` }}
                >
                  <div className={`bracket-round-label ${toneClassName}`} style={sizing.labelStyle}>
                    {index === bracket.matches.length - 1 ? "결승" : `${index + 1}단계`}
                  </div>
                  <div className={stepSize.cardGap}>
                    <MatchCard
                      match={match}
                      teamsById={teamsById}
                      active={match.id === currentMatch?.id}
                      locked={match.status !== "ready" && match.status !== "complete"}
                      roundToneClassName={toneClassName}
                      onSaveResult={onSaveResult}
                      onClearResult={onClearResult}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const stepladderStepSizeClass: Record<
  TeamDisplaySize,
  {
    stepOffset: number;
    cardGap: string;
  }
> = {
  1: {
    stepOffset: 52,
    cardGap: "mt-2"
  },
  2: {
    stepOffset: 58,
    cardGap: "mt-2"
  },
  3: {
    stepOffset: 64,
    cardGap: "mt-3"
  },
  4: {
    stepOffset: 74,
    cardGap: "mt-3"
  },
  5: {
    stepOffset: 86,
    cardGap: "mt-4"
  }
};

function StepladderConnectorOverlay({ paths }: { paths: string[] }) {
  if (!paths.length) return null;

  return (
    <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible" aria-hidden="true">
      {paths.map((path, index) => (
        <path
          key={`${path}-${index}`}
          d={path}
          fill="none"
          stroke="hsl(var(--muted) / 0.65)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function buildStepladderConnectionPaths(root: HTMLElement, matches: BracketStageMatch[]) {
  return matches
    .filter((match) => match.nextMatchId)
    .map((match) => {
      const from = getMatchCardElement(root, match.id);
      const to = match.nextMatchId ? getMatchCardElement(root, match.nextMatchId) : undefined;
      if (!from || !to) return undefined;

      const fromPoint = getElementPoint(root, from, "right");
      const toPoint = getElementPoint(root, to, "left");
      const bendX = fromPoint.x + Math.max(34, (toPoint.x - fromPoint.x) * 0.46);

      return [
        `M ${fromPoint.x} ${fromPoint.y}`,
        `L ${bendX} ${fromPoint.y}`,
        `L ${bendX} ${toPoint.y}`,
        `L ${toPoint.x} ${toPoint.y}`
      ].join(" ");
    })
    .filter(Boolean) as string[];
}

function getElementPoint(root: HTMLElement, element: HTMLElement, side: "left" | "right") {
  const rootRect = root.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  const scale = rootRect.width > 0 ? rootRect.width / Math.max(root.offsetWidth, 1) : 1;
  const x = ((side === "right" ? rect.right : rect.left) - rootRect.left) / scale;

  return {
    x,
    y: (rect.top + rect.height / 2 - rootRect.top) / scale
  };
}

function getMatchCardElement(root: HTMLElement, matchId: string) {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-match-card='true']")).find(
    (element) => element.dataset.matchId === matchId
  );
}

function PodiumChip({
  label,
  team
}: {
  label: string;
  tone: "gold" | "silver" | "bronze";
  team?: Team;
}) {
  return (
    <div className="flex h-10 items-center gap-2 rounded border border-line bg-panel px-3">
      <span className="text-xs font-medium text-muted">{label}</span>
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
