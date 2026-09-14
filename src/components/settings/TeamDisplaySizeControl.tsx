"use client";

import clsx from "clsx";
import { useUiStore, type TeamDisplaySize } from "@/store/uiStore";

const sizeLevels: TeamDisplaySize[] = [1, 2, 3, 4, 5];

export function TeamDisplaySizeControl() {
  const teamDisplaySize = useUiStore((state) => state.teamDisplaySize);
  const setTeamDisplaySize = useUiStore((state) => state.setTeamDisplaySize);

  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-field p-1">
      <span className="px-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted">크기</span>
      <div className="flex gap-1">
        {sizeLevels.map((level) => (
          <button
            key={level}
            type="button"
            className={clsx(
              "grid h-8 w-8 place-items-center rounded text-xs font-black transition",
              teamDisplaySize === level ? "bg-cyan text-arena" : "text-muted hover:bg-panel hover:text-ink"
            )}
            onClick={() => setTeamDisplaySize(level)}
            title={`팀 표시 크기 ${level}단계`}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}
