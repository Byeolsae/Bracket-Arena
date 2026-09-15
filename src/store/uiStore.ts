"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppLanguage = "ko" | "en" | "ja";
export type TeamDisplaySize = 1 | 2 | 3 | 4 | 5;

type UiState = {
  language: AppLanguage;
  teamDisplaySize: TeamDisplaySize;
  setLanguage: (language: AppLanguage) => void;
  setTeamDisplaySize: (teamDisplaySize: TeamDisplaySize) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      language: "ko",
      teamDisplaySize: 4,
      setLanguage: (language) => set({ language }),
      setTeamDisplaySize: (teamDisplaySize) => set({ teamDisplaySize })
    }),
    {
      name: "bracket-arena-ui"
    }
  )
);
