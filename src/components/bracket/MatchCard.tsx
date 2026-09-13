"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { Dices, Trophy } from "lucide-react";
import clsx from "clsx";
import type { Match, MatchParticipant, Team } from "@/lib/core/models";
import { createRandomHeadToHeadScore } from "@/lib/core/randomResults";
import { TeamLogo } from "@/components/teams/TeamLogo";
import {
  getTeamBracketAccentColor,
  getTeamReadableScoreTextColor,
  getTeamThemeTextColor,
  getTeamVictoryTextColor,
  getTeamWinnerAccentColor,
  getTeamWinnerColor,
} from "@/lib/core/color";

type MatchCardProps = {
  match: Match;
  teamsById: Map<string, Team>;
  locked?: boolean;
  active?: boolean;
  roundToneClassName?: string;
  onSaveResult: (
    matchId: string,
    result: { scoreA?: number; scoreB?: number; winnerId: string }
  ) => void;
  onClearResult: (matchId: string) => void;
};

export function MatchCard({
  match,
  teamsById,
  locked = false,
  active = false,
  roundToneClassName,
  onSaveResult,
  onClearResult
}: MatchCardProps) {
  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const teamA = match.participantA?.teamId
    ? teamsById.get(match.participantA.teamId)
    : undefined;
  const teamB = match.participantB?.teamId
    ? teamsById.get(match.participantB.teamId)
    : undefined;
  const isLockedBye = match.status === "bye";
  const isLocked = locked || isLockedBye;
  const hasBothTeams = Boolean(teamA?.id && teamB?.id);

  useEffect(() => {
    if (inputARef.current && document.activeElement !== inputARef.current) {
      inputARef.current.value = match.scoreA?.toString() ?? "";
    }
    if (inputBRef.current && document.activeElement !== inputBRef.current) {
      inputBRef.current.value = match.scoreB?.toString() ?? "";
    }
  }, [match.id, match.scoreA, match.scoreB]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const scheduleAutoApply = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      if (!hasBothTeams || isLocked) return;

      const rawA = inputARef.current?.value ?? "";
      const rawB = inputBRef.current?.value ?? "";
      if (rawA === "" || rawB === "") {
        if (match.winnerId) onClearResult(match.id);
        return;
      }

      const scoreA = Number(rawA);
      const scoreB = Number(rawB);
      if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return;
      if (scoreA === scoreB) return;

      const winnerId = scoreA > scoreB ? teamA?.id : teamB?.id;
      if (!winnerId) return;
      if (match.scoreA === scoreA && match.scoreB === scoreB && match.winnerId === winnerId) return;

      onSaveResult(match.id, { scoreA, scoreB, winnerId });
    }, 350);
  };

  const autoFill = () => {
    if (!hasBothTeams || isLocked || !teamA?.id || !teamB?.id) return;
    const { scoreA, scoreB } = createRandomHeadToHeadScore();
    if (inputARef.current) inputARef.current.value = scoreA.toString();
    if (inputBRef.current) inputBRef.current.value = scoreB.toString();
    onSaveResult(match.id, {
      scoreA,
      scoreB,
      winnerId: scoreA > scoreB ? teamA.id : teamB.id
    });
  };

  return (
    <article
      className={clsx(
        "relative w-64 shrink-0 border border-line bg-panel shadow-panel",
        active && !isLocked && "ring-2 ring-cyan shadow-[0_0_26px_rgba(47,230,255,0.26)]",
        match.winnerId && "border-lime",
        locked && "opacity-60"
      )}
    >
      <div
        className={`flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
          roundToneClassName ?? roundHeaderClass(match.roundName)
        }`}
      >
        <span>M{match.matchNumber.toString().padStart(2, "0")}</span>
        <span className="truncate px-2">{match.roundName}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="grid h-5 w-5 place-items-center border border-black/15 bg-white/20 text-current transition hover:bg-white/35 disabled:cursor-not-allowed disabled:opacity-35"
            onClick={autoFill}
            disabled={!hasBothTeams || isLocked}
            title="이 매치 자동 결과"
          >
            <Dices className="h-3 w-3" aria-hidden="true" />
          </button>
          {match.winnerId ? <Trophy className="h-3 w-3" aria-hidden="true" /> : null}
        </div>
      </div>

      <div className="space-y-px p-2">
        <BracketTeamRow
          participant={match.participantA}
          team={teamA}
          inputRef={inputARef}
          defaultScore={match.scoreA}
          isWinner={match.winnerId === teamA?.id}
          disabled={isLocked}
          onInput={scheduleAutoApply}
        />
        <BracketTeamRow
          participant={match.participantB}
          team={teamB}
          inputRef={inputBRef}
          defaultScore={match.scoreB}
          isWinner={match.winnerId === teamB?.id}
          disabled={isLocked}
          onInput={scheduleAutoApply}
        />
      </div>
    </article>
  );
}

function BracketTeamRow({
  participant,
  team,
  inputRef,
  defaultScore,
  isWinner,
  disabled,
  onInput
}: {
  participant?: MatchParticipant;
  team?: Team;
  inputRef: React.RefObject<HTMLInputElement | null>;
  defaultScore?: number;
  isWinner?: boolean;
  disabled?: boolean;
  onInput: () => void;
}) {
  const isBye = participant?.isBye;
  const isPlaceholder = !isBye && !team;
  const label = isBye ? "BYE" : team?.shortName || team?.name || "TBD";
  const teamStyle = getTeamAccentStyle(team, isWinner);
  const rowStyle = getTeamWinnerRowStyle(team, isWinner);
  const scoreStyle = isWinner && team ? getWinnerScoreStyle(team) : undefined;
  const textStyle = getTeamTextStyle(team, isWinner);

  return (
    <div
      className={clsx(
        "grid h-11 grid-cols-[1fr_52px] items-stretch overflow-hidden border border-line bg-field text-ink transition",
        isWinner && "shadow-[0_0_24px_rgba(47,230,255,0.14)]",
        isBye && "border-dashed opacity-70",
        isPlaceholder && "border-dashed border-cyan/25 bg-cyan/5 text-cyan/80"
      )}
      style={rowStyle}
    >
      <div
        className={clsx(
          "flex min-w-0 items-center gap-2 px-2 transition",
          isWinner && "shadow-[0_0_18px_rgba(47,230,255,0.18)]",
          isPlaceholder && "bg-cyan/5"
        )}
        style={teamStyle}
      >
        {isPlaceholder ? (
          <TbdMark />
        ) : (
          <TeamLogo team={team} size="sm" highlighted={isWinner} useVictoryLogo={isWinner} />
        )}
        <div className="min-w-0">
          <div
            className={clsx("truncate text-xs font-black uppercase tracking-wide", isPlaceholder && "text-cyan")}
            style={textStyle}
          >
            {label}
          </div>
          {team?.shortName ? (
            <div className="truncate text-[10px] font-bold" style={textStyle}>{team.name}</div>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        defaultValue={defaultScore ?? ""}
        disabled={disabled || isBye || isPlaceholder}
        onInput={(event) => {
          const input = event.currentTarget;
          input.value = input.value.replace(/[^0-9]/g, "");
          onInput();
        }}
        className={clsx(
          "h-full w-full border-0 bg-panel px-1 text-center text-base font-black text-ink outline-none transition focus:bg-cyan/10 focus:text-cyan disabled:text-slate-500",
          isWinner && "bg-lime text-arena focus:bg-lime focus:text-arena",
          isPlaceholder && "bg-panel/40 text-cyan/50"
        )}
        style={scoreStyle}
        aria-label={`${label} score`}
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

function getTeamAccentStyle(team?: Team, isWinner?: boolean): CSSProperties | undefined {
  if (!team?.primaryColor) return undefined;
  const primary = getTeamWinnerColor(team) ?? team.primaryColor;
  const stripColor = (isWinner ? getTeamWinnerAccentColor(team) : getTeamBracketAccentColor(team)) ?? primary;

  return {
    background: isWinner ? primary : undefined,
    boxShadow: isWinner
      ? `0 0 26px ${mix(primary, 52)}, inset 0 0 0 1px ${mix(primary, 88)}, inset 5px 0 0 ${stripColor}`
      : `inset 5px 0 0 ${mix(stripColor, 82)}`
  };
}

function getTeamWinnerRowStyle(team?: Team, isWinner?: boolean): CSSProperties | undefined {
  if (!isWinner || !team) return undefined;
  const primary = getTeamWinnerColor(team) ?? team.primaryColor ?? "hsl(var(--cyan))";
  const stripColor = getTeamWinnerAccentColor(team) ?? primary;

  return {
    borderColor: primary,
    background: primary,
    boxShadow: `0 0 32px ${mix(primary, 58)}, inset 0 0 0 1px ${mix(primary, 86)}, inset 5px 0 0 ${stripColor}`
  };
}

function getWinnerScoreStyle(team: Team): CSSProperties {
  const primary = getTeamWinnerColor(team) ?? "hsl(var(--lime))";
  return {
    background: primary,
    color: getTeamReadableScoreTextColor(team)
  };
}

function getTeamTextStyle(team?: Team, isWinner?: boolean): CSSProperties | undefined {
  const color = isWinner ? getTeamVictoryTextColor(team) || getTeamThemeTextColor(team) : getTeamThemeTextColor(team);
  return color ? { color } : undefined;
}

function mix(color: string, amount: number) {
  return `color-mix(in srgb, ${color} ${amount}%, transparent)`;
}

function roundHeaderClass(roundName: string) {
  if (/3rd/i.test(roundName)) return "bg-panel text-ink";
  if (/final/i.test(roundName)) return "bg-gold text-arena";
  if (/semifinal/i.test(roundName)) return "bg-lime text-arena";
  if (/quarterfinal/i.test(roundName)) return "bg-cyan text-arena";
  if (/16/.test(roundName)) return "bg-magenta text-white";
  if (/32/.test(roundName)) return "bg-danger text-white";
  if (/64|128/.test(roundName)) return "bg-white text-slate-950";
  return "bg-danger text-white";
}
