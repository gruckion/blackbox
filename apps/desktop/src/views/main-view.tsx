function MainView() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-6 text-center"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <h1 className="mb-2 font-semibold text-2xl" style={{ color: "var(--color-text-primary)" }}>
        Hello World
      </h1>
      <p style={{ color: "var(--color-text-secondary)" }}>Welcome to Blackbox Desktop</p>
    </main>
  );
}

export default MainView;
