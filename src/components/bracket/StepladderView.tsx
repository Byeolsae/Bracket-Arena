"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BracketStageMatch, StepladderBracket, Team } from "@/lib/core/models";
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
  const boardRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [connectorPaths, setConnectorPaths] = useState<string[]>([]);
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
  }, [displayedMatches, zoom]);

  return (
    <section className="bracket-board">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-arena/85 px-5 py-4">
        <div>
          <p className="section-kicker">스텝래더</p>
          <h2 className="mt-1 text-2xl font-black uppercase tracking-wide text-ink sm:text-3xl">
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
          <div ref={boardRef} className="relative isolate flex min-w-max items-start gap-16 pb-16 pr-16 pt-2">
            <StepladderConnectorOverlay paths={connectorPaths} />
            {bracket.matches.map((match, index) => {
              const toneClassName = stepRoundTone(index, bracket.matches.length);

              return (
                <div
                  key={match.id}
                  className="relative z-10 w-80 shrink-0"
                  style={{ paddingTop: `${index * 74}px` }}
                >
                  <div className={`bracket-round-label ${toneClassName}`}>
                    {index === bracket.matches.length - 1 ? "최종 보스" : `${index + 1}단계`}
                  </div>
                  <div className="mt-3">
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

function StepladderConnectorOverlay({ paths }: { paths: string[] }) {
  if (!paths.length) return null;

  return (
    <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="stepladder-connector-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--cyan))" stopOpacity="0.18" />
          <stop offset="55%" stopColor="hsl(var(--lime))" stopOpacity="0.72" />
          <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0.88" />
        </linearGradient>
      </defs>
      {paths.map((path, index) => (
        <path
          key={`${path}-${index}`}
          d={path}
          fill="none"
          stroke="url(#stepladder-connector-gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="drop-shadow-[0_0_6px_rgba(130,255,49,0.34)]"
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
  const x = side === "right" ? rect.right - rootRect.left : rect.left - rootRect.left;

  return {
    x,
    y: rect.top - rootRect.top + rect.height / 2
  };
}

function getMatchCardElement(root: HTMLElement, matchId: string) {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-match-card='true']")).find(
    (element) => element.dataset.matchId === matchId
  );
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
