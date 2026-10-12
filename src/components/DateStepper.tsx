import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

const UNIT = { dag: "dag", week: "week", maand: "maand" } as const;

/**
 * Previous / title / next. The arrows sit around the date they change, and the title has a minimum width
 * so the right arrow does not move while clicking through days of different lengths.
 */
export function DateStepper({
  unit,
  onStep,
  children,
  className,
  titleClassName,
}: {
  unit: keyof typeof UNIT;
  onStep: (dir: 1 | -1) => void;
  children: ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button variant="outline" size="icon-sm" aria-label={`Vorige ${UNIT[unit]}`} onClick={() => onStep(-1)}>
        <ChevronLeft />
      </Button>
      <div className={cn("min-w-44 px-1 text-center", titleClassName)}>{children}</div>
      <Button variant="outline" size="icon-sm" aria-label={`Volgende ${UNIT[unit]}`} onClick={() => onStep(1)}>
        <ChevronRight />
      </Button>
    </div>
  );
}
