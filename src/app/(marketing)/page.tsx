import { Hero } from "@/components/marketing/Hero";
import {
  AiSection,
  Features,
  FinalCta,
  HowItWorks,
  Premise,
  Pricing,
  Tiles,
} from "@/components/marketing/Sections";
import { getUser } from "@/lib/dal";

export default async function LandingPage() {
  const user = await getUser();
  const signedIn = Boolean(user);

  return (
    <>
      <Hero signedIn={signedIn} />
      <Premise />
      <HowItWorks />
      <Features />
      <Tiles />
      <AiSection />
      <Pricing />
      <FinalCta signedIn={signedIn} />
    </>
  );
}
