import type { Team } from "./models";

const lightReadable = "#111827";
const darkReadable = "#ffffff";

export function getThemeAwareSingleColor(primary?: string): string | undefined {
  if (!primary) return undefined;
  if (!isNearBlackOrWhite(primary)) return primary;
  return `light-dark(${lightReadable}, ${darkReadable})`;
}

export function getTeamThemePrimaryColor(team?: Team): string | undefined {
  if (!team?.primaryColor) return undefined;
  const light = team.primaryColorLight ?? team.primaryColor;
  const dark = team.primaryColorDark ?? team.primaryColor;
  const hasThemeOverride = Boolean(team.primaryColorLight || team.primaryColorDark);
  if (hasThemeOverride) return `light-dark(${light}, ${dark})`;
  return getThemeAwareSingleColor(team.primaryColor);
}

export function getTeamBracketAccentColor(team?: Team): string | undefined {
  if (!team) return undefined;
  const light =
    team.bracketAccentColorLight ?? team.bracketAccentColor ?? team.primaryColorLight ?? team.primaryColor;
  const dark =
    team.bracketAccentColorDark ?? team.bracketAccentColor ?? team.primaryColorDark ?? team.primaryColor;
  const hasThemeOverride = Boolean(team.bracketAccentColorLight || team.bracketAccentColorDark);

  if (hasThemeOverride && light && dark) return `light-dark(${light}, ${dark})`;
  return team.bracketAccentColor || getTeamThemePrimaryColor(team);
}

export function getTeamVictoryColor(team?: Team): string | undefined {
  if (!team?.victoryColorEnabled || !(team.victoryColor || team.victoryColorLight || team.victoryColorDark)) return undefined;
  if (team.victoryColorLight || team.victoryColorDark) {
    return `light-dark(${getTeamVictoryModeColor(team, "light")}, ${getTeamVictoryModeColor(team, "dark")})`;
  }
  return team.victoryColor ?? team.bracketAccentColor ?? team.primaryColor;
}

export function getTeamWinnerColor(team?: Team): string | undefined {
  return getTeamVictoryColor(team) || getTeamBracketAccentColor(team) || getTeamThemePrimaryColor(team);
}

export function getTeamWinnerAccentColor(team?: Team): string | undefined {
  if (team?.victoryColorEnabled && (team.victoryAccentColor || team.victoryAccentColorLight || team.victoryAccentColorDark)) {
    if (team.victoryAccentColorLight || team.victoryAccentColorDark) {
      const light = getTeamVictoryAccentModeColor(team, "light");
      const dark = getTeamVictoryAccentModeColor(team, "dark");
      return `light-dark(${light}, ${dark})`;
    }
    return team.victoryAccentColor ?? team.bracketAccentColor ?? team.primaryColor;
  }
  return getTeamBracketAccentColor(team);
}

export function getTeamThemeTextColor(team?: Team, backgroundColor?: string): string | undefined {
  return getConfiguredTeamThemeTextColor(team) ?? getReadableTextColorForBackground(backgroundColor);
}

export function getTeamVictoryTextColor(team?: Team, backgroundColor?: string): string | undefined {
  return (
    getConfiguredTeamVictoryTextColor(team) ??
    getConfiguredTeamThemeTextColor(team) ??
    getReadableTextColorForBackground(backgroundColor ?? getTeamWinnerColor(team))
  );
}

function getConfiguredTeamThemeTextColor(team?: Team): string | undefined {
  if (!team?.textColor && !team?.textColorLight && !team?.textColorDark) return undefined;
  const hasThemeOverride = Boolean(team.textColorLight || team.textColorDark);
  if (hasThemeOverride) {
    const light = team.textColorLight ?? team.textColor ?? lightReadable;
    const dark = team.textColorDark ?? team.textColor ?? darkReadable;
    return `light-dark(${light}, ${dark})`;
  }
  return team.textColor;
}

function getConfiguredTeamVictoryTextColor(team?: Team): string | undefined {
  if (!team?.victoryColorEnabled || !(team.victoryTextColor || team.victoryTextColorLight || team.victoryTextColorDark)) return undefined;
  if (team.victoryTextColorLight || team.victoryTextColorDark) {
    const light =
      team.victoryTextColorLight ??
      team.victoryTextColor ??
      team.textColorLight ??
      team.textColor ??
      "#ffffff";
    const dark =
      team.victoryTextColorDark ??
      team.victoryTextColor ??
      team.textColorDark ??
      team.textColor ??
      "#ffffff";
    return `light-dark(${light}, ${dark})`;
  }
  return team.victoryTextColor ?? team.textColor ?? "#ffffff";
}

export function getTeamReadableScoreTextColor(team?: Team): string {
  const victoryText = getTeamVictoryTextColor(team);
  if (victoryText) return victoryText;
  if (team?.victoryColorEnabled) {
    return getTeamThemeTextColor(team, getTeamWinnerColor(team)) ?? "#ffffff";
  }
  const winnerColor = getTeamVictoryColor(team);
  if (winnerColor) return getReadableConcreteScoreTextColor(winnerColor);
  const accent = getTeamBracketAccentColor(team);
  if (accent) return getReadableScoreTextColor(accent);
  if (!team?.primaryColor) return "#ffffff";
  const lightPrimary = team.primaryColorLight ?? team.primaryColor;
  const darkPrimary = team.primaryColorDark ?? team.primaryColor;

  if (team.primaryColorLight || team.primaryColorDark) {
    return `light-dark(${getReadableScoreTextColor(lightPrimary)}, ${getReadableScoreTextColor(darkPrimary)})`;
  }

  return getReadableScoreTextColor(team.primaryColor);
}

export function isNearBlackOrWhite(color: string): boolean {
  const brightness = getColorBrightness(color);
  if (brightness === undefined) return false;
  return brightness <= 28 || brightness >= 227;
}

export function getReadableScoreTextColor(primary?: string): string {
  if (!primary) return "#ffffff";
  const themeColors = parseLightDarkColor(primary);
  if (themeColors) {
    return `light-dark(${getReadableConcreteScoreTextColor(themeColors.light)}, ${getReadableConcreteScoreTextColor(themeColors.dark)})`;
  }
  if (isNearBlackOrWhite(primary)) return `light-dark(#ffffff, #000000)`;

  const brightness = getColorBrightness(primary);
  return brightness !== undefined && brightness >= 170 ? "#000000" : "#ffffff";
}

export function getReadableTextColorForBackground(primary?: string): string | undefined {
  if (!primary) return undefined;
  const themeColors = parseLightDarkColor(primary);
  if (themeColors) {
    return `light-dark(${getReadableConcreteScoreTextColor(themeColors.light)}, ${getReadableConcreteScoreTextColor(themeColors.dark)})`;
  }
  return getReadableConcreteScoreTextColor(primary);
}

function getReadableConcreteScoreTextColor(primary?: string): string {
  if (!primary) return "#ffffff";
  const brightness = getColorBrightness(primary);
  return brightness !== undefined && brightness >= 170 ? "#000000" : "#ffffff";
}

function getColorBrightness(color: string): number | undefined {
  const rgb = parseHexColor(color);
  if (!rgb) return undefined;
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
}

function parseHexColor(color: string): { r: number; g: number; b: number } | null {
  const normalized = color.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    const [r, g, b] = normalized;
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16)
    };
  }
  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return {
      r: Number.parseInt(normalized.slice(0, 2), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      b: Number.parseInt(normalized.slice(4, 6), 16)
    };
  }
  return null;
}

function parseLightDarkColor(color: string): { light: string; dark: string } | null {
  const match = /^light-dark\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)$/i.exec(color.trim());
  if (!match) return null;
  return { light: match[1].trim(), dark: match[2].trim() };
}

function getTeamVictoryModeColor(team: Team, mode: "light" | "dark"): string {
  if (mode === "light") {
    return team.victoryColorLight ?? team.victoryColor ?? team.bracketAccentColorLight ?? team.bracketAccentColor ?? defaultVictoryColorForLight();
  }
  return team.victoryColorDark ?? team.victoryColor ?? team.bracketAccentColorDark ?? team.bracketAccentColor ?? defaultVictoryColorForDark();
}

function getTeamVictoryAccentModeColor(team: Team, mode: "light" | "dark"): string {
  if (mode === "light") {
    return team.victoryAccentColorLight ?? team.victoryAccentColor ?? team.bracketAccentColorLight ?? team.bracketAccentColor ?? defaultVictoryColorForLight();
  }
  return team.victoryAccentColorDark ?? team.victoryAccentColor ?? team.bracketAccentColorDark ?? team.bracketAccentColor ?? defaultVictoryColorForDark();
}

function defaultVictoryColorForLight(): string {
  return "#111827";
}

function defaultVictoryColorForDark(): string {
  return "#ffffff";
}
