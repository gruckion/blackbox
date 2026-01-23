import type { InputHTMLAttributes } from "react";
import styles from "./toggle.module.css";

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
}

export function Toggle({
  checked = false,
  onChange,
  label,
  disabled,
  id,
  ...props
}: ToggleProps): JSX.Element {
  const toggleId = id ?? `toggle-${Math.random().toString(36).slice(2, 9)}`;

  const handleChange = (): void => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <label className={`${styles.container} ${disabled ? styles.disabled : ""}`} htmlFor={toggleId}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.toggleWrapper}>
        <input
          checked={checked}
          className={styles.input}
          disabled={disabled}
          id={toggleId}
          onChange={handleChange}
          type="checkbox"
          {...props}
        />
        <div className={`${styles.track} ${checked ? styles.active : ""}`}>
          <div className={styles.thumb} />
        </div>
      </div>
    </label>
  );
}
