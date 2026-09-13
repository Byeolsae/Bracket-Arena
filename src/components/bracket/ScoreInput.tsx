"use client";

type ScoreInputProps = {
  value?: number;
  onChange: (value?: number) => void;
  disabled?: boolean;
};

export function ScoreInput({ value, onChange, disabled }: ScoreInputProps) {
  return (
    <input
      type="number"
      min={0}
      value={value ?? ""}
      onChange={(event) =>
        onChange(event.target.value === "" ? undefined : Number(event.target.value))
      }
      disabled={disabled}
      className="h-9 w-16 rounded-md border border-line bg-arena px-2 text-center text-sm font-black text-ink outline-none transition focus:border-cyan disabled:bg-field disabled:text-slate-500"
      aria-label="Score"
    />
  );
}
