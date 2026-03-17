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
import type { AnalysisStatus } from "@/types/stepper";

export default function HomePage() {
  const [analysis, setAnalysis] = useState<{
    url: string;
    token: string;
  } | null>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  // Stepper state driven by orchestrator
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus | undefined>();
  const [variantCount, setVariantCount] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [analysisEmail, setAnalysisEmail] = useState<string | undefined>();

  const handleAnalyze = useCallback((url: string, email?: string) => {
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    const token =
      btoa(normalizedUrl).replace(/[/+=]/g, "").slice(0, 12) +
      Date.now().toString(36);

    setAnalysis({ url: normalizedUrl, token });
    setAnalysisEmail(email);
    setAnalysisStatus("pending");
    setVariantCount(0);
    setAnalysisError(null);

    // Scroll to analysis results after render
    setTimeout(() => {
      analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const handleStatusChange = useCallback((status: string, variants: number, error: string | null) => {
    setAnalysisStatus(status as AnalysisStatus);
    setVariantCount(variants);
    setAnalysisError(error);
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
            email={analysisEmail}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      <ConversionStepper
        analysisStatus={analysisStatus}
        variantCount={variantCount}
        errorMessage={analysisError ?? undefined}
      />
      <AnalysisDemo />
      <ROICalculator />
      <FAQ />
      <FinalCTA onAnalyze={handleAnalyze} />
      <Footer />
    </main>
  );
}
