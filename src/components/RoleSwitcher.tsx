"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ProgressBar } from "@/components/NavProgress";
import { NativeSelect } from "@/components/ui/native-select";

interface Props {
  employees: { id: string; name: string }[];
  clients: { id: string; name: string }[];
}

/** "Bekijk als": switch between the planner, an employee (phone view) and a client, inside the same sandbox. */
export function RoleSwitcher({ employees, clients, fullWidth = false, onNavigate }: Props & { fullWidth?: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [, section, id] = pathname.split("/");
  const current = section === "medewerker" || section === "opdrachtgever" ? `/${section}/${id}` : "/planbord";
  // Show the chosen view right away; the select would otherwise snap back until the new page has loaded.
  const [value, setValue] = useOptimistic(current);

  return (
    <label className={fullWidth ? "grid text-sm" : "flex items-center gap-2 text-sm"}>
      {!fullWidth && <span className="hidden text-muted-foreground 2xl:inline">Bekijk als</span>}
      <NativeSelect
        aria-label="Bekijk als"
        value={value}
        onChange={(e) => {
          onNavigate?.();
          const href = e.target.value;
          startTransition(() => {
            setValue(href);
            router.push(href);
          });
        }}
        className={fullWidth ? "w-full" : "w-48"}
        aria-busy={pending}
      >
        <option value="/planbord">Planner (Sanne)</option>
        <optgroup label="Medewerker">
          {employees.map((e) => (
            <option key={e.id} value={`/medewerker/${e.id}`}>
              {e.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Opdrachtgever">
          {clients.map((c) => (
            <option key={c.id} value={`/opdrachtgever/${c.id}`}>
              {c.name}
            </option>
          ))}
        </optgroup>
      </NativeSelect>
      {pending && <ProgressBar />}
    </label>
  );
}
