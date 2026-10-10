import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";

/** Native <select> styled like the other inputs: fast, accessible and works well on phones. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative inline-flex", className)}>
      <select
        data-slot="native-select"
        className="h-8 w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-input bg-background py-1 pr-8 pl-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { NativeSelect };
