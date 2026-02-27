import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";

const renderApp = (initialRoute = "/") => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>
  );
};

describe("App", () => {
  it('renders "Hello World" heading', () => {
    renderApp();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Hello World");
  });

  it('renders "Welcome to Blackbox Desktop" message', () => {
    renderApp();

    const welcomeMessage = screen.getByText("Welcome to Blackbox Desktop");
    expect(welcomeMessage).toBeInTheDocument();
  });

  it("has correct component structure with main element", () => {
    renderApp();

    const mainElement = screen.getByRole("main");
    expect(mainElement).toBeInTheDocument();
  });

  it("renders heading and paragraph within main element", () => {
    renderApp();

    const mainElement = screen.getByRole("main");
    const heading = screen.getByRole("heading", { level: 1 });
    const paragraph = screen.getByText("Welcome to Blackbox Desktop");

    expect(mainElement).toContainElement(heading);
    expect(mainElement).toContainElement(paragraph);
  });
});
