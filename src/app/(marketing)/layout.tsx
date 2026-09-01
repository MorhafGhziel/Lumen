import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { getUser } from "@/lib/dal";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolved on the server so the nav renders with the right call to action on
  // first paint. A signed-in visitor should never be shown "Start free" and
  // then have it swap to "Open Lumen" a beat later.
  const user = await getUser();

  return (
    <div className="min-h-dvh bg-paper">
      <Nav signedIn={Boolean(user)} />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}
