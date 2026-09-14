"use client";

import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { resolveStoredLogo } from "@/lib/browser/logoStorage";
import type { Team } from "@/lib/core/models";
import { getTeamInitial } from "@/lib/core/team";

type TeamLogoProps = {
  team?: Team;
  size?: "sm" | "md" | "lg";
  highlighted?: boolean;
  useVictoryLogo?: boolean;
  variant?: "default" | "light" | "dark" | "auto";
};

const sizeClass = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16"
};

export function TeamLogo({
  team,
  size = "md",
  highlighted,
  useVictoryLogo,
  variant = "auto"
}: TeamLogoProps) {
  const [activeVariant, setActiveVariant] = useState<"default" | "light" | "dark">("dark");
  const [resolvedLogo, setResolvedLogo] = useState("");

  useEffect(() => {
    if (variant !== "auto") {
      setActiveVariant(variant);
      return;
    }

    const resolveTheme = () => {
      const root = document.documentElement;
      const explicit = root.dataset.theme;
      if (explicit === "light" || explicit === "dark") return explicit;
      if (root.classList.contains("light")) return "light";
      if (root.classList.contains("dark")) return "dark";
      return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
    };

    setActiveVariant(resolveTheme());
    const observer = new MutationObserver(() => setActiveVariant(resolveTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => observer.disconnect();
  }, [variant]);

  const logoCandidates = useMemo(
    () => getLogoCandidatesForVariant(team, activeVariant, useVictoryLogo),
    [activeVariant, team, useVictoryLogo]
  );
  const logo = logoCandidates[0];
  const isVictoryLogo = Boolean(
    useVictoryLogo &&
      logo &&
      [team?.logoVictory, team?.logoVictoryLight, team?.logoVictoryDark].some((victoryLogo) => victoryLogo && victoryLogo === logo)
  );

  useEffect(() => {
    let cancelled = false;
    if (!logoCandidates.length) {
      setResolvedLogo("");
      return;
    }

    setResolvedLogo("");
    Promise.all(logoCandidates.map((candidate) => resolveStoredLogo(candidate)))
      .then((resolvedLogos) => {
        if (!cancelled) setResolvedLogo(resolvedLogos.find(Boolean) ?? "");
      })
      .catch(() => {
        if (!cancelled) setResolvedLogo("");
      });

    return () => {
      cancelled = true;
    };
  }, [logoCandidates]);

  if (resolvedLogo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedLogo}
        alt={`${team?.name ?? "Team"} logo`}
        className={clsx(
          sizeClass[size],
          "shrink-0 bg-transparent object-contain object-center p-0.5",
          isVictoryLogo && "rounded-sm",
          highlighted && "drop-shadow-[0_0_10px_rgba(47,230,255,0.55)]"
        )}
      />
    );
  }

  return (
    <div
      className={clsx(
        sizeClass[size],
        "grid shrink-0 place-items-center rounded-full bg-cyan/10 text-cyan",
        highlighted && "bg-cyan text-arena shadow-glow"
      )}
      aria-label={team ? `${team.name} placeholder logo` : "Empty team placeholder logo"}
    >
      <span className="text-sm font-black uppercase tracking-wide">{getTeamInitial(team)}</span>
    </div>
  );
}

function getLogoCandidatesForVariant(team: Team | undefined, variant: "default" | "light" | "dark", useVictoryLogo?: boolean) {
  if (!team) return [];

  const candidates = useVictoryLogo
    ? variant === "light"
      ? [team.logoVictoryLight, team.logoVictory, team.logoDefault, team.logoLight, team.logoDark]
      : variant === "dark"
        ? [team.logoVictoryDark, team.logoVictory, team.logoDefault, team.logoDark, team.logoLight]
        : [team.logoVictory, team.logoDefault, team.logoVictoryDark, team.logoVictoryLight, team.logoDark, team.logoLight]
    : variant === "light"
      ? [team.logoLight, team.logoDefault, team.logoDark]
      : variant === "dark"
        ? [team.logoDark, team.logoDefault, team.logoLight]
        : [team.logoDefault, team.logoDark, team.logoLight];

  return candidates.filter((candidate): candidate is string => Boolean(candidate));
}
