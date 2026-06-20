export function ScoreInput({
  label,
  name,
  max,
  defaultValue,
  onChange,
  disabled,
}: {
  label: string;
  name: string;
  max: number;
  defaultValue: number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
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
        onChange={onChange}
        disabled={disabled}
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/20 disabled:opacity-50"
      />
      <span className="text-xs text-slate-500">الحد الأقصى {max}</span>
    </label>
  );
}
