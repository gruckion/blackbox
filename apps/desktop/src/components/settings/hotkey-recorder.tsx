import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatShortcut, isValidShortcut, parseKeyboardEvent } from "../../lib/keyboard-utils";

interface HotkeyRecorderProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

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
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          startRecording();
        }
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        stopRecording();
        return;
      }

      const shortcut = parseKeyboardEvent(event.nativeEvent);

      if (shortcut && isValidShortcut(shortcut)) {
        onChange(shortcut);
        stopRecording();
      }
    },
    [isRecording, onChange, startRecording, stopRecording]
  );

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

  const displayValue = value ? formatShortcut(value) : "";
  const displayParts = displayValue.split(" ").filter(Boolean);

  const renderContent = () => {
    if (isRecording) {
      return (
        <span className="text-sm italic" style={{ color: "var(--color-accent)" }}>
          Press keys...
        </span>
      );
    }

    if (displayParts.length === 0) {
      return (
        <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {placeholderText}
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1.5">
        {displayParts.map((part) => (
          <span
            className="inline-flex min-w-[24px] items-center justify-center rounded px-2 py-0.5 font-semibold text-sm"
            key={part}
            style={{
              backgroundColor: "var(--color-surface-tertiary)",
              color: "var(--color-text-primary)",
            }}
          >
            {part}
          </span>
        ))}
      </span>
    );
  };

  const getStateStyles = () => {
    if (isRecording) {
      return {
        borderColor: "var(--color-accent)",
        backgroundColor: "rgba(124, 58, 237, 0.2)",
        boxShadow: "0 0 0 2px rgba(124, 58, 237, 0.3)",
      };
    }
    if (isHovered) {
      return {
        borderColor: "var(--color-text-muted)",
        backgroundColor: "var(--color-surface-tertiary)",
      };
    }
    return {
      borderColor: "var(--color-border)",
      backgroundColor: "var(--color-surface-secondary)",
    };
  };

  return (
    <button
      aria-label={
        isRecording
          ? "Recording shortcut, press keys or Escape to cancel"
          : `Shortcut: ${displayValue || "not set"}. Click to record new shortcut`
      }
      className="inline-flex min-w-[120px] items-center justify-center rounded-lg border px-4 py-2 outline-none transition-all"
      onClick={startRecording}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      ref={buttonRef}
      style={getStateStyles()}
      type="button"
    >
      {renderContent()}
    </button>
  );
}

export default HotkeyRecorder;
