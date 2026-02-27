import type { InputHTMLAttributes } from "react";

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
      className={`flex cursor-pointer items-center gap-2 ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      htmlFor={checkboxId}
    >
      <div className="relative">
        <input
          checked={checked}
          className="sr-only"
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
          className="flex h-5 w-5 items-center justify-center rounded border-2 transition-colors"
          style={{
            borderColor: checked || indeterminate ? "var(--color-accent)" : "var(--color-border)",
            backgroundColor:
              checked || indeterminate ? "var(--color-accent)" : "var(--color-surface-secondary)",
          }}
        >
          {checked && !indeterminate && (
            <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 12 12" width="12">
              <path
                d="M2 6L5 9L10 3"
                stroke="white"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          )}
          {indeterminate && (
            <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 12 12" width="12">
              <path d="M2.5 6H9.5" stroke="white" strokeLinecap="round" strokeWidth="2" />
            </svg>
          )}
        </div>
      </div>
      {label && (
        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {label}
        </span>
      )}
    </label>
  );
}
