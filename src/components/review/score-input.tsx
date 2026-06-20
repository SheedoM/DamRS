export function ScoreInput({
  label,
  name,
  max,
  defaultValue,
}: {
  label: string;
  name: string;
  max: number;
  defaultValue: number;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type="number"
        min="0"
        max={String(max)}
        step="0.5"
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/20"
      />
      <span className="text-xs text-slate-500">Max {max}</span>
    </label>
  );
}
