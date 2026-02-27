import { invoke } from "@tauri-apps/api/core";

/**
 * Returns the application version from Cargo.toml
 */
export async function getAppVersion(): Promise<string> {
  return await invoke("get_app_version");
}

/**
 * Opens an external URL in the default browser
 */
export async function openExternalUrl(url: string): Promise<void> {
  return await invoke("open_external_url", { url });
}

/**
 * Enables launch at login
 */
export async function enableAutostart(): Promise<void> {
  return await invoke("enable_autostart");
}

/**
 * Disables launch at login
 */
export async function disableAutostart(): Promise<void> {
  return await invoke("disable_autostart");
}

/**
 * Checks if launch at login is enabled
 */
export async function isAutostartEnabled(): Promise<boolean> {
  return await invoke("is_autostart_enabled");
}
