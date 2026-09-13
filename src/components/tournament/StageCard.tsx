"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { StructureStage, StageType } from "@/lib/core/models";
import { previewAutoAdjustment } from "@/lib/core/tournament";
import { AdvancementRuleEditor } from "@/components/tournament/AdvancementRuleEditor";
import { ByeRuleEditor } from "@/components/tournament/ByeRuleEditor";
import { SlotMappingEditor } from "@/components/tournament/SlotMappingEditor";

type Props = {
  stage: StructureStage;
  onChange: (patch: Partial<StructureStage>) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
};

const stageTypes: StageType[] = [
  "league",
  "group",
  "single_elimination",
  "double_elimination",
  "swiss",
  "stepladder"
];

export function StageCard({ stage, onChange, onDelete, onMove }: Props) {
  const preview = previewAutoAdjustment(stage);

  return (
    <article className="rounded-md border border-line bg-field p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <input
          className="input max-w-xs font-black uppercase tracking-wide"
          value={stage.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <div className="flex gap-2">
          <button className="icon-button h-9 w-9" onClick={() => onMove(-1)} title="위로">
            <ArrowUp className="h-4 w-4" />
          </button>
          <button className="icon-button h-9 w-9" onClick={() => onMove(1)} title="아래로">
            <ArrowDown className="h-4 w-4" />
          </button>
          <button className="icon-button h-9 w-9" onClick={onDelete} title="삭제">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-bold text-slate-400">Stage 타입</span>
          <select
            className="input"
            value={stage.type}
            onChange={(event) => onChange({ type: event.target.value as StageType })}
          >
            {stageTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-bold text-slate-400">참가팀 수</span>
          <input
            className="input"
            type="number"
            min={0}
            value={stage.participantCount}
            onChange={(event) => onChange({ participantCount: Number(event.target.value) })}
          />
        </label>
        <label className="flex items-center gap-2 rounded-md border border-line bg-arena px-3 py-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={stage.autoAdjustmentRule.enabled}
            onChange={(event) =>
              onChange({
                autoAdjustmentRule: {
                  ...stage.autoAdjustmentRule,
                  enabled: event.target.checked
                }
              })
            }
          />
          자동 보정
        </label>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <AdvancementRuleEditor
          rule={stage.advancementRule}
          onChange={(advancementRule) => onChange({ advancementRule })}
        />
        <SlotMappingEditor
          rule={stage.slotMappingRule}
          onChange={(slotMappingRule) => onChange({ slotMappingRule })}
        />
        <ByeRuleEditor rule={stage.byeRule} onChange={(byeRule) => onChange({ byeRule })} />
      </div>
      {preview ? (
        <div className="mt-3 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm font-semibold text-gold">
          {preview}
        </div>
      ) : null}
    </article>
  );
}
