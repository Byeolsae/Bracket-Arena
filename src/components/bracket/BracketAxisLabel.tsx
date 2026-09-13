type BracketAxisLabelProps = {
  label: string;
  tone?: "red" | "gold" | "cyan";
};

export function BracketAxisLabel({ label, tone = "red" }: BracketAxisLabelProps) {
  return (
    <div className="flex items-center justify-center">
      <div
        className={`origin-center -rotate-90 whitespace-nowrap border px-3 py-1 text-xs font-black uppercase tracking-[0.28em] ${
          tone === "gold"
            ? "border-gold/45 text-gold"
            : tone === "cyan"
              ? "border-cyan/45 text-cyan"
              : "border-danger/45 text-danger"
        }`}
      >
        {label}
      </div>
    </div>
  );
}
