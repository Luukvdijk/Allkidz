export const CLIENT_TABS = [
  { t: "planning", label: "Planning" },
  { t: "aanvragen", label: "Aanvragen" },
  { t: "locaties", label: "Locaties" },
  { t: "meldingen", label: "Meldingen" },
] as const;

export type ClientTab = (typeof CLIENT_TABS)[number]["t"];

/** The client portal keeps its tab in `?tab=`, so the header menu can switch it too. */
export function clientTabFrom(param: string | null): ClientTab {
  return CLIENT_TABS.find((x) => x.t === param)?.t ?? "planning";
}

/** Switch tab without a server round trip; Next keeps useSearchParams in sync with history.pushState. */
export function goToClientTab(t: ClientTab) {
  const url = new URL(window.location.href);
  if (t === "planning") url.searchParams.delete("tab");
  else url.searchParams.set("tab", t);
  window.history.pushState(null, "", url);
}
