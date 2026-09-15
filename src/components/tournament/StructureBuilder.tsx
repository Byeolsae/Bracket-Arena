"use client";

import { Plus, Save } from "lucide-react";
import { validateTournamentStructure } from "@/lib/core/tournament";
import { PhaseCard } from "@/components/tournament/PhaseCard";
import { useStructureStore } from "@/store/structureStore";

export function StructureBuilder() {
  const {
    structure,
    addPhase,
    updatePhase,
    deletePhase,
    movePhase,
    addStage,
    updateStage,
    deleteStage,
    moveStage
  } = useStructureStore();
  const warnings = validateTournamentStructure(structure);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-kicker">구조 빌더</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-wide text-ink">
            대회 구조 빌더
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="button-muted" onClick={addPhase}>
            <Plus className="h-4 w-4" />
            페이즈 추가
          </button>
          <button className="button-primary">
            <Save className="h-4 w-4" />
            저장됨
          </button>
        </div>
      </div>

      {warnings.length ? (
        <section className="arena-card border-gold/50 p-4">
          <h2 className="mb-2 font-black uppercase tracking-wide text-gold">검증 메시지</h2>
          <div className="space-y-2">
            {warnings.map((warning) => (
              <div key={warning} className="rounded-md bg-gold/10 px-3 py-2 text-sm text-gold">
                {warning}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {structure.phases.map((phase, index) => (
        <div key={phase.id} className="space-y-3">
          <PhaseCard
            phase={phase}
            onChange={(patch) => updatePhase(phase.id, patch)}
            onDelete={() => deletePhase(phase.id)}
            onMove={(direction) => movePhase(phase.id, direction)}
            onAddStage={() => addStage(phase.id)}
            onUpdateStage={(stageId, patch) => updateStage(phase.id, stageId, patch)}
            onDeleteStage={(stageId) => deleteStage(phase.id, stageId)}
            onMoveStage={(stageId, direction) => moveStage(phase.id, stageId, direction)}
          />
          {index < structure.phases.length - 1 ? (
            <div className="mx-auto h-8 w-px bg-cyan/60" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
