/**
 * User settings types for the Blackbox desktop application
 */

/**
 * Appearance theme options
 */
export type Appearance = "light" | "dark" | "system";

/**
 * User settings interface
 */
export interface Settings {
  /** Whether to launch the app at system login */
  launchAtLogin: boolean;
  /** Global hotkey to open the app (e.g., "CommandOrControl+Space") */
  hotkey: string;
  /** Whether to show the app icon in the menu bar */
  showInMenuBar: boolean;
  /** The app's appearance theme */
  appearance: Appearance;
}

/**
 * Default settings values
 */
export const defaultSettings: Settings = {
  launchAtLogin: false,
  hotkey: "CommandOrControl+Space",
  showInMenuBar: true,
  appearance: "system",
};

/**
 * Settings keys for type-safe access
 */
export const SETTINGS_KEYS = {
  LAUNCH_AT_LOGIN: "launchAtLogin",
  HOTKEY: "hotkey",
  SHOW_IN_MENU_BAR: "showInMenuBar",
  APPEARANCE: "appearance",
} as const;
