"use client";

import type { AdvancementRule } from "@/lib/core/models";

type Props = {
  rule: AdvancementRule;
  onChange: (rule: AdvancementRule) => void;
};

export function AdvancementRuleEditor({ rule, onChange }: Props) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="space-y-1">
        <span className="text-xs font-bold text-slate-400">진출 방식</span>
        <select
          className="input"
          value={rule.mode}
          onChange={(event) => onChange({ ...rule, mode: event.target.value as typeof rule.mode })}
        >
          <option value="overall_top_n">전체 순위 상위 N팀</option>
          <option value="group_top_n">조별 상위 N팀</option>
          <option value="group_top_n_plus_wildcard">조별 상위 + 와일드카드</option>
          <option value="condition">조건 기반 진출</option>
          <option value="range">구간별 진출</option>
          <option value="manual">수동 진출</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-xs font-bold text-slate-400">진출 수</span>
        <input
          className="input"
          type="number"
          min={0}
          value={rule.count}
          onChange={(event) => onChange({ ...rule, count: Number(event.target.value) })}
        />
      </label>
    </div>
  );
}
