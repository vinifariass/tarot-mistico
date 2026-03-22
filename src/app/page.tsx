import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { TarotCardsSection } from "@/components/TarotCardsSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { PricingSection } from "@/components/PricingSection";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-void">
      <Navbar />
      <HeroSection />
      <TarotCardsSection />
      <HowItWorksSection />
      <PricingSection />
      <Footer />
    </main>
  );
}
