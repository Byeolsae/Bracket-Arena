"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DoubleEliminationBracket, StepladderBracket, Team, Tournament } from "@/lib/core/models";
import {
  createDoubleEliminationBracket,
  updateDoubleEliminationResult
} from "@/lib/core/doubleElimination";
import { createStepladderBracket, updateStepladderResult } from "@/lib/core/stepladder";
import {
  clearMatchResult,
  createSingleEliminationTournament,
  ensureThirdPlaceMatch,
  updateMatchResult
} from "@/lib/core/singleElimination";

type TournamentStore = {
  tournament?: Tournament;
  doubleElimination?: DoubleEliminationBracket;
  stepladder?: StepladderBracket;
  setTournamentState: (state: {
    tournament?: Tournament;
    doubleElimination?: DoubleEliminationBracket;
    stepladder?: StepladderBracket;
  }) => void;
  createTournament: (teams: Team[], name?: string) => void;
  createDoubleElimination: (teams: Team[]) => void;
  createStepladder: (teams: Team[]) => void;
  setMatchResult: (
    matchId: string,
    result: { scoreA?: number; scoreB?: number; winnerId: string }
  ) => void;
  setDoubleResult: (
    matchId: string,
    result: { scoreA?: number; scoreB?: number; winnerId: string }
  ) => void;
  setStepladderResult: (
    matchId: string,
    result: { scoreA?: number; scoreB?: number; winnerId: string }
  ) => void;
  clearResult: (matchId: string) => void;
};

export const useTournamentStore = create<TournamentStore>()(
  persist(
    (set, get) => ({
      tournament: undefined,
      doubleElimination: undefined,
      stepladder: undefined,
      setTournamentState: (state) =>
        set({
          tournament: state.tournament,
          doubleElimination: state.doubleElimination,
          stepladder: state.stepladder
        }),
      createTournament: (teams, name) =>
        set({
          tournament: createSingleEliminationTournament(teams, name)
        }),
      createDoubleElimination: (teams) =>
        set({
          doubleElimination: createDoubleEliminationBracket(teams)
        }),
      createStepladder: (teams) =>
        set({
          stepladder: createStepladderBracket(teams)
        }),
      setMatchResult: (matchId, result) => {
        const tournament = get().tournament;

        if (!tournament) {
          return;
        }

        set({
          tournament: updateMatchResult(ensureThirdPlaceMatch(tournament), {
            matchId,
            ...result
          })
        });
      },
      clearResult: (matchId) => {
        const tournament = get().tournament;

        if (!tournament) {
          return;
        }

        set({
          tournament: clearMatchResult(ensureThirdPlaceMatch(tournament), matchId)
        });
      },
      setDoubleResult: (matchId, result) => {
        const doubleElimination = get().doubleElimination;

        if (!doubleElimination) {
          return;
        }

        set({
          doubleElimination: updateDoubleEliminationResult(
            doubleElimination,
            matchId,
            result.scoreA,
            result.scoreB,
            result.winnerId
          )
        });
      },
      setStepladderResult: (matchId, result) => {
        const stepladder = get().stepladder;

        if (!stepladder) {
          return;
        }

        set({
          stepladder: updateStepladderResult(
            stepladder,
            matchId,
            result.scoreA,
            result.scoreB,
            result.winnerId
          )
        });
      }
    }),
    {
      name: "bracket-arena-tournament",
      partialize: (state) => ({
        tournament: state.tournament,
        doubleElimination: state.doubleElimination,
        stepladder: state.stepladder
      })
    }
  )
);
