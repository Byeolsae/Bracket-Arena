"use client";

import { useState } from "react";
import type { BracketStageMatch, Team } from "@/lib/core/models";
import { sortBracketMatches } from "@/lib/core/bracketOrder";
import { MatchCard } from "@/components/bracket/MatchCard";

type BracketLaneProps = {
  title: string;
  subtitle?: string;
  matches: BracketStageMatch[];
  teamsById: Map<string, Team>;
  tone?: "red" | "gold" | "cyan" | "lime" | "white";
  progressiveTone?: boolean;
  splitBranches?: boolean;
  padToTreeRounds?: boolean;
  expectedFirstRoundMatchCount?: number;
  expectedRoundCount?: number;
  expectedMatchCountsByRound?: Record<number, number>;
  roundNameOverrides?: Record<number, string>;
  activeMatchIds?: Set<string>;
  scrollable?: boolean;
  minHeight?: string;
  onSaveResult: (
    matchId: string,
    result: { scoreA?: number; scoreB?: number; winnerId: string }
  ) => void;
  onClearResult: (matchId: string) => void;
};

export function BracketLane({
  title,
  subtitle,
  matches,
  teamsById,
  tone = "red",
  progressiveTone = false,
  splitBranches = false,
  padToTreeRounds = true,
  expectedFirstRoundMatchCount,
  expectedRoundCount,
  expectedMatchCountsByRound,
  roundNameOverrides,
  activeMatchIds,
  scrollable = true,
  minHeight = "520px",
  onSaveResult,
  onClearResult
}: BracketLaneProps) {
  const [hoveredTeamId, setHoveredTeamId] = useState<string | undefined>();
  const rounds = groupByRound(matches);
  const rawDisplayRounds =
    splitBranches && expectedFirstRoundMatchCount
      ? fillSinglePathDisplayRounds(
          rounds,
          expectedFirstRoundMatchCount,
          title,
          expectedRoundCount,
          expectedMatchCountsByRound,
          padToTreeRounds
        )
      : rounds;
  const displayRounds = roundNameOverrides
    ? applyRoundNameOverrides(rawDisplayRounds, roundNameOverrides)
    : rawDisplayRounds;

  return (
    <section className="min-w-0 space-y-3">
      <div className="flex items-center gap-3">
        <div className={`bracket-ribbon ${toneClass(tone)}`}>{title}</div>
        {subtitle ? <div className="text-sm font-black uppercase tracking-wide text-muted">{subtitle}</div> : null}
      </div>

      {splitBranches && rounds.length > 0 ? (
        <SplitBranchRounds
          rounds={displayRounds}
          actualRounds={rounds}
          teamsById={teamsById}
          tone={tone}
          progressiveTone={progressiveTone}
          minHeight={minHeight}
          scrollable={scrollable}
          onSaveResult={onSaveResult}
          onClearResult={onClearResult}
          activeMatchIds={activeMatchIds}
          hoveredTeamId={hoveredTeamId}
          onTeamHover={setHoveredTeamId}
          onTeamHoverEnd={() => setHoveredTeamId(undefined)}
        />
      ) : (
      <div className={`${scrollable ? "overflow-x-auto" : "overflow-visible"} pb-4`}>
        <div className="grid min-w-max auto-cols-[minmax(300px,340px)] grid-flow-col gap-14">
          {rounds.map((round, roundIndex) => {
            const previousRound = rounds[roundIndex - 1];
            const roundHasActiveMatch = round.matches.some((match) => activeMatchIds?.has(match.id));
            const locked =
              roundIndex > 0 &&
              Boolean(previousRound?.matches.some((match) => match.status !== "complete" && match.status !== "bye"));
            const roundToneClassName = progressiveTone
              ? roundToneClass(tone, round.name, roundIndex, rounds.length)
              : toneClass(tone);

            return (
              <div key={round.key} className="relative flex shrink-0 flex-col justify-around gap-5" style={{ minHeight }}>
                <div className={`bracket-round-label ${roundHasActiveMatch ? "ring-2 ring-cyan shadow-[0_0_22px_rgba(47,230,255,0.28)]" : ""} ${roundToneClassName}`}>
                  {round.name}
                </div>
                <div className="flex flex-1 flex-col justify-around gap-5">
                  {round.matches.map((match) => (
                    <div key={match.id} className="relative">
                      {roundIndex > 0 && doesMatchIncludeTeam(match, hoveredTeamId) ? (
                        <HoverPathLine side="left" />
                      ) : null}
                      <MatchCard
                        match={match}
                        teamsById={teamsById}
                        locked={
                          match.status !== "complete" &&
                          (locked || Boolean(activeMatchIds && !activeMatchIds.has(match.id)))
                        }
                        active={Boolean(activeMatchIds?.has(match.id))}
                        roundToneClassName={roundToneClassName}
                        onTeamHover={setHoveredTeamId}
                        onTeamHoverEnd={() => setHoveredTeamId(undefined)}
                        onSaveResult={onSaveResult}
                        onClearResult={onClearResult}
                      />
                      {roundIndex < rounds.length - 1 && doesMatchAdvanceTeam(match, hoveredTeamId) ? (
                        <HoverPathLine side="right" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {!rounds.length ? (
            <div className="border border-dashed border-line bg-panel/70 p-6 text-sm font-semibold text-muted">
              아직 생성된 매치가 없습니다.
            </div>
          ) : null}
        </div>
      </div>
      )}
    </section>
  );
}

function SplitBranchRounds({
  rounds,
  actualRounds,
  teamsById,
  tone,
  progressiveTone,
  minHeight,
  scrollable,
  onSaveResult,
  onClearResult,
  activeMatchIds,
  hoveredTeamId,
  onTeamHover,
  onTeamHoverEnd
}: {
  rounds: ReturnType<typeof groupByRound>;
  actualRounds: ReturnType<typeof groupByRound>;
  teamsById: Map<string, Team>;
  tone: BracketLaneProps["tone"];
  progressiveTone: boolean;
  minHeight: string;
  scrollable: boolean;
  onSaveResult: BracketLaneProps["onSaveResult"];
  onClearResult: BracketLaneProps["onClearResult"];
  activeMatchIds?: Set<string>;
  hoveredTeamId?: string;
  onTeamHover: (teamId: string) => void;
  onTeamHoverEnd: () => void;
}) {
  const leafGap = 176;
  const cardWidth = 320;
  const columnGap = 112;
  const canvasHeight = Math.max(Number.parseInt(minHeight, 10) || 0, getRequiredCanvasHeight(rounds, leafGap));

  return (
    <div className={`${scrollable ? "overflow-x-auto" : "overflow-visible"} pb-4`}>
      <div
        className="relative min-w-max"
        style={{
          width: rounds.length * cardWidth + Math.max(0, rounds.length - 1) * columnGap,
          height: canvasHeight + 56
        }}
      >
        {rounds.map((round, roundIndex) => {
          const previousRound = actualRounds.find((item) => item.round === rounds[roundIndex - 1]?.round);
          const roundHasActiveMatch = round.matches.some((match) => activeMatchIds?.has(match.id));
          const locked =
            roundIndex > 0 &&
            Boolean(previousRound?.matches.some((match) => match.status !== "complete" && match.status !== "bye"));
          const isLastRound = rounds.length > 1 && roundIndex === rounds.length - 1;
          const roundLeft = roundIndex * (cardWidth + columnGap);
          const roundToneClassName = progressiveTone
            ? roundToneClass(tone, round.name, roundIndex, rounds.length)
            : toneClass(tone);

          return (
            <div
              key={round.key}
              className="absolute top-0"
              style={{ left: roundLeft, width: cardWidth, height: canvasHeight + 56 }}
            >
              <div
                className={`bracket-round-label ${roundHasActiveMatch ? "ring-2 ring-cyan shadow-[0_0_22px_rgba(47,230,255,0.28)]" : ""} ${roundToneClassName}`}
                style={{ width: cardWidth }}
              >
                {round.name}
              </div>

              {round.matches.map((match, matchIndex) => {
                const baseCenterY = getTreeCenterY(
                  matchIndex,
                  roundIndex,
                  leafGap,
                  canvasHeight,
                  isLastRound,
                  round.matches.length
                );
                const nextRound = rounds[roundIndex + 1];
                const nextCenterY =
                  nextRound && !isLastRound
                    ? getTreeCenterY(
                        Math.floor(matchIndex / 2),
                        roundIndex + 1,
                        leafGap,
                        canvasHeight,
                        rounds.length > 1 && roundIndex + 1 === rounds.length - 1,
                        nextRound.matches.length
                      )
                    : baseCenterY;
                const isOddCarryMatch =
                  nextRound &&
                  round.matches.length % 2 === 1 &&
                  matchIndex === round.matches.length - 1 &&
                  nextRound.matches.length === Math.ceil(round.matches.length / 2);
                const centerY = isOddCarryMatch ? nextCenterY : baseCenterY;
                const showLeftPath = roundIndex > 0 && doesMatchIncludeTeam(match, hoveredTeamId);
                const showRightPath = !isLastRound && doesMatchAdvanceTeam(match, hoveredTeamId);
                const connectorTop = Math.min(centerY, nextCenterY);
                const connectorHeight = Math.abs(nextCenterY - centerY);
                return (
                <div
                  key={match.id}
                  className="absolute left-0"
                  style={{
                    top: centerY + 56,
                    width: cardWidth,
                    transform: "translateY(-50%)"
                  }}
                >
                  {showLeftPath ? <HoverPathLine side="left" width={56} /> : null}
                  {showRightPath ? (
                    <>
                      <HoverPathLine side="right" width={56} />
                      {connectorHeight > 1 ? (
                        <div
                          className="pointer-events-none absolute hidden w-px bg-cyan shadow-[0_0_14px_rgba(47,230,255,0.65)] md:block"
                          style={{
                            right: -56,
                            top: connectorTop - centerY + 56,
                            height: Math.max(1, connectorHeight)
                          }}
                        />
                      ) : null}
                    </>
                  ) : null}
                  <MatchCard
                    match={match}
                    teamsById={teamsById}
                    locked={
                      match.status !== "complete" &&
                      (locked || Boolean(activeMatchIds && !activeMatchIds.has(match.id)))
                    }
                    active={Boolean(activeMatchIds?.has(match.id))}
                    roundToneClassName={roundToneClassName}
                    onTeamHover={onTeamHover}
                    onTeamHoverEnd={onTeamHoverEnd}
                    onSaveResult={onSaveResult}
                    onClearResult={onClearResult}
                  />
                </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HoverPathLine({ side, width = 40 }: { side: "left" | "right"; width?: number }) {
  return (
    <div
      className="pointer-events-none absolute top-1/2 z-20 hidden h-0.5 bg-cyan shadow-[0_0_14px_rgba(47,230,255,0.75)] md:block"
      style={{
        width,
        left: side === "left" ? -width : undefined,
        right: side === "right" ? -width : undefined
      }}
    />
  );
}

function doesMatchIncludeTeam(match: BracketStageMatch, teamId?: string) {
  if (!teamId) return false;
  return match.participantA?.teamId === teamId || match.participantB?.teamId === teamId;
}

function doesMatchAdvanceTeam(match: BracketStageMatch, teamId?: string) {
  if (!teamId) return false;
  if (match.winnerId === teamId) return true;
  return match.status === "bye" && match.participantA?.teamId === teamId;
}

function getRequiredCanvasHeight(rounds: ReturnType<typeof groupByRound>, leafGap: number) {
  const cardBreathingRoom = 136;
  const labelBreathingRoom = 72;
  const largestRoundSize = rounds.reduce((largest, round) => Math.max(largest, round.matches.length), 1);

  return Math.max(leafGap, largestRoundSize * leafGap + cardBreathingRoom + labelBreathingRoom);
}

function getTreeCenterY(
  matchIndex: number,
  roundIndex: number,
  leafGap: number,
  canvasHeight: number,
  isLastRound: boolean,
  matchCount = 1
) {
  void roundIndex;
  void leafGap;
  if (isLastRound && matchCount === 1) return canvasHeight / 2;
  const spacing = canvasHeight / Math.max(1, matchCount);
  return spacing / 2 + matchIndex * spacing;
}

export function groupByRound(matches: BracketStageMatch[]) {
  const roundMap = new Map<number, BracketStageMatch[]>();
  matches.forEach((match) => {
    const list = roundMap.get(match.round) ?? [];
    list.push(match);
    roundMap.set(match.round, list);
  });

  return Array.from(roundMap.entries())
    .sort(([roundA], [roundB]) => roundA - roundB)
    .map(([round, roundMatches]) => ({
      key: `${round}-${roundMatches[0]?.roundName ?? "round"}`,
      round,
      name: roundMatches[0]?.roundName ?? `Round ${round}`,
      matches: sortBracketMatches(roundMatches)
    }));
}

function fillSinglePathDisplayRounds(
  rounds: ReturnType<typeof groupByRound>,
  firstRoundMatchCount: number,
  title: string,
  expectedRoundCount?: number,
  expectedMatchCountsByRound?: Record<number, number>,
  padToTreeRounds = true
) {
  const actualMaxRound = rounds.length ? Math.max(...rounds.map((round) => round.round)) : 0;
  const treeRoundCount = Math.ceil(Math.log2(Math.max(1, firstRoundMatchCount))) + 1;
  const totalRounds = Math.max(1, padToTreeRounds ? treeRoundCount : 0, actualMaxRound, expectedRoundCount ?? 0);
  const roundMap = new Map(rounds.map((round) => [round.round, round]));
  const firstRoundName = rounds[0]?.name ?? title;
  const bracketGroup = rounds[0]?.matches[0]?.bracketGroup ?? "winners";

  return Array.from({ length: totalRounds }, (_, index) => {
    const round = index + 1;
    const existingRound = roundMap.get(round);
    const fallbackMatchCount = padToTreeRounds ? Math.ceil(firstRoundMatchCount / 2 ** index) : 0;
    const expectedMatchCount = Math.max(
      existingRound?.matches.length ? 1 : 0,
      expectedMatchCountsByRound?.[round] ?? fallbackMatchCount,
      existingRound?.matches.length ?? 0
    );
    const existingByNumber = new Map(existingRound?.matches.map((match) => [match.matchNumber, match]) ?? []);
    const matches = Array.from({ length: expectedMatchCount }, (_, matchIndex) => {
      const matchNumber = matchIndex + 1;
      return (
        existingByNumber.get(matchNumber) ?? {
          id: `placeholder-${title}-${round}-${matchNumber}`,
          round,
          roundName: existingRound?.name ?? roundNameFromBase(firstRoundName, round),
          matchNumber,
          status: "pending" as const,
          bracketGroup
        }
      );
    });

    return {
      key: existingRound?.key ?? `placeholder-${title}-${round}`,
      round,
      name: existingRound?.name ?? roundNameFromBase(firstRoundName, round),
      matches
    };
  });
}

function applyRoundNameOverrides(
  rounds: ReturnType<typeof groupByRound>,
  overrides: Record<number, string>
) {
  return rounds.map((round) => {
    const overrideName = overrides[round.round];
    if (!overrideName) return round;

    return {
      ...round,
      key: `${round.round}-${overrideName}`,
      name: overrideName,
      matches: round.matches.map((match) => ({
        ...match,
        roundName: overrideName
      }))
    };
  });
}

function roundNameFromBase(baseName: string, round: number) {
  return baseName.replace(/\d+\s*$/, `${round}`);
}

function toneClass(tone: BracketLaneProps["tone"]) {
  if (tone === "gold") return "bg-gold text-arena";
  if (tone === "cyan") return "bg-cyan text-arena";
  if (tone === "lime") return "bg-lime text-arena";
  if (tone === "white") return "bg-white text-slate-950";
  return "bg-danger text-white";
}

function roundToneClass(tone: BracketLaneProps["tone"], roundName: string, roundIndex = 0, totalRounds = 1) {
  const level = getRoundLevel(roundName, roundIndex, totalRounds);
  const toneClasses = {
    cyan: [
      "bg-cyan/70 text-arena",
      "bg-cyan/80 text-arena",
      "bg-cyan text-arena",
      "bg-cyan text-arena shadow-[0_0_20px_hsl(var(--cyan)/0.22)]"
    ],
    gold: [
      "bg-gold/65 text-arena",
      "bg-gold/75 text-arena",
      "bg-gold text-arena",
      "bg-gold text-arena shadow-[0_0_20px_hsl(var(--gold)/0.22)]"
    ],
    red: [
      "bg-danger/70 text-white",
      "bg-danger/80 text-white",
      "bg-danger text-white",
      "bg-danger text-white shadow-[0_0_20px_hsl(var(--danger)/0.22)]"
    ],
    lime: [
      "bg-lime/65 text-arena",
      "bg-lime/75 text-arena",
      "bg-lime text-arena",
      "bg-lime text-arena shadow-[0_0_20px_hsl(var(--lime)/0.22)]"
    ],
    white: [
      "bg-white/70 text-slate-950",
      "bg-white/80 text-slate-950",
      "bg-white text-slate-950",
      "bg-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.18)]"
    ]
  } satisfies Record<NonNullable<BracketLaneProps["tone"]>, string[]>;

  return toneClasses[tone ?? "red"][level];
}

function getRoundLevel(roundName: string, roundIndex: number, totalRounds: number) {
  if (/final/i.test(roundName)) return 3;
  if (/semifinal/i.test(roundName)) return 2;
  if (/quarterfinal/i.test(roundName)) return 1;
  if (/3rd/i.test(roundName)) return 1;
  if (/32|64|128/.test(roundName)) return 0;
  if (/16/.test(roundName)) return 1;
  if (roundIndex === totalRounds - 1) return 3;
  if (roundIndex === totalRounds - 2) return 2;
  if (roundIndex === totalRounds - 3) return 1;
  return 0;
}
