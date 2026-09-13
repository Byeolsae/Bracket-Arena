"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type TierListTier = {
  id: string;
  name: string;
  color: string;
  textColor: string;
  teamIds: string[];
};

type TierListStore = {
  tiers: TierListTier[];
  addTier: () => string;
  updateTier: (id: string, patch: Partial<Pick<TierListTier, "name" | "color" | "textColor">>) => void;
  deleteTier: (id: string) => void;
  moveTeamToTier: (teamId: string, tierId: string | null, beforeTeamId?: string) => void;
  resetTiers: () => void;
  removeMissingTeams: (teamIds: string[]) => void;
};

const defaultTiers: TierListTier[] = [
  { id: "tier-s", name: "S", color: "#ff355d", textColor: "#ffffff", teamIds: [] },
  { id: "tier-a", name: "A", color: "#ff8a2a", textColor: "#111827", teamIds: [] },
  { id: "tier-b", name: "B", color: "#ffd43b", textColor: "#111827", teamIds: [] },
  { id: "tier-c", name: "C", color: "#2fe6ff", textColor: "#111827", teamIds: [] },
  { id: "tier-d", name: "D", color: "#38d973", textColor: "#111827", teamIds: [] },
  { id: "tier-e", name: "E", color: "#9b5cff", textColor: "#ffffff", teamIds: [] },
  { id: "tier-f", name: "F", color: "#8b95a7", textColor: "#111827", teamIds: [] }
];

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cloneDefaultTiers() {
  return defaultTiers.map((tier) => ({ ...tier, teamIds: [] }));
}

function normalizeTier(tier: Partial<TierListTier>): TierListTier {
  return {
    id: tier.id || createId("tier"),
    name: tier.name || "NEW",
    color: tier.color || "#2fe6ff",
    textColor: tier.textColor || "#111827",
    teamIds: Array.isArray(tier.teamIds) ? tier.teamIds : []
  };
}

function removeTeam(tiers: TierListTier[], teamId: string) {
  return tiers.map((tier) => ({ ...tier, teamIds: tier.teamIds.filter((id) => id !== teamId) }));
}

export const useTierListStore = create<TierListStore>()(
  persist(
    (set) => ({
      tiers: cloneDefaultTiers(),
      addTier: () => {
        const id = createId("tier");
        set((state) => ({
          tiers: [
            ...state.tiers,
            { id, name: "NEW", color: "#2fe6ff", textColor: "#111827", teamIds: [] }
          ]
        }));
        return id;
      },
      updateTier: (id, patch) =>
        set((state) => ({
          tiers: state.tiers.map((tier) => (tier.id === id ? { ...tier, ...patch } : tier))
        })),
      deleteTier: (id) =>
        set((state) => ({
          tiers: state.tiers.filter((tier) => tier.id !== id)
        })),
      moveTeamToTier: (teamId, tierId, beforeTeamId) =>
        set((state) => {
          const withoutTeam = removeTeam(state.tiers, teamId);
          if (!tierId) return { tiers: withoutTeam };

          return {
            tiers: withoutTeam.map((tier) => {
              if (tier.id !== tierId) return tier;
              const teamIds = [...tier.teamIds];
              const insertIndex = beforeTeamId ? teamIds.indexOf(beforeTeamId) : -1;
              if (insertIndex >= 0) teamIds.splice(insertIndex, 0, teamId);
              else teamIds.push(teamId);
              return { ...tier, teamIds };
            })
          };
        }),
      resetTiers: () => set({ tiers: cloneDefaultTiers() }),
      removeMissingTeams: (teamIds) =>
        set((state) => {
          const available = new Set(teamIds);
          return {
            tiers: state.tiers.map((tier) => ({
              ...tier,
              teamIds: tier.teamIds.filter((teamId) => available.has(teamId))
            }))
          };
        })
    }),
    {
      name: "bracket-arena-tier-list",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<TierListStore> | undefined;
        return {
          ...state,
          tiers: Array.isArray(state?.tiers) ? state.tiers.map(normalizeTier) : cloneDefaultTiers()
        };
      },
      storage: createJSONStorage(() => localStorage)
    }
  )
);
