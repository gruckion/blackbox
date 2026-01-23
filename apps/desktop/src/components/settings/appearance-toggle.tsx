import type { CSSProperties } from "react";

export type AppearanceMode = "light" | "dark" | "system";

interface AppearanceToggleProps {
  value: AppearanceMode;
  onChange: (value: AppearanceMode) => void;
}

interface AppearanceOption {
  mode: AppearanceMode;
  icon: JSX.Element;
  label: string;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: "inline-flex",
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 4,
    gap: 2,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "8px 16px",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    minWidth: 72,
  },
  labelDefault: {
    backgroundColor: "transparent",
    color: "#888",
  },
  labelSelected: {
    backgroundColor: "#3a3a3a",
    color: "#fff",
  },
  icon: {
    width: 20,
    height: 20,
  },
  labelText: {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: 0.2,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: 0,
  },
};

/** Sun icon for light mode */
function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="20"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" x2="12" y1="1" y2="3" />
      <line x1="12" x2="12" y1="21" y2="23" />
      <line x1="4.22" x2="5.64" y1="4.22" y2="5.64" />
      <line x1="18.36" x2="19.78" y1="18.36" y2="19.78" />
      <line x1="1" x2="3" y1="12" y2="12" />
      <line x1="21" x2="23" y1="12" y2="12" />
      <line x1="4.22" x2="5.64" y1="19.78" y2="18.36" />
      <line x1="18.36" x2="19.78" y1="5.64" y2="4.22" />
    </svg>
  );
}

/** Moon icon for dark mode */
function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="20"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/** Auto/System icon */
function SystemIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="20"
    >
      <rect height="14" rx="2" ry="2" width="20" x="2" y="3" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

const options: AppearanceOption[] = [
  { mode: "light", icon: <SunIcon />, label: "Light" },
  { mode: "dark", icon: <MoonIcon />, label: "Dark" },
  { mode: "system", icon: <SystemIcon />, label: "System" },
];

/**
 * A three-option segmented control for selecting appearance mode
 * Styled similar to Raycast's appearance toggle
 */
export function AppearanceToggle({ value, onChange }: AppearanceToggleProps) {
  const handleChange = (mode: AppearanceMode) => {
    onChange(mode);
  };

  return (
    <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
      <legend style={styles.hiddenInput as CSSProperties}>Appearance</legend>
      <div style={styles.container}>
        {options.map((option) => {
          const isSelected = value === option.mode;
          const labelStyle = {
            ...styles.label,
            ...(isSelected ? styles.labelSelected : styles.labelDefault),
          };

          return (
            <label key={option.mode} style={labelStyle}>
              <input
                checked={isSelected}
                name="appearance-mode"
                onChange={() => handleChange(option.mode)}
                style={styles.hiddenInput as CSSProperties}
                type="radio"
                value={option.mode}
              />
              <span style={styles.icon}>{option.icon}</span>
              <span style={styles.labelText}>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default AppearanceToggle;
