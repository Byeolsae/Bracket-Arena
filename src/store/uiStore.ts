"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TeamDisplaySize = 1 | 2 | 3 | 4 | 5;

type UiState = {
  teamDisplaySize: TeamDisplaySize;
  setTeamDisplaySize: (teamDisplaySize: TeamDisplaySize) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      teamDisplaySize: 4,
      setTeamDisplaySize: (teamDisplaySize) => set({ teamDisplaySize })
    }),
    {
      name: "bracket-arena-ui"
    }
  )
);
