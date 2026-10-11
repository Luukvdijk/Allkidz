"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusPage } from "@/components/StatusPage";

/** Something broke while loading a page. The header stays, so the planner can always switch view. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      code="Oeps"
      title="Er ging iets mis bij het laden"
      actions={
        <>
          <Button
            size="lg"
            disabled={pending}
            onClick={() =>
              start(() => {
                router.refresh();
                reset();
              })
            }
          >
            <RotateCcw className={pending ? "animate-spin [animation-direction:reverse]" : undefined} />
            {pending ? "Bezig..." : "Probeer opnieuw"}
          </Button>
          <Link href="/planbord" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Naar het planbord
          </Link>
        </>
      }
    >
      <p>Je gegevens zijn niet kwijt: alles wat je hebt opgeslagen staat nog in de demo. Meestal helpt het om het opnieuw te proberen.</p>
      {error.digest && <p className="text-xs">Foutcode: <code className="font-mono">{error.digest}</code></p>}
    </StatusPage>
  );
}
