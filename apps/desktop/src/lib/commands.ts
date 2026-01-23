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
