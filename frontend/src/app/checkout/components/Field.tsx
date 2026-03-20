export function Field({
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  autoComplete,
  inputMode,
  maxLength,
  placeholder,
  error,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
  placeholder?: string;
  error?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-white/60 text-sm mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none transition-colors ${
          readOnly
            ? 'border-white/5 text-white/40 cursor-default'
            : error
              ? 'border-red-500/60 focus:border-red-500'
              : 'border-white/10 focus:border-amber-500/60'
        }`}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
