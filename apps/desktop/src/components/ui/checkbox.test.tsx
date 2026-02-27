import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./checkbox";

const CHECKBOX_ID_PATTERN = /^checkbox-/;

describe("Checkbox", () => {
  it("renders unchecked by default", () => {
    render(<Checkbox />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("renders checked when checked prop is true", () => {
    render(<Checkbox checked />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("renders with label", () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByText("Accept terms")).toBeInTheDocument();
  });

  it("calls onChange when clicked", () => {
    const handleChange = vi.fn();
    render(<Checkbox onChange={handleChange} />);

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it("toggles from checked to unchecked", () => {
    const handleChange = vi.fn();
    render(<Checkbox checked onChange={handleChange} />);

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it("does not call onChange when disabled", () => {
    const handleChange = vi.fn();
    render(<Checkbox disabled onChange={handleChange} />);

    const label = screen.getByRole("checkbox").closest("label");
    if (label) {
      fireEvent.click(label);
    }

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("renders disabled state correctly", () => {
    render(<Checkbox disabled />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();
  });

  it("uses provided id", () => {
    render(<Checkbox id="my-checkbox" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveAttribute("id", "my-checkbox");
  });

  it("generates unique id when not provided", () => {
    render(<Checkbox />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.id).toMatch(CHECKBOX_ID_PATTERN);
  });
});
