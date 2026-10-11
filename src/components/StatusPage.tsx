import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";

/** Shared layout for the 404 and error pages: brand, a big code, what happened, and a way back. */
export function StatusPage({ code, title, children, actions }: { code: string; title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-4 py-16 md:grid-cols-[1fr_1.2fr] md:py-24">
      <div className="flex items-center gap-4 md:flex-col md:items-start">
        <BrandMark className="size-12 text-base" />
        <p className="text-6xl font-bold tracking-tighter text-foreground/10 tabular-nums md:text-8xl" aria-hidden>
          {code}
        </p>
      </div>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        <div className="max-w-[60ch] space-y-2 text-muted-foreground">{children}</div>
        <div className="flex flex-wrap gap-2 pt-2">{actions}</div>
      </div>
    </main>
  );
}
