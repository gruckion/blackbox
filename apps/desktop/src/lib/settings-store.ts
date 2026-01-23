/**
 * Settings store helper for persistent settings storage
 * Uses tauri-plugin-store for file-based persistence
 */

import { load, type Store } from "@tauri-apps/plugin-store";
import { defaultSettings, type Settings } from "./settings";

/** Store file name */
const STORE_FILE = "settings.json";

/** Singleton store instance */
let storeInstance: Store | null = null;

/**
 * Gets or creates the store instance
 */
async function getStore(): Promise<Store> {
  if (storeInstance === null) {
    storeInstance = await load(STORE_FILE, {
      defaults: { ...defaultSettings },
      autoSave: true,
    });
  }
  return storeInstance;
}

/**
 * Retrieves the current settings from persistent storage
 * Returns default settings for any missing values
 */
export async function getSettings(): Promise<Settings> {
  const store = await getStore();

  const [launchAtLogin, hotkey, showInMenuBar, appearance] = await Promise.all([
    store.get<boolean>("launchAtLogin"),
    store.get<string>("hotkey"),
    store.get<boolean>("showInMenuBar"),
    store.get<string>("appearance"),
  ]);

  return {
    launchAtLogin: launchAtLogin ?? defaultSettings.launchAtLogin,
    hotkey: hotkey ?? defaultSettings.hotkey,
    showInMenuBar: showInMenuBar ?? defaultSettings.showInMenuBar,
    appearance: (appearance as Settings["appearance"]) ?? defaultSettings.appearance,
  };
}

/**
 * Saves settings to persistent storage
 */
export async function saveSettings(settings: Settings): Promise<void> {
  const store = await getStore();

  await Promise.all([
    store.set("launchAtLogin", settings.launchAtLogin),
    store.set("hotkey", settings.hotkey),
    store.set("showInMenuBar", settings.showInMenuBar),
    store.set("appearance", settings.appearance),
  ]);

  await store.save();
}

/**
 * Updates a single setting value
 */
export async function updateSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<void> {
  const store = await getStore();
  await store.set(key, value);
  await store.save();
}

/**
 * Resets all settings to their default values
 */
export async function resetSettings(): Promise<void> {
  await saveSettings(defaultSettings);
}

/**
 * Clears the store and removes all settings
 */
export async function clearSettings(): Promise<void> {
  const store = await getStore();
  await store.clear();
  await store.save();
}
