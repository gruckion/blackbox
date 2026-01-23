/**
 * Keyboard utility functions for handling shortcuts
 * Converts between Tauri shortcut format and display format
 */

/** Map of modifier keys to their display symbols (macOS style) */
const MODIFIER_SYMBOLS: Record<string, string> = {
  CommandOrControl: "\u2318",
  Command: "\u2318",
  Control: "\u2303",
  Ctrl: "\u2303",
  Shift: "\u21E7",
  Alt: "\u2325",
  Option: "\u2325",
  Super: "\u2318",
  Meta: "\u2318",
};

/** Map of special keys to their display names */
const KEY_DISPLAY_NAMES: Record<string, string> = {
  Space: "Space",
  Enter: "\u23CE",
  Return: "\u23CE",
  Escape: "Esc",
  Backspace: "\u232B",
  Delete: "\u2326",
  Tab: "\u21E5",
  ArrowUp: "\u2191",
  ArrowDown: "\u2193",
  ArrowLeft: "\u2190",
  ArrowRight: "\u2192",
};

/** Map of key codes to Tauri shortcut key names */
const KEY_CODE_MAP: Record<string, string> = {
  Space: "Space",
  Enter: "Enter",
  NumpadEnter: "Enter",
  Escape: "Escape",
  Backspace: "Backspace",
  Delete: "Delete",
  Tab: "Tab",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
};

/** Modifier keys to ignore as the main key */
const MODIFIER_KEYS = new Set(["Control", "Alt", "Shift", "Meta"]);

/** Regex for matching function keys (F1-F12, etc.) */
const FUNCTION_KEY_REGEX = /^F\d+$/;

/**
 * Format a Tauri shortcut string for display
 * Converts "CommandOrControl+Shift+Space" to symbols
 * @param shortcut - Tauri format shortcut string (e.g., "CommandOrControl+Space")
 * @returns Display format string with symbols
 */
export function formatShortcut(shortcut: string): string {
  if (!shortcut) {
    return "";
  }

  const parts = shortcut.split("+");
  const displayParts: string[] = [];

  for (const part of parts) {
    const trimmedPart = part.trim();

    // Check if it's a modifier
    const modifierSymbol = MODIFIER_SYMBOLS[trimmedPart];
    if (modifierSymbol) {
      displayParts.push(modifierSymbol);
      continue;
    }

    // Check if it's a special key
    const keyDisplayName = KEY_DISPLAY_NAMES[trimmedPart];
    if (keyDisplayName) {
      displayParts.push(keyDisplayName);
      continue;
    }

    // Regular key - display uppercase for single characters
    if (trimmedPart.length === 1) {
      displayParts.push(trimmedPart.toUpperCase());
    } else {
      displayParts.push(trimmedPart);
    }
  }

  return displayParts.join(" ");
}

/**
 * Extract the main key from a keyboard event code
 * @param keyCode - The event.code value
 * @param eventKey - The event.key value
 * @returns The key name for Tauri shortcut format
 */
function extractKeyFromCode(keyCode: string, eventKey: string): string {
  // Check direct mapping first
  const directMapping = KEY_CODE_MAP[keyCode];
  if (directMapping) {
    return directMapping;
  }

  // Letter keys (KeyA, KeyB, etc.)
  if (keyCode.startsWith("Key")) {
    return keyCode.replace("Key", "");
  }

  // Number keys
  if (keyCode.startsWith("Digit")) {
    return keyCode.replace("Digit", "");
  }

  // Numpad keys (except Enter which is handled above)
  if (keyCode.startsWith("Numpad")) {
    return keyCode.replace("Numpad", "Num");
  }

  // Function keys (F1-F12)
  if (keyCode.startsWith("F") && FUNCTION_KEY_REGEX.test(keyCode)) {
    return keyCode;
  }

  // Other keys - use the key value
  return eventKey.length === 1 ? eventKey.toUpperCase() : eventKey;
}

/**
 * Parse a keyboard event and convert to Tauri shortcut format
 * @param event - The keyboard event to parse
 * @returns Tauri format shortcut string (e.g., "CommandOrControl+Shift+K")
 */
export function parseKeyboardEvent(event: KeyboardEvent): string {
  // Skip if only modifiers are pressed
  if (MODIFIER_KEYS.has(event.key)) {
    return "";
  }

  const modifiers: string[] = [];

  // Collect modifiers in standard order
  if (event.ctrlKey || event.metaKey) {
    modifiers.push("CommandOrControl");
  }
  if (event.altKey) {
    modifiers.push("Alt");
  }
  if (event.shiftKey) {
    modifiers.push("Shift");
  }

  const key = extractKeyFromCode(event.code, event.key);

  // Build the shortcut string
  if (!key) {
    return "";
  }

  if (modifiers.length === 0) {
    return key;
  }

  return [...modifiers, key].join("+");
}

/**
 * Check if a shortcut string is valid (has at least a modifier and a key)
 * @param shortcut - The shortcut string to validate
 * @returns True if valid, false otherwise
 */
export function isValidShortcut(shortcut: string): boolean {
  if (!shortcut) {
    return false;
  }

  const parts = shortcut.split("+");
  if (parts.length < 2) {
    return false;
  }

  // Must have at least one modifier
  const hasModifier = parts.some((part) => MODIFIER_SYMBOLS[part.trim()] !== undefined);

  // Must have at least one non-modifier key
  const hasKey = parts.some((part) => MODIFIER_SYMBOLS[part.trim()] === undefined);

  return hasModifier && hasKey;
}
