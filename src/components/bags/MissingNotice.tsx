import { TriangleAlert } from "lucide-react";
import { cn } from "cn";
import type { MissingReport, PlanData } from "@/lib/types";
import { missingFor } from "@/lib/bags";
import { dayMonth } from "@/lib/time";

/** Yellow notice listing what is reported missing from a bag. Renders nothing when the bag is complete. */
export function MissingNotice({ bagId, data, hint, className }: { bagId: string | null | undefined; data: PlanData; hint?: string; className?: string }) {
  const reports = missingFor(bagId, data);
  if (reports.length === 0) return null;
  const bag = data.bags?.find((b) => b.id === bagId);
  const who = new Map(data.employees.map((e) => [e.id, e.name]));
  return (
    <div role="status" className={cn("rounded-md border border-warn/60 bg-warn/15 p-2 text-xs text-warn-foreground transition-[opacity,translate] duration-200 starting:-translate-y-1 starting:opacity-0", className)}>
      <p className="flex items-center gap-1.5 font-medium">
        <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
        In {bag?.label ?? "deze tas"} mist iets
      </p>
      <ul className="mt-1 space-y-0.5 pl-5">
        {reports.map((m) => (
          <li key={m.id} className="list-disc">
            {m.text} <span className="opacity-75">({reportedBy(m, who)})</span>
          </li>
        ))}
      </ul>
      {hint && <p className="mt-1">{hint}</p>}
    </div>
  );
}

function reportedBy(m: MissingReport, who: Map<string, string>) {
  const name = m.employeeId ? who.get(m.employeeId) : null;
  return `gemeld ${dayMonth(m.createdAt.slice(0, 10))}${name ? ` door ${name}` : ""}`;
}
