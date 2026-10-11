import { BrandMark } from "@/components/BrandMark";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <BrandMark /> AllKidz Planning
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Inloggen op de demo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Elke keer dat je inlogt krijg je een eigen, schone kopie van de fictieve testdata. Wat je wijzigt ziet
            niemand anders.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
