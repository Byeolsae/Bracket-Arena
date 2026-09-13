"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LeagueMatch, SwissConfig, SwissStage, Team } from "@/lib/core/models";
import { generateLeagueSchedule, updateLeagueMatchResult } from "@/lib/core/league";
import {
  createSwissStage,
  generateNextSwissRound,
  updateSwissMatchResult
} from "@/lib/core/swiss";

type LeagueStageState = {
  id: string;
  teamIds: string[];
  advanceCount: number;
  matches: LeagueMatch[];
};

type StageStore = {
  league?: LeagueStageState;
  swiss?: SwissStage;
  createLeagueStage: (teams: Team[], advanceCount: number) => void;
  updateLeagueResult: (matchId: string, scoreA?: number, scoreB?: number) => void;
  setLeagueAdvanceCount: (advanceCount: number) => void;
  createSwissStage: (teams: Team[], config: Partial<SwissConfig>) => void;
  updateSwissResult: (
    matchId: string,
    scoreA?: number,
    scoreB?: number,
    winnerId?: string
  ) => void;
  generateSwissRound: () => void;
};

export const useStageStore = create<StageStore>()(
  persist(
    (set, get) => ({
      league: undefined,
      swiss: undefined,
      createLeagueStage: (teams, advanceCount) =>
        set({
          league: {
            id: `league-${Date.now()}`,
            teamIds: teams.map((team) => team.id),
            advanceCount,
            matches: generateLeagueSchedule(teams)
          }
        }),
      updateLeagueResult: (matchId, scoreA, scoreB) => {
        const league = get().league;

        if (!league) {
          return;
        }

        set({
          league: {
            ...league,
            matches: updateLeagueMatchResult(league.matches, matchId, scoreA, scoreB)
          }
        });
      },
      setLeagueAdvanceCount: (advanceCount) => {
        const league = get().league;

        if (!league) {
          return;
        }

        set({
          league: {
            ...league,
            advanceCount
          }
        });
      },
      createSwissStage: (teams, config) =>
        set({
          swiss: createSwissStage(teams, config)
        }),
      updateSwissResult: (matchId, scoreA, scoreB, winnerId) => {
        const swiss = get().swiss;

        if (!swiss) {
          return;
        }

        set({
          swiss: updateSwissMatchResult(swiss, matchId, scoreA, scoreB, winnerId)
        });
      },
      generateSwissRound: () => {
        const swiss = get().swiss;

        if (!swiss) {
          return;
        }

        set({
          swiss: generateNextSwissRound(swiss)
        });
      }
    }),
    {
      name: "bracket-arena-stages",
      partialize: (state) => ({
        league: state.league,
        swiss: state.swiss
      })
    }
  )
);
