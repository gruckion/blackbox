import type { InputHTMLAttributes } from "react";
import styles from "./checkbox.module.css";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  indeterminate?: boolean;
}

export function Checkbox({
  checked = false,
  onChange,
  label,
  disabled,
  indeterminate = false,
  id,
  ...props
}: CheckboxProps): JSX.Element {
  const checkboxId = id ?? `checkbox-${Math.random().toString(36).slice(2, 9)}`;

  const handleChange = (): void => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <label
      className={`${styles.container} ${disabled ? styles.disabled : ""}`}
      htmlFor={checkboxId}
    >
      <div className={styles.checkboxWrapper}>
        <input
          checked={checked}
          className={styles.input}
          disabled={disabled}
          id={checkboxId}
          onChange={handleChange}
          ref={(el) => {
            if (el) {
              el.indeterminate = indeterminate;
            }
          }}
          type="checkbox"
          {...props}
        />
        <div
          className={`${styles.checkbox} ${checked ? styles.checked : ""} ${indeterminate ? styles.indeterminate : ""}`}
        >
          {checked && !indeterminate && (
            <svg
              aria-hidden="true"
              className={styles.checkIcon}
              fill="none"
              height="12"
              viewBox="0 0 12 12"
              width="12"
            >
              <path
                d="M2 6L5 9L10 3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          )}
          {indeterminate && (
            <svg
              aria-hidden="true"
              className={styles.checkIcon}
              fill="none"
              height="12"
              viewBox="0 0 12 12"
              width="12"
            >
              <path d="M2.5 6H9.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            </svg>
          )}
        </div>
      </div>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
}
