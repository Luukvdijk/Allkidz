"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { LogOut, Menu, RotateCcw } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { logout, resetDemo } from "@/app/actions/demo";
import { BrandMark } from "@/components/BrandMark";

const NAV = [
  { href: "/planbord", label: "Planbord" },
  { href: "/aanvragen", label: "Aanvragen" },
  { href: "/tassen", label: "Tassen" },
  { href: "/medewerkers", label: "Medewerkers" },
  { href: "/log", label: "Wijzigingslog" },
  { href: "/berichten", label: "Berichten" },
  { href: "/instellingen", label: "Instellingen" },
];

interface Props {
  employees: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  messageCount: number;
  requestCount: number;
}

export function AppHeader({ employees, clients, messageCount, requestCount }: Props) {
  const pathname = usePathname();
  const plannerView = !pathname.startsWith("/medewerker") && !pathname.startsWith("/opdrachtgever");
  const [resetOpen, setResetOpen] = useState(false);
  const [pending, start] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);


  const doReset = () =>
    start(async () => {
      const r = await resetDemo();
      setResetOpen(false);
      if ("error" in r) toast.error(r.error);
      else toast.success("Demo teruggezet naar de testdata");
    });

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center gap-x-4 px-4 py-2.5">
        <Link href="/planbord" className="flex items-center gap-2 font-semibold tracking-tight">
          <BrandMark />
          <span>AllKidz Planning</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">demo</span>
        </Link>

        {plannerView && (
          <nav aria-label="Hoofdmenu" className="hidden gap-0.5 xl:flex">
            <NavLinks pathname={pathname} counts={{ "/berichten": messageCount, "/aanvragen": requestCount }} />
          </nav>
        )}

        <div className="ml-auto hidden items-center gap-2 xl:flex">
          <RoleSwitcher employees={employees} clients={clients} />
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

        <Button variant="ghost" size="icon" className="relative ml-auto xl:hidden" aria-label="Menu openen" onClick={() => setMenuOpen(true)}>
          <Menu className="size-5" />
          {plannerView && messageCount + requestCount > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" aria-hidden />}
        </Button>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-[85%] max-w-xs gap-0">
          <SheetHeader className="border-b">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-6 p-4">
            <div className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase">Bekijk als</span>
              <RoleSwitcher employees={employees} clients={clients} fullWidth onNavigate={() => setMenuOpen(false)} />
            </div>
            {plannerView && (
              <nav aria-label="Hoofdmenu" className="grid gap-1">
                <NavLinks pathname={pathname} counts={{ "/berichten": messageCount, "/aanvragen": requestCount }} large onNavigate={() => setMenuOpen(false)} />
              </nav>
            )}
            <div className="mt-auto grid gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => { setMenuOpen(false); setResetOpen(true); }}>
                <RotateCcw /> Reset demo
              </Button>
              <form action={logout} className="grid">
                <Button variant="ghost" type="submit">
                  <LogOut /> Uitloggen
                </Button>
              </form>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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

function NavLinks({ pathname, counts, large = false, onNavigate }: { pathname: string; counts: Record<string, number>; large?: boolean; onNavigate?: () => void }) {
  return NAV.map((n) => {
    const active = pathname.startsWith(n.href);
    return (
      <Link
        key={n.href}
        href={n.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center rounded-md whitespace-nowrap transition-colors",
          large ? "px-3 py-2.5 text-base" : "px-2.5 py-1.5 text-sm",
          active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {n.label}
        {(counts[n.href] ?? 0) > 0 && (
          <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">{counts[n.href]}</span>
        )}
      </Link>
    );
  });
}
