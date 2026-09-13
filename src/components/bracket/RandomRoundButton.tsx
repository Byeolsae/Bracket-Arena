"use client";

import { Dices } from "lucide-react";

type RandomRoundButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  title?: string;
};

export function RandomRoundButton({
  onClick,
  disabled,
  label = "현재 라운드 자동",
  title = "현재 진행 가능한 라운드의 빈 매치만 랜덤 입력"
}: RandomRoundButtonProps) {
  return (
    <button
      type="button"
      className="inline-flex h-9 items-center gap-2 rounded-md border border-cyan/45 bg-cyan/10 px-3 text-[11px] font-black uppercase tracking-[0.08em] text-cyan transition hover:bg-cyan hover:text-arena disabled:cursor-not-allowed disabled:opacity-40"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      <Dices className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
