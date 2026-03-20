export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  autoComplete,
  fieldKey,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  fieldKey?: string;
}) {
  return (
    <div data-field={fieldKey}>
      <label className="block text-white/60 text-sm mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors appearance-none ${
          error
            ? 'border-red-500/60 focus:border-red-500'
            : 'border-white/10 focus:border-amber-500/60'
        } ${!value ? 'text-white/30' : 'text-white'}`}
      >
        {placeholder && (
          <option value="" disabled className="bg-zinc-900 text-white/40">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-zinc-900 text-white">
            {opt}
          </option>
        ))}
      </select>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
