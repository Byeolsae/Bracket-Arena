"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { Phase } from "@/lib/core/models";
import { StageCard } from "@/components/tournament/StageCard";

type Props = {
  phase: Phase;
  onChange: (patch: Partial<Phase>) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onAddStage: () => void;
  onUpdateStage: (stageId: string, patch: Partial<Phase["stages"][number]>) => void;
  onDeleteStage: (stageId: string) => void;
  onMoveStage: (stageId: string, direction: -1 | 1) => void;
};

export function PhaseCard({
  phase,
  onChange,
  onDelete,
  onMove,
  onAddStage,
  onUpdateStage,
  onDeleteStage,
  onMoveStage
}: Props) {
  return (
    <section className="arena-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          className="input max-w-sm text-lg font-black uppercase tracking-wide"
          value={phase.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <div className="flex gap-2">
          <button className="button-muted" onClick={onAddStage}>
            <Plus className="h-4 w-4" />
            Stage 추가
          </button>
          <button className="icon-button h-10 w-10" onClick={() => onMove(-1)}>
            <ArrowUp className="h-4 w-4" />
          </button>
          <button className="icon-button h-10 w-10" onClick={() => onMove(1)}>
            <ArrowDown className="h-4 w-4" />
          </button>
          <button className="icon-button h-10 w-10" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {phase.stages.map((stage) => (
          <StageCard
            key={stage.id}
            stage={stage}
            onChange={(patch) => onUpdateStage(stage.id, patch)}
            onDelete={() => onDeleteStage(stage.id)}
            onMove={(direction) => onMoveStage(stage.id, direction)}
          />
        ))}
      </div>
    </section>
  );
}
