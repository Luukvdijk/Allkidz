"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
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
import { CLIENT_TABS, clientTabFrom, goToClientTab } from "@/components/opdrachtgever/tabs";

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
  const clientView = pathname.startsWith("/opdrachtgever");
  const plannerView = !pathname.startsWith("/medewerker") && !clientView;
  const clientTab = clientTabFrom(useSearchParams().get("tab"));
  const [resetOpen, setResetOpen] = useState(false);
  const [pending, start] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const { rowRef, logoRef, navRef, toolsRef, fits } = useFitsInline(pathname);

  const doReset = () =>
    start(async () => {
      const r = await resetDemo();
      setResetOpen(false);
      if ("error" in r) toast.error(r.error);
      else toast.success("Demo teruggezet naar de testdata");
    });

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div ref={rowRef} className="relative mx-auto flex max-w-[1600px] items-center gap-x-4 px-4 py-2.5">
        <Link ref={logoRef} href="/planbord" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <BrandMark />
          <span>AllKidz Planning</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">demo</span>
        </Link>

        {plannerView && (
          <nav ref={navRef} aria-label="Hoofdmenu" inert={fits === false} className={cn("shrink-0 gap-0.5", inlineClass(fits))}>
            <NavLinks pathname={pathname} counts={{ "/berichten": messageCount, "/aanvragen": requestCount }} />
          </nav>
        )}

        <div ref={toolsRef} inert={fits === false} className={cn("ml-auto shrink-0 items-center gap-2", inlineClass(fits))}>
          <RoleSwitcher employees={employees} clients={clients} />
          <Button variant="ghost" size="sm" onClick={() => setResetOpen(true)} title="Demo resetten" aria-label="Reset demo">
            <RotateCcw />
            <span className="hidden 2xl:inline">Reset demo</span>
          </Button>
          <form action={logout}>
            <Button variant="ghost" size="icon-sm" type="submit" aria-label="Uitloggen" title="Uitloggen">
              <LogOut />
            </Button>
          </form>
        </div>

        <Button variant="ghost" size="icon" className={cn("relative ml-auto", fits === null ? "xl:hidden" : fits && "hidden")} aria-label="Menu openen" onClick={() => setMenuOpen(true)}>
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
            {clientView && (
              <nav aria-label="Opdrachtgeversportaal" className="grid gap-1">
                {CLIENT_TABS.map(({ t, label }) => (
                  <button
                    key={t}
                    type="button"
                    aria-current={clientTab === t ? "page" : undefined}
                    onClick={() => { goToClientTab(t); setMenuOpen(false); }}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2.5 text-left text-base transition-colors",
                      clientTab === t ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
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

/**
 * Shows the inline menu only when it really fits, so a laptop gets the menu bar and not the hamburger.
 * Until measured (first paint) the xl breakpoint decides; when it does not fit the inline parts stay
 * in the DOM but invisible and inert, so their natural width can still be measured.
 */
function useFitsInline(pathname: string) {
  const rowRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState<boolean | null>(null);
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const style = getComputedStyle(row);
      const available = row.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const parts = [logoRef.current, navRef.current, toolsRef.current].filter((x): x is NonNullable<typeof x> => x !== null);
      const needed = parts.reduce((w, el) => w + el.scrollWidth, 0) + parseFloat(style.columnGap) * (parts.length - 1);
      setFits(needed <= available);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    for (const el of [navRef.current, toolsRef.current]) if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [pathname]); // the planner nav comes and goes per page
  return { rowRef, logoRef, navRef, toolsRef, fits };
}

const inlineClass = (fits: boolean | null) => (fits === null ? "hidden xl:flex" : fits ? "flex" : "flex invisible absolute pointer-events-none");

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
          large ? "px-3 py-2.5 text-base" : "px-2 py-1.5 text-sm",
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
