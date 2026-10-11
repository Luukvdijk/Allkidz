"use client";

import "./globals.css";

/** Last resort when even the root layout fails: plain page with its own html and body. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="nl">
      <body className="flex min-h-dvh items-center bg-background px-4 font-sans text-foreground">
        <main className="mx-auto max-w-md space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">De demo kon niet laden</h1>
          <p className="text-muted-foreground">Probeer het opnieuw. Lukt het niet, log dan opnieuw in om een schone kopie van de testdata te krijgen.</p>
          {error.digest && <p className="text-xs text-muted-foreground">Foutcode: {error.digest}</p>}
          <div className="flex gap-2 pt-2">
            <button onClick={reset} className="press rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
              Probeer opnieuw
            </button>
            <a href="/login" className="press rounded-lg border px-3 py-2 text-sm font-medium">
              Naar inloggen
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
