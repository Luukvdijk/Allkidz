"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { LogOut, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { logout, resetDemo } from "@/app/actions/demo";

const NAV = [
  { href: "/planbord", label: "Planbord" },
  { href: "/log", label: "Wijzigingslog" },
  { href: "/berichten", label: "Berichten" },
  { href: "/instellingen", label: "Instellingen" },
];

interface Props {
  employees: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  messageCount: number;
}

export function AppHeader({ employees, locations, messageCount }: Props) {
  const pathname = usePathname();
  const plannerView = !pathname.startsWith("/medewerker") && !pathname.startsWith("/opdrachtgever");
  const [resetOpen, setResetOpen] = useState(false);
  const [pending, start] = useTransition();

  const doReset = () =>
    start(async () => {
      const r = await resetDemo();
      setResetOpen(false);
      if ("error" in r) toast.error(r.error);
      else toast.success("Demo teruggezet naar de testdata");
    });

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Link href="/planbord" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            AK
          </span>
          <span>AllKidz Planning</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">demo</span>
        </Link>

        {plannerView && (
          <nav className="order-last -mx-1 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors",
                    active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {n.label}
                  {n.href === "/berichten" && messageCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
                      {messageCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          <RoleSwitcher employees={employees} locations={locations} />
          <Button variant="ghost" size="sm" onClick={() => setResetOpen(true)} title="Demo resetten">
            <RotateCcw />
            <span className="hidden lg:inline">Reset demo</span>
          </Button>
          <form action={logout}>
            <Button variant="ghost" size="icon-sm" type="submit" aria-label="Uitloggen" title="Uitloggen">
              <LogOut />
            </Button>
          </form>
        </div>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demo resetten?</DialogTitle>
            <DialogDescription>
              Alle wijzigingen in jouw demo (diensten, log en berichten) worden teruggezet naar de originele testdata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Annuleren</Button>} />
            <Button onClick={doReset} disabled={pending}>
              {pending ? "Bezig..." : "Resetten"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
