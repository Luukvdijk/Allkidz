export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse space-y-3 px-4 py-6" aria-busy="true" aria-label="Laden">
      <div className="h-8 w-64 rounded-md bg-muted" />
      <div className="h-10 w-full rounded-md bg-muted" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-20 rounded-lg bg-muted/70" />
      ))}
    </div>
  );
}
