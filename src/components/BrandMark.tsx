import { cn } from "cn";

/** "AK" on black with the three AllKidz colours underneath. Not the AllKidz logo itself, only its colours. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid size-7 place-items-center overflow-hidden rounded-md bg-brand-ink text-xs font-bold text-white", className)} aria-hidden>
      AK
      <span className="absolute inset-x-0 bottom-0 grid h-1 grid-cols-3">
        <span className="bg-brand-yellow" />
        <span className="bg-brand-blue" />
        <span className="bg-brand-pink" />
      </span>
    </span>
  );
}
