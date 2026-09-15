"use client";

import Link from "next/link";
import { LanguageSelect } from "@/components/theme/LanguageSelect";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useUiStore } from "@/store/uiStore";

const labels = {
  ko: {
    maker: "브래킷",
    teams: "팀 관리",
    tier: "티어리스트",
    draw: "추첨 및 참가팀 선택"
  },
  en: {
    maker: "Bracket",
    teams: "Teams",
    tier: "Tier List",
    draw: "Draw & Teams"
  },
  ja: {
    maker: "ブラケット",
    teams: "チーム管理",
    tier: "ティアリスト",
    draw: "抽選・参加チーム"
  }
};

export function HeaderNav() {
  const language = useUiStore((state) => state.language);
  const text = labels[language];

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 2xl:px-8">
      <Link href="/" className="text-lg font-black uppercase tracking-[0.18em] text-ink">
        Bracket Arena
      </Link>
      <nav className="flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-wide">
        <Link className="rounded-md border border-transparent px-3 py-2 text-ink/75 hover:border-cyan hover:text-cyan" href="/maker">
          {text.maker}
        </Link>
        <Link className="rounded-md border border-transparent px-3 py-2 text-ink/75 hover:border-cyan hover:text-cyan" href="/teams">
          {text.teams}
        </Link>
        <Link className="rounded-md border border-transparent px-3 py-2 text-ink/75 hover:border-cyan hover:text-cyan" href="/tier-list">
          {text.tier}
        </Link>
        <Link className="rounded-md border border-transparent px-3 py-2 text-ink/75 hover:border-cyan hover:text-cyan" href="/draw">
          {text.draw}
        </Link>
        <LanguageSelect />
        <ThemeToggle />
      </nav>
    </div>
  );
}
