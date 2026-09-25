"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function HeaderNav() {
  const links = [
    { href: "/maker", label: "브래킷" },
    { href: "/scoreboard", label: "스코어보드" },
    { href: "/teams", label: "팀" },
    { href: "/draw", label: "추첨" },
    { href: "/tier-list", label: "티어" },
    { href: "/saved-tournaments", label: "저장" },
    { href: "/login", label: "로그인" }
  ];

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 2xl:px-8">
      <Link href="/" className="text-lg font-black uppercase tracking-[0.18em] text-ink">
        Bracket Arena
      </Link>
      <nav className="flex flex-wrap items-center justify-end gap-1 text-sm font-bold uppercase tracking-wide">
        {links.map((link) => (
          <Link
            key={link.href}
            className="rounded-md border border-transparent px-2.5 py-2 text-ink/75 transition hover:border-cyan hover:bg-cyan/10 hover:text-cyan"
            href={link.href}
          >
            {link.label}
          </Link>
        ))}
        <ThemeToggle />
      </nav>
    </div>
  );
}
