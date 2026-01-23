import styles from "./separator.module.css";

type SeparatorOrientation = "horizontal" | "vertical";

interface SeparatorProps {
  orientation?: SeparatorOrientation;
  className?: string;
}

export function Separator({ orientation = "horizontal", className }: SeparatorProps): JSX.Element {
  const classes = [styles.separator, styles[orientation], className ?? ""]
    .filter(Boolean)
    .join(" ");

  return <hr aria-orientation={orientation} className={classes} />;
}
