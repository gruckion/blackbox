import type { ReactNode } from "react";
import styles from "./segmented-control.module.css";

interface SegmentOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  name?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  disabled = false,
  name,
}: SegmentedControlProps): JSX.Element {
  const controlName = name ?? `segmented-${Math.random().toString(36).slice(2, 9)}`;

  const handleKeyDown = (
    event: React.KeyboardEvent,
    option: SegmentOption,
    index: number
  ): void => {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const prevIndex = index === 0 ? options.length - 1 : index - 1;
      onChange(options[prevIndex].value);
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = index === options.length - 1 ? 0 : index + 1;
      onChange(options[nextIndex].value);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onChange(option.value);
    }
  };

  return (
    <div
      aria-disabled={disabled}
      className={`${styles.container} ${disabled ? styles.disabled : ""}`}
      role="radiogroup"
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: Button provides better UX for segmented control styling
          <button
            aria-checked={isSelected}
            className={`${styles.segment} ${isSelected ? styles.selected : ""}`}
            disabled={disabled}
            key={option.value}
            name={controlName}
            onClick={() => !disabled && onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, option, index)}
            role="radio"
            tabIndex={isSelected ? 0 : -1}
            type="button"
          >
            {option.icon && <span className={styles.icon}>{option.icon}</span>}
            <span className={styles.label}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
