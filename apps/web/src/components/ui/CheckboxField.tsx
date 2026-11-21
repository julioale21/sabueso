/** A labeled checkbox. */
export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-indigo-600" />
      {label}
    </label>
  );
}
