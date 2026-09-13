"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Phase, StructureStage, TournamentStructure } from "@/lib/core/models";
import { createDefaultStructure, createPhase, createStage } from "@/lib/core/tournament";

type StructureStore = {
  structure: TournamentStructure;
  setStructure: (structure: TournamentStructure) => void;
  addPhase: () => void;
  updatePhase: (phaseId: string, patch: Partial<Phase>) => void;
  deletePhase: (phaseId: string) => void;
  movePhase: (phaseId: string, direction: -1 | 1) => void;
  addStage: (phaseId: string) => void;
  updateStage: (phaseId: string, stageId: string, patch: Partial<StructureStage>) => void;
  deleteStage: (phaseId: string, stageId: string) => void;
  moveStage: (phaseId: string, stageId: string, direction: -1 | 1) => void;
};

export const useStructureStore = create<StructureStore>()(
  persist(
    (set) => ({
      structure: createDefaultStructure(),
      setStructure: (structure) => set({ structure }),
      addPhase: () =>
        set((state) => ({
          structure: {
            ...state.structure,
            phases: [...state.structure.phases, createPhase()]
          }
        })),
      updatePhase: (phaseId, patch) =>
        set((state) => ({
          structure: {
            ...state.structure,
            phases: state.structure.phases.map((phase) =>
              phase.id === phaseId ? { ...phase, ...patch } : phase
            )
          }
        })),
      deletePhase: (phaseId) =>
        set((state) => ({
          structure: {
            ...state.structure,
            phases: state.structure.phases.filter((phase) => phase.id !== phaseId)
          }
        })),
      movePhase: (phaseId, direction) =>
        set((state) => ({
          structure: {
            ...state.structure,
            phases: moveItem(state.structure.phases, phaseId, direction)
          }
        })),
      addStage: (phaseId) =>
        set((state) => ({
          structure: {
            ...state.structure,
            phases: state.structure.phases.map((phase) =>
              phase.id === phaseId
                ? { ...phase, stages: [...phase.stages, createStage()] }
                : phase
            )
          }
        })),
      updateStage: (phaseId, stageId, patch) =>
        set((state) => ({
          structure: {
            ...state.structure,
            phases: state.structure.phases.map((phase) =>
              phase.id === phaseId
                ? {
                    ...phase,
                    stages: phase.stages.map((stage) =>
                      stage.id === stageId ? { ...stage, ...patch } : stage
                    )
                  }
                : phase
            )
          }
        })),
      deleteStage: (phaseId, stageId) =>
        set((state) => ({
          structure: {
            ...state.structure,
            phases: state.structure.phases.map((phase) =>
              phase.id === phaseId
                ? { ...phase, stages: phase.stages.filter((stage) => stage.id !== stageId) }
                : phase
            )
          }
        })),
      moveStage: (phaseId, stageId, direction) =>
        set((state) => ({
          structure: {
            ...state.structure,
            phases: state.structure.phases.map((phase) =>
              phase.id === phaseId
                ? { ...phase, stages: moveItem(phase.stages, stageId, direction) }
                : phase
            )
          }
        }))
    }),
    {
      name: "bracket-arena-structure"
    }
  )
);

function moveItem<T extends { id: string }>(items: T[], id: string, direction: -1 | 1) {
  const index = items.findIndex((item) => item.id === id);
  const nextIndex = index + direction;

  if (index < 0 || nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const copy = [...items];
  const [item] = copy.splice(index, 1);
  copy.splice(nextIndex, 0, item);
  return copy;
}
