import type { InputHTMLAttributes, ReactNode } from "react";

type InputSize = "sm" | "md" | "lg";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: InputSize;
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const sizeClasses: Record<InputSize, string> = {
  sm: "px-2 py-1 text-sm",
  md: "px-3 py-2 text-base",
  lg: "px-4 py-3 text-lg",
};

export function Input({
  size = "md",
  label,
  error,
  leftIcon,
  rightIcon,
  disabled,
  className = "",
  id,
  ...props
}: InputProps): JSX.Element {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-gray-400 text-sm" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={`relative flex items-center ${disabled ? "opacity-50" : ""}`}>
        {leftIcon && <span className="absolute left-3 text-gray-500">{leftIcon}</span>}
        <input
          aria-describedby={error ? `${inputId}-error` : undefined}
          aria-invalid={!!error}
          className={`w-full rounded-lg border bg-surface-secondary text-white placeholder-gray-500 transition-colors focus:border-accent focus:outline-none ${
            error ? "border-red-500" : "border-border"
          } ${leftIcon ? "pl-10" : ""} ${rightIcon ? "pr-10" : ""} ${sizeClasses[size]} ${className}`}
          disabled={disabled}
          id={inputId}
          {...props}
        />
        {rightIcon && <span className="absolute right-3 text-gray-500">{rightIcon}</span>}
      </div>
      {error && (
        <span className="text-red-500 text-sm" id={`${inputId}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
