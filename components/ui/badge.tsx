import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-6 items-center rounded-full px-2 text-[10px] font-semibold leading-none",
  {
    variants: {
      variant: {
        category: "bg-[#edf3f8] text-[#315d89]",
        demo: "border border-[#e8d7a8] bg-[#fffaf0] tracking-[0.05em] text-[#84620e]",
      },
    },
    defaultVariants: {
      variant: "category",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
