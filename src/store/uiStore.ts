"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TeamDisplaySize = 1 | 2 | 3 | 4 | 5;
export type BracketTeamLayout = "detail" | "logo";

type UiState = {
  bracketTeamLayout: BracketTeamLayout;
  teamDisplaySize: TeamDisplaySize;
  setBracketTeamLayout: (bracketTeamLayout: BracketTeamLayout) => void;
  setTeamDisplaySize: (teamDisplaySize: TeamDisplaySize) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      bracketTeamLayout: "detail",
      teamDisplaySize: 4,
      setBracketTeamLayout: (bracketTeamLayout) => set({ bracketTeamLayout }),
      setTeamDisplaySize: (teamDisplaySize) => set({ teamDisplaySize })
    }),
    {
      name: "bracket-arena-ui"
    }
  )
);
