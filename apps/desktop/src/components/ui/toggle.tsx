import type { InputHTMLAttributes } from "react";

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
    <label
      className={`flex cursor-pointer items-center justify-between gap-3 ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      htmlFor={toggleId}
    >
      {label && <span className="text-gray-300 text-sm">{label}</span>}
      <div className="relative">
        <input
          checked={checked}
          className="sr-only"
          disabled={disabled}
          id={toggleId}
          onChange={handleChange}
          type="checkbox"
          {...props}
        />
        <div
          className={`h-6 w-11 rounded-full transition-colors ${
            checked ? "bg-accent" : "bg-surface-tertiary"
          }`}
        >
          <div
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </div>
      </div>
    </label>
  );
}
