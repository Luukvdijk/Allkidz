import type { Metadata } from "next";
import { NotFoundContent } from "@/components/NotFoundContent";

export const metadata: Metadata = { title: "Niet gevonden | AllKidz Planning (demo)" };

export default function NotFound() {
  return <NotFoundContent />;
}
