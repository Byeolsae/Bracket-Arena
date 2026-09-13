"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LeaguePreset, Team, TeamPreset, TeamSetPreset } from "@/lib/core/models";
import {
  createLeaguePreset,
  createTeamPreset,
  createTeamSetPreset,
  exportPresets,
  normalizeLeaguePreset,
  normalizeTeamPreset,
  normalizeTeamSetPreset,
  parsePresetImport
} from "@/lib/core/presets";

type PresetStore = {
  teamPresets: TeamPreset[];
  teamSetPresets: TeamSetPreset[];
  leaguePresets: LeaguePreset[];
  saveTeamPreset: (team: Team, name?: string) => void;
  saveTeamSetPreset: (teams: Team[], name: string, description?: string) => void;
  saveLeaguePreset: (teams: Team[], name: string, description?: string) => void;
  updateTeamPreset: (id: string, preset: TeamPreset) => void;
  updateTeamSetPreset: (id: string, preset: TeamSetPreset) => void;
  updateLeaguePreset: (id: string, preset: LeaguePreset) => void;
  deleteTeamPreset: (id: string) => void;
  deleteTeamSetPreset: (id: string) => void;
  deleteLeaguePreset: (id: string) => void;
  duplicateTeamPreset: (id: string) => void;
  duplicateTeamSetPreset: (id: string) => void;
  duplicateLeaguePreset: (id: string) => void;
  exportAll: () => string;
  importAll: (json: string) => void;
};

export const usePresetStore = create<PresetStore>()(
  persist(
    (set, get) => ({
      teamPresets: [],
      teamSetPresets: [],
      leaguePresets: [],
      saveTeamPreset: (team, name) =>
        set((state) => ({
          teamPresets: [createTeamPreset(team, name), ...state.teamPresets]
        })),
      saveTeamSetPreset: (teams, name, description) =>
        set((state) => ({
          teamSetPresets: [createTeamSetPreset(teams, name, description), ...state.teamSetPresets]
        })),
      saveLeaguePreset: (teams, name, description) =>
        set((state) => ({
          leaguePresets: [createLeaguePreset(name, teams, description), ...state.leaguePresets]
        })),
      updateTeamPreset: (id, preset) =>
        set((state) => ({
          teamPresets: state.teamPresets.map((item) =>
            item.id === id ? normalizeTeamPreset({ ...preset, updatedAt: new Date().toISOString() }) : item
          )
        })),
      updateTeamSetPreset: (id, preset) =>
        set((state) => ({
          teamSetPresets: state.teamSetPresets.map((item) =>
            item.id === id ? normalizeTeamSetPreset({ ...preset, updatedAt: new Date().toISOString() }) : item
          )
        })),
      updateLeaguePreset: (id, preset) =>
        set((state) => ({
          leaguePresets: state.leaguePresets.map((item) =>
            item.id === id ? normalizeLeaguePreset({ ...preset, updatedAt: new Date().toISOString() }) : item
          )
        })),
      deleteTeamPreset: (id) =>
        set((state) => ({
          teamPresets: state.teamPresets.filter((item) => item.id !== id)
        })),
      deleteTeamSetPreset: (id) =>
        set((state) => ({
          teamSetPresets: state.teamSetPresets.filter((item) => item.id !== id)
        })),
      deleteLeaguePreset: (id) =>
        set((state) => ({
          leaguePresets: state.leaguePresets.filter((item) => item.id !== id)
        })),
      duplicateTeamPreset: (id) => {
        const preset = get().teamPresets.find((item) => item.id === id);
        if (preset) get().saveTeamPreset(preset.team, `${preset.name} Copy`);
      },
      duplicateTeamSetPreset: (id) => {
        const preset = get().teamSetPresets.find((item) => item.id === id);
        if (preset) get().saveTeamSetPreset(preset.teams, `${preset.name} Copy`, preset.description);
      },
      duplicateLeaguePreset: (id) => {
        const preset = get().leaguePresets.find((item) => item.id === id);
        if (preset) get().saveLeaguePreset(preset.teams, `${preset.name} Copy`, preset.description);
      },
      exportAll: () => exportPresets(get().teamPresets, get().teamSetPresets, get().leaguePresets),
      importAll: (json) => {
        const payload = parsePresetImport(json);
        set((state) => ({
          teamPresets: [...payload.teamPresets.map(normalizeTeamPreset), ...state.teamPresets.map(normalizeTeamPreset)],
          teamSetPresets: [...payload.teamSetPresets.map(normalizeTeamSetPreset), ...state.teamSetPresets.map(normalizeTeamSetPreset)],
          leaguePresets: [...payload.leaguePresets.map(normalizeLeaguePreset), ...state.leaguePresets.map(normalizeLeaguePreset)]
        }));
      }
    }),
    {
      name: "bracket-arena-presets",
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<PresetStore> | undefined;
        return {
          ...current,
          ...persistedState,
          teamPresets: (persistedState?.teamPresets ?? current.teamPresets).map(normalizeTeamPreset),
          teamSetPresets: (persistedState?.teamSetPresets ?? current.teamSetPresets).map(normalizeTeamSetPreset),
          leaguePresets: (persistedState?.leaguePresets ?? current.leaguePresets).map(normalizeLeaguePreset)
        };
      },
      partialize: (state) => ({
        teamPresets: state.teamPresets.map(normalizeTeamPreset),
        teamSetPresets: state.teamSetPresets.map(normalizeTeamSetPreset),
        leaguePresets: state.leaguePresets.map(normalizeLeaguePreset)
      })
    }
  )
);
