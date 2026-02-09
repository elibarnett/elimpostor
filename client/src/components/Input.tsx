interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  monospace?: boolean;
  autoFocus?: boolean;
  className?: string;
  uppercase?: boolean;
}

export default function Input({
  value,
  onChange,
  placeholder,
  maxLength,
  monospace = false,
  autoFocus = false,
  className = '',
  uppercase = false,
}: InputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => {
        let v = e.target.value;
        if (uppercase) v = v.toUpperCase();
        onChange(v);
      }}
      placeholder={placeholder}
      maxLength={maxLength}
      autoFocus={autoFocus}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize={uppercase ? 'characters' : 'off'}
      className={`w-full max-w-sm mx-auto block h-14 rounded-xl bg-slate-800 border border-slate-700 text-white text-lg px-4 text-center placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors ${
        monospace ? 'font-mono text-2xl tracking-[0.3em]' : ''
      } ${className}`}
    />
  );
}
