"use client";

import { useLinkStatus } from "next/link";

/** Thin bar along the top of the window while a page is on its way. Shows only after 150ms. */
export function ProgressBar() {
  return (
    <div
      role="progressbar"
      aria-label="Pagina laden"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden opacity-0 [animation:nav-progress-in_150ms_var(--ease-out)_150ms_forwards]"
    >
      <div className="nav-progress-bar h-full w-2/5 rounded-full bg-primary [animation:nav-progress_1.1s_var(--ease-in-out)_infinite]" />
    </div>
  );
}

/** Put inside a <Link>: shows the progress bar while that link's navigation is pending. */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <ProgressBar /> : null;
}
