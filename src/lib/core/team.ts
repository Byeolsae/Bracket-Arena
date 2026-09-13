import type { Team } from "./models";

export function getTeamDisplayName(team?: Team): string {
  if (!team) return "미정";
  return team.shortName || team.name;
}

export function getTeamInitial(team?: Team): string {
  const source = team?.shortName || team?.name || "?";
  return source.trim().charAt(0).toUpperCase() || "?";
}

export function getTeamLogo(
  team: Team | undefined,
  mode: "light" | "dark" | "default" | "victory" | "victory-light" | "victory-dark" = "default"
): string | undefined {
  if (!team) return undefined;
  if (mode === "victory-light") {
    return team.logoVictoryLight || team.logoVictory || team.logoLight || team.logoDefault || team.logoDark;
  }
  if (mode === "victory-dark") {
    return team.logoVictoryDark || team.logoVictory || team.logoDark || team.logoDefault || team.logoLight;
  }
  if (mode === "victory") {
    return team.logoVictory || team.logoVictoryDark || team.logoVictoryLight || team.logoDefault || team.logoDark || team.logoLight;
  }
  if (mode === "light") return team.logoLight || team.logoDefault;
  if (mode === "dark") return team.logoDark || team.logoDefault;
  return team.logoDefault || team.logoDark || team.logoLight;
}

export function hasTeamIdentityConflict(a: Team, b: Team): boolean {
  return Boolean(
    a.id === b.id ||
      a.name.trim().toLowerCase() === b.name.trim().toLowerCase() ||
      (a.shortName &&
        b.shortName &&
        a.shortName.trim().toLowerCase() === b.shortName.trim().toLowerCase())
  );
}
