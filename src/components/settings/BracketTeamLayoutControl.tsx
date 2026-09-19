"use client";

import { Grid2X2, Rows3 } from "lucide-react";
import clsx from "clsx";
import { useUiStore, type BracketTeamLayout } from "@/store/uiStore";

const layoutOptions: Array<{
  value: BracketTeamLayout;
  label: string;
  title: string;
  icon: typeof Rows3;
}> = [
  {
    value: "detail",
    label: "상세",
    title: "로고, 약칭, 팀명을 함께 표시",
    icon: Rows3
  },
  {
    value: "logo",
    label: "로고",
    title: "로고만 네모 칸으로 표시",
    icon: Grid2X2
  }
];

export function BracketTeamLayoutControl() {
  const bracketTeamLayout = useUiStore((state) => state.bracketTeamLayout);
  const setBracketTeamLayout = useUiStore((state) => state.setBracketTeamLayout);

  return (
    <div className="flex items-center gap-1 rounded-md border border-line bg-field p-1">
      {layoutOptions.map((option) => {
        const Icon = option.icon;
        const active = bracketTeamLayout === option.value;

        return (
          <button
            key={option.value}
            type="button"
            className={clsx(
              "inline-flex h-8 items-center gap-1 rounded px-2 text-[10px] font-black uppercase tracking-wide transition",
              active ? "bg-cyan text-arena" : "text-muted hover:bg-panel hover:text-ink"
            )}
            onClick={() => setBracketTeamLayout(option.value)}
            title={option.title}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
