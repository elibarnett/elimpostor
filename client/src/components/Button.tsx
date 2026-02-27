interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
}: ButtonProps) {
  const base =
    'w-full max-w-sm mx-auto block h-14 rounded-xl font-bold text-lg transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 cursor-pointer disabled:cursor-not-allowed';

  if (variant === 'primary') {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${base} text-white ${className}`}
        style={{ backgroundColor: 'var(--accent)' }}
        onMouseEnter={(e) => { (e.currentTarget.style.backgroundColor = 'var(--accent-hover)'); }}
        onMouseLeave={(e) => { (e.currentTarget.style.backgroundColor = 'var(--accent)'); }}
      >
        {children}
      </button>
    );
  }

  if (variant === 'secondary') {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${base} border-2 ${className}`}
        style={{ borderColor: 'var(--accent-border)', color: 'var(--accent-text)' }}
      >
        {children}
      </button>
    );
  }

  // danger
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} bg-rose-600 hover:bg-rose-500 text-white ${className}`}
    >
      {children}
    </button>
  );
}
