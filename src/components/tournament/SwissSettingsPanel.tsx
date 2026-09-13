"use client";

import type { SwissConfig } from "@/lib/core/models";

type SwissSettingsPanelProps = {
  config: SwissConfig;
  onChange?: (config: SwissConfig) => void;
};

export function SwissSettingsPanel({ config, onChange }: SwissSettingsPanelProps) {
  const update = (patch: Partial<SwissConfig>) => onChange?.({ ...config, ...patch });

  return (
    <div className="grid gap-3 rounded-md border border-line bg-panel p-4 md:grid-cols-3">
      <NumberField label="최대 라운드" value={config.maxRounds} onChange={(maxRounds) => update({ maxRounds })} />
      <NumberField label="진출 승수" value={config.advanceWins} onChange={(advanceWins) => update({ advanceWins })} />
      <NumberField
        label="탈락 패수"
        value={config.eliminateLosses}
        onChange={(eliminateLosses) => update({ eliminateLosses })}
      />
      <NumberField label="상위 N팀" value={config.advanceCount} onChange={(advanceCount) => update({ advanceCount })} />
      <label className="flex items-center gap-2 rounded-md border border-line bg-field px-3 py-2 text-sm font-bold text-ink">
        <input
          type="checkbox"
          checked={config.allowDraw}
          onChange={(event) => update({ allowDraw: event.target.checked })}
        />
        무승부 허용
      </label>
      <label className="flex items-center gap-2 rounded-md border border-line bg-field px-3 py-2 text-sm font-bold text-ink">
        <input
          type="checkbox"
          checked={config.preventMultipleByes}
          onChange={(event) => update({ preventMultipleByes: event.target.checked })}
        />
        중복 부전승 방지
      </label>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1 text-sm font-bold text-ink">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-10 w-full rounded-md border border-line bg-field px-3 text-ink"
      />
    </label>
  );
}
