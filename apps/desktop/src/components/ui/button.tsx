import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const buttonVariants = cva(
  "rounded-lg font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white hover:bg-accent-hover",
        secondary: "border border-border bg-surface-secondary text-white hover:bg-surface-tertiary",
        ghost: "bg-transparent text-gray-300 hover:bg-surface-secondary",
      },
      size: {
        sm: "px-2 py-1 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-6 py-3 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: ReactNode;
}

export function Button({ variant, size, children, className, ...props }: ButtonProps): JSX.Element {
  return (
    <button className={clsx(buttonVariants({ variant, size }), className)} type="button" {...props}>
      {children}
    </button>
  );
}
