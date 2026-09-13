"use client";

import type { ByeRule } from "@/lib/core/models";

type Props = {
  rule: ByeRule;
  onChange: (rule: ByeRule) => void;
};

export function ByeRuleEditor({ rule, onChange }: Props) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold text-slate-400">부전승 규칙</span>
      <select
        className="input"
        value={rule.mode}
        onChange={(event) => onChange({ ...rule, mode: event.target.value as ByeRule["mode"] })}
      >
        <option value="none">없음</option>
        <option value="top_seed">상위 시드 우선</option>
        <option value="bottom_seed">하위 시드 우선</option>
        <option value="manual">수동 배정</option>
        <option value="rest_round">휴식 라운드</option>
      </select>
    </label>
  );
}
