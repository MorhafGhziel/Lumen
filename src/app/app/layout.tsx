import type { Metadata } from "next";
import { requireUser, getProfile } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Workspace",
  // The app is behind auth, so there is nothing here worth indexing.
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts already redirects signed-out visitors. This is the real check,
  // sitting next to the data rather than at the edge.
  await requireUser();
  await getProfile();

  return <div className="h-dvh overflow-hidden bg-paper">{children}</div>;
}
