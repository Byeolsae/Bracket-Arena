import type { BracketTeamLayout, TeamDisplaySize } from "@/store/uiStore";

const sizes = {
  1: { detail: 224, logo: 112, fontSize: 10, padding: 4, height: 24, logoRow: 48 },
  2: { detail: 240, logo: 128, fontSize: 11, padding: 6, height: 28, logoRow: 56 },
  3: { detail: 256, logo: 144, fontSize: 12, padding: 8, height: 32, logoRow: 64 },
  4: { detail: 288, logo: 160, fontSize: 13, padding: 8, height: 36, logoRow: 80 },
  5: { detail: 320, logo: 176, fontSize: 14, padding: 10, height: 40, logoRow: 96 }
};

export function getBracketSizing(size: TeamDisplaySize, layout: BracketTeamLayout) {
  const settings = sizes[size];
  return {
    cardWidth: settings[layout],
    leafGap: layout === "logo" ? Math.max(176, settings.logoRow * 2 + 80) : 176,
    labelStyle: {
      width: settings[layout],
      minHeight: settings.height,
      fontSize: settings.fontSize,
      lineHeight: "1.4",
      padding: `${settings.padding}px 8px`,
      overflowWrap: "anywhere" as const
    }
  };
}
