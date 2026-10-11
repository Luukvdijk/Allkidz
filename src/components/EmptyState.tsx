import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";

/** Empty list: what is missing and how it gets filled, instead of a bare "Geen ...". */
export function EmptyState({ icon: Icon, title, children, className }: { icon: LucideIcon; title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card/50 px-6 py-10 text-center", className)}>
      <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-[46ch] text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
