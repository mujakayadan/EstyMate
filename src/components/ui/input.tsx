import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-12 w-full rounded-2xl border border-[var(--ink)]/15 bg-white/80 px-4 text-base text-[var(--ink)] shadow-sm placeholder:text-[var(--ink)]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
