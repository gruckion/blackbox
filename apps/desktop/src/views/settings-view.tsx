import { useEffect, useState } from "react";
import { AppearanceToggle } from "../components/settings/appearance-toggle";
import { HotkeyRecorder } from "../components/settings/hotkey-recorder";
import { Checkbox, Separator } from "../components/ui";
import { disableAutostart, enableAutostart, isAutostartEnabled } from "../lib/commands";
import { useTheme } from "../lib/theme";

type TabId = "general" | "extensions" | "about";

interface Tab {
  id: TabId;
  label: string;
  icon: JSX.Element;
}

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExtensionsIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const tabs: Tab[] = [
  { id: "general", label: "General", icon: <SettingsIcon /> },
  { id: "extensions", label: "Extensions", icon: <ExtensionsIcon /> },
  { id: "about", label: "About", icon: <InfoIcon /> },
];

function GeneralTab() {
  const [launchAtLogin, setLaunchAtLogin] = useState(false);
  const [hotkey, setHotkey] = useState("CommandOrControl+Space");
  const [showInMenuBar, setShowInMenuBar] = useState(true);
  const { theme, setTheme } = useTheme();

  // Load initial autostart state
  useEffect(() => {
    isAutostartEnabled().then(setLaunchAtLogin).catch(console.error);
  }, []);

  // Handle launch at login toggle
  const handleLaunchAtLoginChange = async (enabled: boolean) => {
    try {
      if (enabled) {
        await enableAutostart();
      } else {
        await disableAutostart();
      }
      setLaunchAtLogin(enabled);
    } catch (error) {
      console.error("Failed to update autostart setting:", error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="text-[var(--color-text-muted)] text-sm">Startup</span>
        <Checkbox
          checked={launchAtLogin}
          label="Launch Blackbox at login"
          onChange={handleLaunchAtLoginChange}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[var(--color-text-muted)] text-sm">Blackbox Hotkey</span>
        <HotkeyRecorder onChange={setHotkey} value={hotkey} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[var(--color-text-muted)] text-sm">Menu Bar Icon</span>
        <Checkbox
          checked={showInMenuBar}
          label="Show Blackbox in menu bar"
          onChange={setShowInMenuBar}
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <span className="text-[var(--color-text-muted)] text-sm">Appearance</span>
        <AppearanceToggle onChange={setTheme} value={theme} />
      </div>
    </div>
  );
}

function ExtensionsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--color-surface-secondary)" }}
      >
        <ExtensionsIcon />
      </div>
      <h3 className="mb-2 font-medium text-lg" style={{ color: "var(--color-text-primary)" }}>
        Extensions
      </h3>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Coming soon
      </p>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-4 flex items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-xl"
          style={{ backgroundColor: "var(--color-surface-secondary)" }}
        >
          <span className="font-bold text-2xl" style={{ color: "var(--color-text-primary)" }}>
            B
          </span>
        </div>
        <div>
          <h3 className="font-semibold text-lg" style={{ color: "var(--color-text-primary)" }}>
            Blackbox
          </h3>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Version 0.1.0
          </p>
        </div>
      </div>

      <Separator />

      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Nightly CI for coding agents. Capture, replay, improve, and ship rule changes.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <a
          className="text-sm transition-colors"
          href="https://github.com/your-org/blackbox"
          rel="noopener noreferrer"
          style={{ color: "var(--color-accent)" }}
          target="_blank"
        >
          GitHub Repository
        </a>
        <a
          className="text-sm transition-colors"
          href="https://blackbox.dev"
          rel="noopener noreferrer"
          style={{ color: "var(--color-accent)" }}
          target="_blank"
        >
          Documentation
        </a>
      </div>
    </div>
  );
}

function SettingsView() {
  const [activeTab, setActiveTab] = useState<TabId>("general");

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: "var(--color-surface)" }}>
      {/* Tab bar */}
      <div
        className="flex justify-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        {tabs.map((tab) => (
          <button
            className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 transition-colors"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              backgroundColor:
                activeTab === tab.id ? "var(--color-surface-secondary)" : "transparent",
              color: activeTab === tab.id ? "var(--color-text-primary)" : "var(--color-text-muted)",
            }}
            type="button"
          >
            {tab.icon}
            <span className="font-medium text-xs">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "general" && <GeneralTab />}
        {activeTab === "extensions" && <ExtensionsTab />}
        {activeTab === "about" && <AboutTab />}
      </div>
    </div>
  );
}

export default SettingsView;
