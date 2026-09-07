import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * The single action control for SPX402 (design lock §4). Every state — default,
 * hover, active, disabled, loading, keyboard focus — is defined here once.
 */
export const actionButtonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap border font-mono uppercase tracking-widest transition-[color,background-color,border-color] duration-[var(--motion-fast)] ease-[var(--ease)] focus-ring disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40",
  {
    variants: {
      variant: {
        primary:
          "border-amber/80 bg-amber/10 text-amber hover:bg-amber hover:text-panel-deep active:bg-amber/90",
        secondary:
          "border-bronze/50 bg-transparent text-paper hover:border-amber hover:text-amber active:border-amber/70",
        ghost:
          "border-transparent bg-transparent text-paper-muted hover:text-amber active:text-amber/80",
        danger:
          "border-critical/70 bg-critical/10 text-critical hover:bg-critical hover:text-background active:bg-critical/90",
      },
      size: {
        sm: "px-2.5 py-1.5 text-[10px]",
        md: "px-4 py-2.5 text-[11px]",
        lg: "px-6 py-3.5 text-xs",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

type Variants = VariantProps<typeof actionButtonVariants>;

type CommonProps = Variants & {
  className?: string;
  children?: ReactNode;
  loading?: boolean;
};

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-3 w-3 shrink-0 animate-spin rounded-full border border-current border-t-transparent motion-reduce:animate-none"
    />
  );
}

export type ActionButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  function ActionButton(
    { variant, size, block, className, children, loading = false, disabled, type = "button", ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(actionButtonVariants({ variant, size, block }), className)}
        {...rest}
      >
        {loading ? <Spinner /> : null}
        {children}
      </button>
    );
  },
);

/** Same visual system, but navigates via the router. */
export function ActionLink({
  to,
  params,
  search,
  hash,
  variant,
  size,
  block,
  className,
  children,
  ...rest
}: CommonProps & {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
  hash?: string;
} & Record<string, unknown>) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      params={params as never}
      search={search as never}
      hash={hash as never}
      className={cn(actionButtonVariants({ variant, size, block }), className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** Same visual system for external destinations. */
export function ActionAnchor({
  href,
  variant,
  size,
  block,
  className,
  children,
  external = true,
  ...rest
}: CommonProps & { href: string; external?: boolean } & Record<string, unknown>) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
      className={cn(actionButtonVariants({ variant, size, block }), className)}
      {...rest}
    >
      {children}
    </a>
  );
}
