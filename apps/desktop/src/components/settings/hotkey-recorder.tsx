import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatShortcut, isValidShortcut, parseKeyboardEvent } from "../../lib/keyboard-utils";

interface HotkeyRecorderProps {
  /** Current shortcut value in Tauri format (e.g., "CommandOrControl+Space") */
  value: string;
  /** Callback when a new shortcut is recorded */
  onChange: (value: string) => void;
  /** Placeholder text when no shortcut is set */
  placeholder?: string;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
    padding: "8px 16px",
    backgroundColor: "#3a3a3a",
    borderRadius: 8,
    border: "1px solid #4a4a4a",
    cursor: "pointer",
    transition: "all 0.15s ease",
    outline: "none",
    fontFamily: "inherit",
  },
  containerRecording: {
    backgroundColor: "#2a4a6a",
    borderColor: "#4a8ac4",
    boxShadow: "0 0 0 2px rgba(74, 138, 196, 0.3)",
  },
  containerHover: {
    backgroundColor: "#444",
    borderColor: "#555",
  },
  shortcutDisplay: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 14,
    fontWeight: 500,
    color: "#fff",
    letterSpacing: 0.5,
  },
  recordingText: {
    fontSize: 13,
    color: "#8ac4ea",
    fontStyle: "italic",
  },
  placeholder: {
    fontSize: 13,
    color: "#888",
  },
  keyBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2px 6px",
    backgroundColor: "#555",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    minWidth: 24,
  },
};

/**
 * A component for recording keyboard shortcuts
 * Click to start recording, press keys to set shortcut, Escape to cancel
 */
const DEFAULT_PLACEHOLDER = "Click to record";

export function HotkeyRecorder({ value, onChange, placeholder }: HotkeyRecorderProps) {
  const placeholderText = placeholder ?? DEFAULT_PLACEHOLDER;
  const [isRecording, setIsRecording] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const startRecording = useCallback(() => {
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (!isRecording) {
        // Start recording on any key press when not recording
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          startRecording();
        }
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      // Cancel recording on Escape
      if (event.key === "Escape") {
        stopRecording();
        return;
      }

      // Parse the keyboard event
      const shortcut = parseKeyboardEvent(event.nativeEvent);

      // Only accept valid shortcuts (with at least one modifier)
      if (shortcut && isValidShortcut(shortcut)) {
        onChange(shortcut);
        stopRecording();
      }
    },
    [isRecording, onChange, startRecording, stopRecording]
  );

  // Handle click outside to cancel recording
  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        stopRecording();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isRecording, stopRecording]);

  // Format the current shortcut for display
  const displayValue = value ? formatShortcut(value) : "";
  const displayParts = displayValue.split(" ").filter(Boolean);

  // Determine container style
  const containerStyle: CSSProperties = {
    ...styles.container,
    ...(isRecording ? styles.containerRecording : {}),
    ...(isHovered && !isRecording ? styles.containerHover : {}),
  };

  const renderContent = () => {
    if (isRecording) {
      return <span style={styles.recordingText}>Press keys...</span>;
    }

    if (displayParts.length === 0) {
      return <span style={styles.placeholder}>{placeholderText}</span>;
    }

    return (
      <span style={styles.shortcutDisplay}>
        {displayParts.map((part) => (
          <span key={part} style={styles.keyBadge}>
            {part}
          </span>
        ))}
      </span>
    );
  };

  return (
    <button
      aria-label={
        isRecording
          ? "Recording shortcut, press keys or Escape to cancel"
          : `Shortcut: ${displayValue || "not set"}. Click to record new shortcut`
      }
      onClick={startRecording}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      ref={buttonRef}
      style={containerStyle}
      type="button"
    >
      {renderContent()}
    </button>
  );
}

export default HotkeyRecorder;
