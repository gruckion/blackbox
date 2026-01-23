import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./input.module.css";

type InputSize = "sm" | "md" | "lg";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: InputSize;
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Input({
  size = "md",
  label,
  error,
  leftIcon,
  rightIcon,
  disabled,
  className,
  id,
  ...props
}: InputProps): JSX.Element {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`;

  const wrapperClasses = [
    styles.wrapper,
    styles[size],
    error ? styles.hasError : "",
    disabled ? styles.disabled : "",
    leftIcon ? styles.hasLeftIcon : "",
    rightIcon ? styles.hasRightIcon : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.container}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={wrapperClasses}>
        {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
        <input
          aria-describedby={error ? `${inputId}-error` : undefined}
          aria-invalid={!!error}
          className={styles.input}
          disabled={disabled}
          id={inputId}
          {...props}
        />
        {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
      </div>
      {error && (
        <span className={styles.error} id={`${inputId}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
