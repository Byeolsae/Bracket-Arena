"use client";

import type { ReactNode } from "react";
import { BracketTeamLayoutControl } from "@/components/settings/BracketTeamLayoutControl";
import { TeamDisplaySizeControl } from "@/components/settings/TeamDisplaySizeControl";

type BracketZoomControlsProps = {
  zoom: number;
  onChange: (zoom: number) => void;
  actions?: ReactNode;
};

export function BracketZoomControls({ zoom, onChange, actions }: BracketZoomControlsProps) {
  const setClampedZoom = (nextZoom: number) =>
    onChange(Math.min(2.25, Math.max(0.35, Number(nextZoom.toFixed(2)))));

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {actions}
      <BracketTeamLayoutControl />
      <TeamDisplaySizeControl />
      <div className="flex items-center overflow-hidden rounded-md border border-line bg-field">
        <button
          type="button"
          className="h-9 px-3 text-sm font-black text-ink transition hover:bg-panel"
          onClick={() => setClampedZoom(zoom - 0.15)}
        >
          -
        </button>
        <div className="min-w-16 border-x border-line px-3 text-center text-xs font-black text-muted">
          {Math.round(zoom * 100)}%
        </div>
        <button
          type="button"
          className="h-9 px-3 text-sm font-black text-ink transition hover:bg-panel"
          onClick={() => setClampedZoom(zoom + 0.15)}
        >
          +
        </button>
        <button
          type="button"
          className="h-9 border-l border-line px-3 text-xs font-black uppercase tracking-wide text-muted transition hover:bg-panel hover:text-ink"
          onClick={() => onChange(1)}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
