import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./app";

describe("App", () => {
  it('renders "Hello World" heading', () => {
    render(<App />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Hello World");
  });

  it('renders "Welcome to Blackbox Desktop" message', () => {
    render(<App />);

    const welcomeMessage = screen.getByText("Welcome to Blackbox Desktop");
    expect(welcomeMessage).toBeInTheDocument();
  });

  it("has correct component structure with main container", () => {
    render(<App />);

    const mainElement = screen.getByRole("main");
    expect(mainElement).toHaveClass("container");
  });

  it("renders heading and paragraph within main element", () => {
    render(<App />);

    const mainElement = screen.getByRole("main");
    const heading = screen.getByRole("heading", { level: 1 });
    const paragraph = screen.getByText("Welcome to Blackbox Desktop");

    expect(mainElement).toContainElement(heading);
    expect(mainElement).toContainElement(paragraph);
  });
});
