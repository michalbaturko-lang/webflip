import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import AnalysisDemo from "@/components/landing/AnalysisDemo";
import ROICalculator from "@/components/landing/ROICalculator";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <AnalysisDemo />
      <ROICalculator />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
