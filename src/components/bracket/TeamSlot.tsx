import clsx from "clsx";
import type { CSSProperties } from "react";
import { TeamLogo } from "@/components/teams/TeamLogo";
import {
  getTeamBracketAccentColor,
  getTeamReadableScoreTextColor,
  getTeamThemeTextColor,
  getTeamVictoryTextColor,
  getTeamWinnerAccentColor,
  getTeamWinnerColor
} from "@/lib/core/color";
import type { MatchParticipant, Team } from "@/lib/core/models";

type TeamSlotProps = {
  participant?: MatchParticipant;
  team?: Team;
  score?: number | string;
  isWinner?: boolean;
  editable?: boolean;
  disabled?: boolean;
  onScoreChange?: (score: string) => void;
};

export function TeamSlot({
  participant,
  team,
  score,
  isWinner,
  editable,
  disabled,
  onScoreChange
}: TeamSlotProps) {
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
        "grid h-11 grid-cols-[1fr_48px] items-stretch overflow-hidden border border-line bg-field text-ink transition",
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
      {editable ? (
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={score ?? ""}
          onChange={(event) => onScoreChange?.(event.target.value.replace(/[^0-9]/g, ""))}
          disabled={disabled || isBye || isPlaceholder}
          className={clsx(
            "relative z-10 h-full w-full border-0 bg-panel px-1 text-center text-sm font-black text-ink outline-none transition focus:bg-cyan/10 focus:text-cyan disabled:text-slate-500",
            isWinner && "bg-lime text-arena focus:bg-lime focus:text-arena",
            isPlaceholder && "bg-panel/40 text-cyan/50"
          )}
          style={scoreStyle}
          aria-label={`${label} score`}
        />
      ) : (
        <div
          className={clsx(
            "grid h-full place-items-center border-0 text-sm font-black",
            isWinner ? "bg-lime text-arena" : "bg-panel text-ink",
            isPlaceholder && "bg-panel/40 text-cyan/50"
          )}
          style={scoreStyle}
        >
          {isPlaceholder ? "" : score ?? "-"}
        </div>
      )}
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
      : `inset 5px 0 0 ${mix(stripColor, 70)}`
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
