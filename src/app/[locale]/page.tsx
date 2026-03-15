"use client";

import { useState, useRef, useCallback } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ConversionStepper from "@/components/landing/ConversionStepper";
import AnalysisDemo from "@/components/landing/AnalysisDemo";
import ROICalculator from "@/components/landing/ROICalculator";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
import AnalysisOrchestrator from "@/components/analysis/AnalysisOrchestrator";

export default function HomePage() {
  const [analysis, setAnalysis] = useState<{
    url: string;
    token: string;
  } | null>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = useCallback((url: string) => {
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    const token =
      btoa(normalizedUrl).replace(/[/+=]/g, "").slice(0, 12) +
      Date.now().toString(36);

    setAnalysis({ url: normalizedUrl, token });

    // Scroll to analysis results after render
    setTimeout(() => {
      analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero onAnalyze={handleAnalyze} />

      {/* Analysis results — shown inline after URL submission */}
      {analysis && (
        <div ref={analysisRef} id="analysis-results" className="scroll-mt-20">
          <AnalysisOrchestrator
            url={analysis.url}
            token={analysis.token}
          />
        </div>
      )}

      <ConversionStepper />
      <AnalysisDemo />
      <ROICalculator />
      <FAQ />
      <FinalCTA onAnalyze={handleAnalyze} />
      <Footer />
    </main>
  );
}
