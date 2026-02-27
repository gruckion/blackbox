import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppearanceToggle } from "./appearance-toggle";

const LIGHT_PATTERN = /light/i;
const DARK_PATTERN = /dark/i;
const SYSTEM_PATTERN = /system/i;

describe("AppearanceToggle", () => {
  it("renders all three options", () => {
    render(<AppearanceToggle onChange={vi.fn()} value="system" />);

    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("renders three radio buttons", () => {
    render(<AppearanceToggle onChange={vi.fn()} value="system" />);

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
  });

  it("has correct radio button checked for light mode", () => {
    render(<AppearanceToggle onChange={vi.fn()} value="light" />);

    const lightRadio = screen.getByRole("radio", { name: LIGHT_PATTERN });
    expect(lightRadio).toBeChecked();
  });

  it("has correct radio button checked for dark mode", () => {
    render(<AppearanceToggle onChange={vi.fn()} value="dark" />);

    const darkRadio = screen.getByRole("radio", { name: DARK_PATTERN });
    expect(darkRadio).toBeChecked();
  });

  it("has correct radio button checked for system mode", () => {
    render(<AppearanceToggle onChange={vi.fn()} value="system" />);

    const systemRadio = screen.getByRole("radio", { name: SYSTEM_PATTERN });
    expect(systemRadio).toBeChecked();
  });

  it("calls onChange when clicking light option", () => {
    const handleChange = vi.fn();
    render(<AppearanceToggle onChange={handleChange} value="dark" />);

    const lightRadio = screen.getByRole("radio", { name: LIGHT_PATTERN });
    fireEvent.click(lightRadio);

    expect(handleChange).toHaveBeenCalledWith("light");
  });

  it("calls onChange when clicking dark option", () => {
    const handleChange = vi.fn();
    render(<AppearanceToggle onChange={handleChange} value="light" />);

    const darkRadio = screen.getByRole("radio", { name: DARK_PATTERN });
    fireEvent.click(darkRadio);

    expect(handleChange).toHaveBeenCalledWith("dark");
  });

  it("calls onChange when clicking system option", () => {
    const handleChange = vi.fn();
    render(<AppearanceToggle onChange={handleChange} value="light" />);

    const systemRadio = screen.getByRole("radio", { name: SYSTEM_PATTERN });
    fireEvent.click(systemRadio);

    expect(handleChange).toHaveBeenCalledWith("system");
  });

  it("has fieldset with legend for accessibility", () => {
    render(<AppearanceToggle onChange={vi.fn()} value="system" />);

    expect(screen.getByRole("group")).toBeInTheDocument();
  });

  it("all radio buttons have same name attribute", () => {
    render(<AppearanceToggle onChange={vi.fn()} value="system" />);

    const radios = screen.getAllByRole("radio");
    for (const radio of radios) {
      expect(radio).toHaveAttribute("name", "appearance-mode");
    }
  });
});
