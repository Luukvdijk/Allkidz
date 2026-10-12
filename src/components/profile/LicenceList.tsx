import { cn } from "cn";
import type { Licence } from "@/lib/types";
import { dayMonth } from "@/lib/time";
import { licenceStatus } from "@/lib/licences";

export { licenceStatus, type LicenceStatus } from "@/lib/licences";

const ORDER = ["VOG", "EHBO", "Kinder-EHBO", "BHV", "Toezicht zwembad"];

export function LicenceList({ licences, today, compact = false }: { licences: Licence[]; today: string; compact?: boolean }) {
  const sorted = [...licences].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
  if (sorted.length === 0) return <p className="text-sm text-muted-foreground">Geen licenties bekend.</p>;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", !compact && "gap-2")}>
      {sorted.map((l) => {
        const st = licenceStatus(l, today);
        return (
          <li
            key={l.type}
            className={cn(
              "rounded-md border px-2 py-0.5 text-xs",
              st === "ok" && "border-ok/40 bg-ok/10 text-foreground",
              st === "soon" && "border-warn bg-warn/15 text-warn-foreground",
              st === "expired" && "border-destructive/50 bg-destructive/10 text-destructive",
            )}
          >
            <span className="font-medium">{l.type}</span>
            {!compact && (
              <span className="ml-1 opacity-80">
                {l.expiresOn === null ? "in orde" : st === "expired" ? `verlopen op ${dayMonth(l.expiresOn)}` : `geldig t/m ${dayMonth(l.expiresOn)} ${l.expiresOn.slice(0, 4)}`}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
