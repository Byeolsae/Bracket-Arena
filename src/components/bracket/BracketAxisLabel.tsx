type BracketAxisLabelProps = {
  label: string;
  tone?: "red" | "gold" | "cyan";
};

export function BracketAxisLabel({ label }: BracketAxisLabelProps) {
  return (
    <div className="flex items-center justify-center">
      <div
        className="origin-center -rotate-90 whitespace-nowrap px-3 py-1 text-xs font-medium tracking-normal text-muted"
      >
        {label}
      </div>
    </div>
  );
}
