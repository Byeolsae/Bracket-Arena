"use client";

import type { SlotMappingRule } from "@/lib/core/models";

type Props = {
  rule: SlotMappingRule;
  onChange: (rule: SlotMappingRule) => void;
};

export function SlotMappingEditor({ rule, onChange }: Props) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold text-slate-400">슬롯 매핑</span>
      <select
        className="input"
        value={rule.mode}
        onChange={(event) =>
          onChange({ ...rule, mode: event.target.value as SlotMappingRule["mode"] })
        }
      >
        <option value="standing_order">순위 순서대로</option>
        <option value="seed_order">시드 순서대로</option>
        <option value="random">랜덤 배정</option>
        <option value="manual">수동 배정</option>
        <option value="first_vs_last">1위 vs 최하위</option>
        <option value="avoid_same_group">같은 조 회피</option>
        <option value="avoid_same_region">같은 지역 회피</option>
      </select>
    </label>
  );
}
