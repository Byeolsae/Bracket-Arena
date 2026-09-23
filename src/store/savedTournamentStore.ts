"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SavedTournamentSnapshot = {
  selectedTeamIds: string[];
  tournamentName: string;
  mode: string;
  qualifierFormat: string;
  finalFormat: string;
  activeStage: unknown;
  groupCount: number;
  teamGroupAssignments: Record<string, number>;
  tournament?: unknown;
  doubleElimination?: unknown;
  stepladder?: unknown;
  leagueStage?: unknown;
  groupStage?: unknown;
  groupDoubleStage?: unknown;
  groupTripleStage?: unknown;
  swissStage?: unknown;
  tripleStage?: unknown;
};

export type SavedTournament = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  snapshot: SavedTournamentSnapshot;
};

type SavedTournamentStore = {
  savedTournaments: SavedTournament[];
  saveTournament: (name: string, snapshot: SavedTournamentSnapshot) => SavedTournament;
  deleteTournament: (id: string) => void;
  setSavedTournaments: (savedTournaments: SavedTournament[]) => void;
};

const createId = () => `saved-tournament-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

export const useSavedTournamentStore = create<SavedTournamentStore>()(
  persist(
    (set, get) => ({
      savedTournaments: [],
      saveTournament: (name, snapshot) => {
        const timestamp = new Date().toISOString();
        const saved: SavedTournament = {
          id: createId(),
          name: name.trim() || "저장된 대회",
          createdAt: timestamp,
          updatedAt: timestamp,
          snapshot
        };

        set({
          savedTournaments: [saved, ...get().savedTournaments]
        });

        return saved;
      },
      deleteTournament: (id) =>
        set((state) => ({
          savedTournaments: state.savedTournaments.filter((item) => item.id !== id)
        })),
      setSavedTournaments: (savedTournaments) =>
        set({
          savedTournaments: Array.isArray(savedTournaments) ? savedTournaments : []
        })
    }),
    {
      name: "bracket-arena-saved-tournaments"
    }
  )
);
