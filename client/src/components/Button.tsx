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

  const variants = {
    primary: 'bg-violet-600 hover:bg-violet-500 text-white',
    secondary: 'border-2 border-violet-500 text-violet-400 hover:bg-violet-500/10',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
