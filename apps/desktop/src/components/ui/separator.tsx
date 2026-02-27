type SeparatorOrientation = "horizontal" | "vertical";

interface SeparatorProps {
  orientation?: SeparatorOrientation;
  className?: string;
}

export function Separator({
  orientation = "horizontal",
  className = "",
}: SeparatorProps): JSX.Element {
  const orientationClasses = orientation === "horizontal" ? "w-full h-px" : "h-full w-px";

  return (
    <hr
      aria-orientation={orientation}
      className={`border-0 ${orientationClasses} ${className}`}
      style={{ backgroundColor: "var(--color-border)" }}
    />
  );
}
