"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function HeaderNav() {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 2xl:px-8">
      <Link href="/" className="text-lg font-black uppercase tracking-[0.18em] text-ink">
        Bracket Arena
      </Link>
      <nav className="flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-wide">
        <Link className="rounded-md border border-transparent px-3 py-2 text-ink/75 hover:border-cyan hover:text-cyan" href="/maker">
          브래킷
        </Link>
        <Link className="rounded-md border border-transparent px-3 py-2 text-ink/75 hover:border-cyan hover:text-cyan" href="/teams">
          팀 관리
        </Link>
        <Link className="rounded-md border border-transparent px-3 py-2 text-ink/75 hover:border-cyan hover:text-cyan" href="/tier-list">
          티어리스트
        </Link>
        <Link className="rounded-md border border-transparent px-3 py-2 text-ink/75 hover:border-cyan hover:text-cyan" href="/draw">
          추첨 및 참가팀 선택
        </Link>
        <ThemeToggle />
      </nav>
    </div>
  );
}
