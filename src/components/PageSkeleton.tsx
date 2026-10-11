import { cn } from "cn";

/** One grey placeholder block. The whole skeleton pulses together, so blocks don't flicker on their own. */
function Bone({ className }: { className?: string }) {
  return <div className={cn("rounded-md bg-muted", className)} />;
}

function Shell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("animate-pulse motion-reduce:animate-none", className)} role="status" aria-busy="true" aria-label="Laden">
      {children}
    </div>
  );
}

/** Generic page: title, a filter row and a list of rows. */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Shell className="mx-auto max-w-[1600px] space-y-3 px-4 py-6">
      <Bone className="h-8 w-64" />
      <Bone className="h-10 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Bone key={i} className="h-20 rounded-lg bg-muted/70" />
      ))}
    </Shell>
  );
}

/** Planbord: toolbar, the five weekday tabs, filters, then employee cards in the same grid as the real board. */
export function PlanbordSkeleton() {
  return (
    <Shell className="mx-auto max-w-[1600px] space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Bone className="h-8 w-56" />
        <Bone className="h-7 w-16" />
        <Bone className="h-7 w-48" />
        <div className="ml-auto flex gap-2">
          <Bone className="h-7 w-36" />
          <Bone className="h-7 w-28" />
          <Bone className="h-7 w-32 bg-primary/25" />
        </div>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Bone key={i} className="h-12 min-w-24 flex-1 rounded-lg" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Bone className="h-8 w-full sm:w-72" />
        <Bone className="h-8 w-40" />
        <Bone className="h-8 w-40" />
        <Bone className="h-8 w-40" />
      </div>
      <Bone className="h-4 w-40" />
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-2 rounded-xl border bg-card p-3">
            <div className="flex items-center gap-2">
              <Bone className="size-8 rounded-full" />
              <Bone className="h-4 w-32" />
              <Bone className="ml-auto h-4 w-16" />
            </div>
            <Bone className="h-14 rounded-lg bg-muted/70" />
            {i % 2 === 0 && <Bone className="h-14 rounded-lg bg-muted/70" />}
          </div>
        ))}
      </div>
    </Shell>
  );
}

/** Employee app: coloured header, tabs, shift cards. */
export function EmployeeSkeleton() {
  return (
    <Shell className="md:mx-auto md:max-w-5xl md:px-4 md:py-6">
      <div className="space-y-2 bg-primary/25 px-4 pt-4 pb-3 md:rounded-xl md:px-6 md:py-5">
        <Bone className="h-3 w-32 bg-primary/30" />
        <Bone className="h-6 w-40 bg-primary/30" />
        <Bone className="h-3 w-24 bg-primary/30" />
      </div>
      <div className="space-y-3 p-4 md:px-0">
        <Bone className="h-8 w-full md:w-80" />
        <div className="grid gap-2 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Bone key={i} className="h-28 rounded-xl bg-muted/70" />
          ))}
        </div>
      </div>
    </Shell>
  );
}

/** Client portal: title, tabs, and the day timeline with one row per location. */
export function ClientSkeleton() {
  return (
    <Shell className="space-y-4">
      <div className="space-y-1.5">
        <Bone className="h-4 w-40" />
        <Bone className="h-7 w-64" />
      </div>
      <div className="flex gap-3 border-b pb-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-5 w-20" />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Bone className="h-8 w-44" />
        <Bone className="ml-auto h-8 w-52" />
      </div>
      <div className="divide-y rounded-xl border bg-card">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="grid grid-cols-[13rem_1fr] gap-3 p-3 max-sm:grid-cols-1">
            <Bone className="h-10" />
            <Bone className={cn("h-10 rounded-lg bg-muted/70", i % 2 ? "w-2/3" : "w-full")} />
          </div>
        ))}
      </div>
    </Shell>
  );
}

/** Planner's employee page: name, four stats, week bars and the shift list beside a side column. */
export function EmployeeDetailSkeleton() {
  return (
    <Shell className="space-y-6">
      <div className="space-y-4">
        <Bone className="h-4 w-32" />
        <div className="flex items-center gap-3">
          <Bone className="size-12 rounded-full" />
          <div className="space-y-1.5">
            <Bone className="h-6 w-40" />
            <Bone className="h-4 w-28" />
          </div>
        </div>
      </div>
      <Bone className="h-20 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Bone className="h-44 rounded-xl bg-muted/70" />
          <div className="space-y-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Bone key={i} className="h-11 bg-muted/70" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <Bone className="h-16 rounded-xl" />
          <Bone className="h-32 rounded-xl" />
        </div>
      </div>
    </Shell>
  );
}
