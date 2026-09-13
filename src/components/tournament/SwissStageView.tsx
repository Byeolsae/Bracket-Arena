"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import clsx from "clsx";
import { Dices } from "lucide-react";
import type { SwissMatch, SwissStage, Team } from "@/lib/core/models";
import {
  applySwissMatchResult,
  generateNextSwissRound,
  getRankedSwissRecords,
  getSwissAdvancingTeams
} from "@/lib/core/swiss";
import { createRandomHeadToHeadScore } from "@/lib/core/randomResults";
import {
  getTeamBracketAccentColor,
  getTeamReadableScoreTextColor,
  getTeamThemePrimaryColor,
  getTeamThemeTextColor,
  getTeamVictoryTextColor,
  getTeamWinnerAccentColor,
  getTeamWinnerColor
} from "@/lib/core/color";
import { BracketZoomControls } from "@/components/bracket/BracketZoomControls";
import { RandomRoundButton } from "@/components/bracket/RandomRoundButton";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { SwissStandingsTable } from "@/components/tournament/SwissStandingsTable";

type SwissStageViewProps = {
  stage: SwissStage;
  teams: Team[];
  onChange?: (stage: SwissStage) => void;
};

export function SwissStageView({ stage, teams, onChange }: SwissStageViewProps) {
  const [localStage, setLocalStage] = useState(stage);
  const [zoom, setZoom] = useState(1);
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const records = getRankedSwissRecords(localStage);
  const advancingIds = getSwissAdvancingTeams(localStage, teams).map((team) => team.id);

  const commit = (nextStage: SwissStage) => {
    setLocalStage(nextStage);
    onChange?.(nextStage);
  };

  const updateResult = (
    matchId: string,
    scoreA?: number,
    scoreB?: number,
    winnerId?: string,
    isDraw?: boolean
  ) => {
    const nextStage = applySwissMatchResult(localStage, matchId, scoreA, scoreB, winnerId, isDraw);
    commit(maybeAdvanceSwissRound(nextStage));
  };

  const autoFillMatch = (match: SwissMatch) => {
    if (match.isBye || !match.teamAId || !match.teamBId) return;
    const { scoreA, scoreB } = createRandomHeadToHeadScore({
      allowDraw: localStage.config.allowDraw
    });
    const winnerId = scoreA === scoreB ? undefined : scoreA > scoreB ? match.teamAId : match.teamBId;
    updateResult(match.id, scoreA, scoreB, winnerId, scoreA === scoreB);
  };

  const autoFillCurrentRound = () => {
    const fillTarget = getSwissFillTarget(localStage);
    if (!fillTarget.matches.length) return;

    const nextStage = fillTarget.matches.reduce((stage, match) => {
      if (match.isBye || !match.teamAId || !match.teamBId || match.status === "complete") return stage;
      const { scoreA, scoreB } = createRandomHeadToHeadScore({
        allowDraw: stage.config.allowDraw
      });
      const winnerId = scoreA === scoreB ? undefined : scoreA > scoreB ? match.teamAId : match.teamBId;
      return applySwissMatchResult(stage, match.id, scoreA, scoreB, winnerId, scoreA === scoreB);
    }, fillTarget.stage);

    commit(maybeAdvanceSwissRound(nextStage));
  };

  return (
    <section className="space-y-5">
      {localStage.warnings?.length ? (
        <div className="rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-semibold text-ink">
          {localStage.warnings.join(" ")}
        </div>
      ) : null}

      <div className="bracket-board">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-arena/85 px-5 py-4">
          <div>
            <p className="section-kicker">Swiss Bracket</p>
            <h2 className="text-2xl font-black uppercase tracking-wide text-ink">Record Flow Board</h2>
          </div>
          <BracketZoomControls
            zoom={zoom}
            onChange={setZoom}
            actions={
              <RandomRoundButton
                onClick={autoFillCurrentRound}
                disabled={localStage.isComplete}
                label="현재 라운드 랜덤"
                title="현재 라운드의 비어 있는 매치만 랜덤 입력"
              />
            }
          />
        </div>
        <div className="bracket-board-inner">
          <SwissBracketBoard
            swiss={localStage}
            teamsById={teamsById}
            records={records}
            zoom={zoom}
            onApplyResult={updateResult}
            onRandomMatch={autoFillMatch}
          />
        </div>
      </div>

      <SwissStandingsTable records={records} teamsById={teamsById} advancingTeamIds={advancingIds} />
    </section>
  );
}

function SwissBracketBoard({
  swiss,
  teamsById,
  records,
  zoom,
  onApplyResult,
  onRandomMatch
}: {
  swiss: SwissStage;
  teamsById: Map<string, Team>;
  records: ReturnType<typeof getRankedSwissRecords>;
  zoom: number;
  onApplyResult: (matchId: string, scoreA?: number, scoreB?: number, winnerId?: string, isDraw?: boolean) => void;
  onRandomMatch: (match: SwissMatch) => void;
}) {
  const roundBuckets = Array.from({ length: swiss.currentRound }, (_, index) => {
    const round = index + 1;
    const matches = swiss.matches.filter((match) => match.round === round);
    const buckets = new Map<string, SwissMatch[]>();
    matches.forEach((match) => {
      const key = getMatchRecordBeforeRound(swiss, match);
      buckets.set(key, [...(buckets.get(key) ?? []), match]);
    });
    return {
      round,
      buckets: getSwissRecordKeysForRound(round)
        .filter((key) => buckets.has(key))
        .map((key) => [key, buckets.get(key) ?? []] as const)
    };
  });
  const qualified = records.filter((record) => record.status === "advanced");
  const eliminated = records.filter((record) => record.status === "eliminated");
  const middleIndex = (roundBuckets.length - 1) / 2;

  return (
    <div className="max-h-[76vh] overflow-auto rounded-md border border-cyan/20 bg-arena/95 pb-6 shadow-inner">
      <div
        className="flex min-w-max origin-top-left items-stretch gap-16 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:40px_40px] p-10 transition-transform duration-150"
        style={{
          transform: `scale(${zoom})`,
          width: `${100 / zoom}%`
        }}
      >
        {roundBuckets.map(({ round, buckets }, roundIndex) => {
          const convergenceOffset = Math.abs(roundIndex - middleIndex) * 28;

          return (
            <div
              key={round}
              className="relative flex min-h-[720px] w-64 shrink-0 flex-col"
            >
              <div className={clsx("bracket-round-label h-8 text-[11px] text-arena shadow-[0_12px_30px_rgba(0,0,0,0.2)]", roundTone(round, swiss.currentRound))}>
                Round {round}
              </div>
              <div
                className="mt-7 flex flex-1 flex-col justify-center gap-8"
                style={{ paddingTop: convergenceOffset, paddingBottom: convergenceOffset }}
              >
                {buckets.map(([recordKey, matches]) => (
                  <div key={`${round}-${recordKey}`} className="relative w-64">
                    <div className={clsx("bracket-round-label h-6 text-[10px] text-arena", bucketTone(recordKey))}>
                      {recordKey}
                    </div>
                    <div className="space-y-3 border border-t-0 border-line/80 bg-panel/90 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                      {matches.map((match) => (
                        <SwissMiniMatch
                          key={match.id}
                          match={match}
                          teamsById={teamsById}
                          allowDraw={swiss.config.allowDraw}
                          onApply={(scoreA, scoreB, winnerId, isDraw) =>
                            onApplyResult(match.id, scoreA, scoreB, winnerId, isDraw)
                          }
                          onRandom={() => onRandomMatch(match)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="flex min-h-[720px] w-72 shrink-0 flex-col justify-center gap-7">
          <SwissOutcomeColumn title="Qualified" tone="bg-lime" records={qualified} teamsById={teamsById} />
          <SwissOutcomeColumn title="Eliminated" tone="bg-danger" records={eliminated} teamsById={teamsById} />
        </div>
      </div>
    </div>
  );
}

function SwissMiniMatch({
  match,
  teamsById,
  allowDraw,
  onApply,
  onRandom
}: {
  match: SwissMatch;
  teamsById: Map<string, Team>;
  allowDraw: boolean;
  onApply: (scoreA?: number, scoreB?: number, winnerId?: string, isDraw?: boolean) => void;
  onRandom: () => void;
}) {
  const teamA = match.teamAId ? teamsById.get(match.teamAId) : undefined;
  const teamB = match.teamBId ? teamsById.get(match.teamBId) : undefined;
  const [left, setLeft] = useState(match.scoreA?.toString() ?? "");
  const [right, setRight] = useState(match.scoreB?.toString() ?? "");

  useEffect(() => {
    setLeft(match.scoreA?.toString() ?? "");
    setRight(match.scoreB?.toString() ?? "");
  }, [match.id, match.scoreA, match.scoreB]);

  useEffect(() => {
    if (match.isBye || left === "" || right === "") return;
    const scoreA = Number(left);
    const scoreB = Number(right);
    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return;
    if (scoreA === scoreB && !allowDraw) return;
    const winnerId = scoreA === scoreB ? undefined : scoreA > scoreB ? teamA?.id : teamB?.id;
    if (match.scoreA === scoreA && match.scoreB === scoreB && match.winnerId === winnerId) return;
    const timer = window.setTimeout(() => onApply(scoreA, scoreB, winnerId, scoreA === scoreB), 180);
    return () => window.clearTimeout(timer);
  }, [allowDraw, left, match.id, match.isBye, match.scoreA, match.scoreB, match.winnerId, onApply, right, teamA?.id, teamB?.id]);

  if (match.isBye) {
    const byeTextStyle = getTeamTextStyle(teamA);
    return (
      <article className="relative w-64 overflow-hidden border border-lime bg-panel shadow-panel">
        <div className="flex h-7 items-center justify-between bg-lime px-2 text-[10px] font-black uppercase tracking-wider text-arena">
          <span>M{match.matchNumber.toString().padStart(2, "0")}</span>
          <span className="truncate px-2">Round {match.round}</span>
          <span>BYE</span>
        </div>
        <div className="p-2">
          <div className="grid h-11 grid-cols-[1fr_52px] items-stretch overflow-hidden border border-lime/60 bg-lime/10 text-ink shadow-[0_0_24px_rgba(130,255,49,0.12)]">
            <div className="flex min-w-0 items-center gap-2 px-2">
              <TeamLogo team={teamA} size="sm" highlighted />
              <div className="min-w-0">
                <div className="truncate text-xs font-black uppercase tracking-wide text-ink" style={byeTextStyle}>
                  {teamA?.shortName || teamA?.name || "TBD"}
                </div>
                {teamA?.shortName ? (
                  <div className="truncate text-[10px] font-bold" style={byeTextStyle}>{teamA.name}</div>
                ) : null}
              </div>
            </div>
            <div className="grid place-items-center bg-lime text-xs font-black text-arena">BYE</div>
          </div>
        </div>
      </article>
    );
  }

  const completedWithWinner = Boolean(match.winnerId);

  return (
    <article
      className={clsx(
        "relative w-64 overflow-hidden border border-line bg-panel shadow-panel",
        completedWithWinner && "border-lime"
      )}
    >
      <div className="flex h-7 items-center justify-between bg-danger px-2 text-[10px] font-black uppercase tracking-wider text-white">
        <span>M{match.matchNumber.toString().padStart(2, "0")}</span>
        <span className="truncate px-2">Round {match.round}</span>
        <button
          type="button"
          className="grid h-5 w-5 place-items-center border border-black/15 bg-white/20 text-current transition hover:bg-white/35 disabled:cursor-not-allowed disabled:opacity-35"
          onClick={onRandom}
          title="매치 랜덤 점수"
          disabled={match.isBye || !teamA || !teamB}
        >
          <Dices className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
      <div className="space-y-px p-2">
        <SwissMiniTeam
          team={teamA}
          active={match.winnerId === teamA?.id}
          dimmed={Boolean(completedWithWinner && teamA?.id && match.winnerId !== teamA.id)}
          value={left}
          onChange={setLeft}
        />
        <SwissMiniTeam
          team={teamB}
          active={match.winnerId === teamB?.id}
          dimmed={Boolean(completedWithWinner && teamB?.id && match.winnerId !== teamB.id)}
          value={right}
          onChange={setRight}
        />
      </div>
    </article>
  );
}

function SwissMiniTeam({
  team,
  active,
  dimmed,
  value,
  onChange
}: {
  team?: Team;
  active?: boolean;
  dimmed?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const isPlaceholder = !team;
  const teamStyle = active ? getTeamAccentStyle(team) : getSwissTeamIdleStyle(team);
  const scoreStyle = active ? getScoreInputStyle(team) : undefined;
  const textStyle = getTeamTextStyle(team, active);

  return (
    <div
      className={clsx(
        "grid h-11 grid-cols-[1fr_52px] items-stretch overflow-hidden border border-line bg-field text-ink transition",
        active && "shadow-[0_0_24px_rgba(47,230,255,0.14)]",
        dimmed && "opacity-55 saturate-75",
        isPlaceholder && "border-dashed border-cyan/25 bg-cyan/5 text-cyan/80"
      )}
    >
      <div
        className={clsx(
          "flex min-w-0 items-center gap-2 px-2 transition",
          active && "shadow-[0_0_18px_rgba(47,230,255,0.18)]",
          isPlaceholder && "bg-cyan/5"
        )}
        style={teamStyle}
      >
        {isPlaceholder ? <TbdMark /> : <TeamLogo team={team} size="sm" highlighted={active} useVictoryLogo={active} />}
        <div className="min-w-0">
          <div className={clsx("truncate text-xs font-black uppercase tracking-wide", isPlaceholder && "text-cyan")} style={textStyle}>
            {team?.shortName || team?.name || "TBD"}
          </div>
          {team?.shortName ? (
            <div className="truncate text-[10px] font-bold" style={textStyle}>{team.name}</div>
          ) : null}
        </div>
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, ""))}
        className={clsx(
          "h-full w-full border-0 bg-panel px-1 text-center text-base font-black text-ink outline-none transition focus:bg-cyan/10 focus:text-cyan disabled:text-slate-500",
          active && "bg-lime text-arena focus:bg-lime focus:text-arena",
          isPlaceholder && "bg-panel/40 text-cyan/50"
        )}
        disabled={isPlaceholder}
        inputMode="numeric"
        aria-label={`${team?.shortName || team?.name || "TBD"} score`}
        style={scoreStyle}
      />
    </div>
  );
}

function TbdMark() {
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyan/15 text-[11px] font-black text-cyan shadow-[0_0_18px_rgba(47,230,255,0.18)]">
      ?
    </span>
  );
}

function getSwissFillTarget(stage: SwissStage): { stage: SwissStage; matches: SwissMatch[] } {
  const currentOpenMatches = stage.matches.filter(
    (match) =>
      match.round === stage.currentRound &&
      !match.isBye &&
      match.teamAId &&
      match.teamBId &&
      match.status !== "complete"
  );

  if (currentOpenMatches.length) {
    return { stage, matches: currentOpenMatches };
  }

  const currentPlayableMatches = stage.matches.filter(
    (match) => match.round === stage.currentRound && !match.isBye && match.teamAId && match.teamBId
  );
  const currentRoundDone =
    stage.currentRound === 0 || currentPlayableMatches.every((match) => match.status === "complete");

  if (!stage.isComplete && currentRoundDone && stage.currentRound < stage.config.maxRounds) {
    const nextStage = generateNextSwissRound(stage);
    return {
      stage: nextStage,
      matches: nextStage.matches.filter(
        (match) =>
          match.round === nextStage.currentRound &&
          !match.isBye &&
          match.teamAId &&
          match.teamBId &&
          match.status !== "complete"
      )
    };
  }

  return { stage, matches: [] };
}

function maybeAdvanceSwissRound(stage: SwissStage) {
  if (stage.isComplete || stage.currentRound >= stage.config.maxRounds) return stage;

  const currentPlayableMatches = stage.matches.filter(
    (match) => match.round === stage.currentRound && !match.isBye && match.teamAId && match.teamBId
  );

  if (!currentPlayableMatches.length) return stage;

  const currentRoundDone = currentPlayableMatches.every((match) => match.status === "complete");
  return currentRoundDone ? generateNextSwissRound(stage) : stage;
}

function SwissOutcomeColumn({
  title,
  tone,
  records,
  teamsById
}: {
  title: string;
  tone: string;
  records: ReturnType<typeof getRankedSwissRecords>;
  teamsById: Map<string, Team>;
}) {
  return (
    <div className="w-64 shrink-0">
      <div className={clsx("bracket-round-label h-7", tone, "text-arena")}>{title}</div>
      <div className="grid grid-cols-2 gap-2 border border-line bg-panel/80 p-2.5">
        {records.map((record) => {
          const team = teamsById.get(record.teamId);
          const textStyle = getTeamTextStyle(team);
          return (
            <div key={record.teamId} className="flex items-center gap-2 border border-line bg-field p-1.5">
              <TeamLogo team={team} size="sm" highlighted={title === "Qualified"} />
              <span className="truncate text-xs font-black uppercase text-ink" style={textStyle}>
                {team?.shortName || team?.name || "TBD"}
              </span>
            </div>
          );
        })}
        {!records.length ? <div className="col-span-2 py-6 text-center text-xs font-bold text-slate-500">Waiting</div> : null}
      </div>
    </div>
  );
}

function getSwissRecordKeysForRound(round: number) {
  const playedRounds = Math.max(0, round - 1);
  return Array.from({ length: playedRounds + 1 }, (_, losses) => {
    const wins = playedRounds - losses;
    return `${wins}-${losses}`;
  });
}

function bucketTone(recordKey: string) {
  const [wins, losses] = recordKey.split("-").map(Number);
  if (wins > losses) return "bg-lime";
  if (losses > wins) return "bg-danger";
  if (wins === 0 && losses === 0) return "bg-cyan";
  return "bg-gold";
}

function roundTone(round: number, currentRound: number) {
  if (round === currentRound) return "bg-cyan";
  if (round <= 1) return "bg-blue-500";
  if (round >= currentRound - 1) return "bg-gold";
  return "bg-lime";
}

function getTeamAccentStyle(team?: Team): CSSProperties | undefined {
  const primary = getTeamWinnerColor(team) ?? getTeamThemePrimaryColor(team);
  const stripColor = getTeamWinnerAccentColor(team) ?? getTeamBracketAccentColor(team) ?? primary;
  if (!primary) return undefined;

  return {
    borderColor: primary,
    background: primary,
    boxShadow: `0 0 30px ${mix(primary, 56)}, inset 0 0 0 1px ${mix(primary, 86)}, inset 5px 0 0 ${stripColor}`
  };
}

function getSwissTeamIdleStyle(team?: Team): CSSProperties | undefined {
  const stripColor = getTeamBracketAccentColor(team) ?? getTeamThemePrimaryColor(team);
  return stripColor ? { boxShadow: `inset 5px 0 0 ${mix(stripColor, 82)}` } : undefined;
}

function getScoreInputStyle(team?: Team): CSSProperties | undefined {
  const primary = getTeamWinnerColor(team) ?? getTeamThemePrimaryColor(team);
  if (!primary) return undefined;

  return {
    background: primary,
    borderColor: "transparent",
    color: getTeamReadableScoreTextColor(team)
  };
}

function getTeamTextStyle(team?: Team, active?: boolean): CSSProperties | undefined {
  const color = active ? getTeamVictoryTextColor(team) || getTeamThemeTextColor(team) : getTeamThemeTextColor(team);
  return color ? { color } : undefined;
}

function mix(color: string, amount: number) {
  return `color-mix(in srgb, ${color} ${amount}%, transparent)`;
}

function getMatchRecordBeforeRound(swiss: SwissStage, match: SwissMatch) {
  const teamId = match.teamAId || match.teamBId;
  if (!teamId) return "0-0";
  let wins = 0;
  let losses = 0;

  swiss.matches.forEach((candidate) => {
    if (candidate.round >= match.round || candidate.status !== "complete") return;
    if (candidate.teamAId !== teamId && candidate.teamBId !== teamId) return;
    if (candidate.winnerId === teamId) wins += 1;
    else if (candidate.winnerId) losses += 1;
  });

  return `${wins}-${losses}`;
}
