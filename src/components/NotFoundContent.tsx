import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { StatusPage } from "@/components/StatusPage";

export function NotFoundContent() {
  return (
    <StatusPage
      code="404"
      title="Deze pagina bestaat niet"
      actions={
        <>
          <Link href="/planbord" className={buttonVariants({ size: "lg" })}>
            Naar het planbord
          </Link>
          <Link href="/log" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Wijzigingslog
          </Link>
        </>
      }
    >
      <p>De link klopt niet, of de medewerker of opdrachtgever is na een reset van de demo niet meer dezelfde.</p>
    </StatusPage>
  );
}
