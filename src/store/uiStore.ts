"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppLanguage = "ko" | "en";

type UiState = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      language: "ko",
      setLanguage: (language) => set({ language })
    }),
    {
      name: "bracket-arena-ui"
    }
  )
);
