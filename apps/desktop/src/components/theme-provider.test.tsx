import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "../lib/theme";
import { ThemeProvider } from "./theme-provider";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock matchMedia
const matchMediaMock = vi.fn();
Object.defineProperty(window, "matchMedia", {
  value: matchMediaMock,
});

function TestConsumer() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme("light")} type="button">
        Set Light
      </button>
      <button onClick={() => setTheme("dark")} type="button">
        Set Dark
      </button>
      <button onClick={() => setTheme("system")} type="button">
        Set System
      </button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    matchMediaMock.mockReturnValue({
      matches: true, // Dark mode by default
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    document.documentElement.classList.remove("light", "dark");
  });

  it("provides default theme as system", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("system");
  });

  it("uses stored theme from localStorage", () => {
    localStorageMock.getItem.mockReturnValue("light");

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("resolves system theme to dark when prefers-color-scheme is dark", () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
  });

  it("resolves system theme to light when prefers-color-scheme is light", () => {
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
  });

  it("allows changing theme", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    act(() => {
      screen.getByText("Set Light").click();
    });

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("blackbox-theme", "light");
  });

  it("applies theme class to document", () => {
    localStorageMock.getItem.mockReturnValue("dark");

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
