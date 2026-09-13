"use client";

import { Copy, Edit3, Trash2 } from "lucide-react";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { getTeamThemePrimaryColor, getTeamThemeTextColor } from "@/lib/core/color";
import type { Team } from "@/lib/core/models";

type TeamCardProps = {
  team: Team;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
};

export function TeamCard({ team, onEdit, onDelete, onDuplicate }: TeamCardProps) {
  const primaryColor = getTeamThemePrimaryColor(team) ?? "#2fe6ff";
  const textColor = getTeamThemeTextColor(team);

  return (
    <article className="arena-card overflow-hidden p-4">
      <div
        className="mb-4 h-1 rounded-full"
        style={{
          background: primaryColor
        }}
      />
      <div className="flex items-center gap-3">
        <TeamLogo team={team} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-black uppercase tracking-wide text-ink" style={textColor ? { color: textColor } : undefined}>{team.shortName || team.name}</h3>
          <p className="truncate text-sm text-muted">{team.name}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="button-muted flex-1 justify-center" onClick={onEdit}>
          <Edit3 className="h-4 w-4" />
          수정
        </button>
        {onDuplicate ? (
          <button className="icon-button h-10 w-10" onClick={onDuplicate} title="복제">
            <Copy className="h-4 w-4" />
          </button>
        ) : null}
        <button className="icon-button h-10 w-10 hover:border-danger hover:text-danger" onClick={onDelete} title="팀 삭제">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
