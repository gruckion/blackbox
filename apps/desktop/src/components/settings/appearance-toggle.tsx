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

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
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

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
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

export function AppearanceToggle({ value, onChange }: AppearanceToggleProps) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="sr-only">Appearance</legend>
      <div
        className="inline-flex gap-0.5 rounded-lg p-1"
        style={{ backgroundColor: "var(--color-surface-secondary)" }}
      >
        {options.map((option) => {
          const isSelected = value === option.mode;
          return (
            <label
              className="flex min-w-[72px] cursor-pointer flex-col items-center gap-1 rounded-md px-4 py-2 transition-colors"
              key={option.mode}
              style={{
                backgroundColor: isSelected ? "var(--color-surface-tertiary)" : "transparent",
                color: isSelected ? "var(--color-text-primary)" : "var(--color-text-muted)",
              }}
            >
              <input
                checked={isSelected}
                className="sr-only"
                name="appearance-mode"
                onChange={() => onChange(option.mode)}
                type="radio"
                value={option.mode}
              />
              <span>{option.icon}</span>
              <span className="font-medium text-xs tracking-wide">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default AppearanceToggle;
