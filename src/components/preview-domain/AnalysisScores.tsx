"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

interface ScoresData {
  performance?: number;
  seo?: number;
  security?: number;
  ux?: number;
  accessibility?: number;
  aiVisibility?: number;
  overall?: number;
}

interface AnalysisScoresProps {
  recordId: string;
  analysisToken?: string;
}

const SCORE_CATEGORIES = [
  { key: "performance", label: "Rychlost", icon: "⚡" },
  { key: "ux", label: "Mobil", icon: "📱" },
  { key: "seo", label: "SEO", icon: "🔍" },
  { key: "security", label: "Bezpečnost", icon: "🔒" },
  { key: "accessibility", label: "Přístupnost", icon: "♿" },
  { key: "aiVisibility", label: "AI viditelnost", icon: "🤖" },
];

export default function AnalysisScores({
  recordId,
  analysisToken,
}: AnalysisScoresProps) {
  const [scores, setScores] = useState<ScoresData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!analysisToken) {
      setLoading(false);
      return;
    }

    async function fetchAnalysis() {
      try {
        const res = await fetch(`/api/analyze/${analysisToken}`, {
          method: "GET",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.scores) {
            setScores(data.scores);
          }
        }
      } catch (err) {
        console.error("Failed to fetch analysis:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [analysisToken]);

  if (loading) {
    return (
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-white/10 rounded-lg w-1/3" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-white/10 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!scores) {
    return (
      <section className="py-16 sm:py-24 bg-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
            <p className="text-gray-400">Analýza není zatím dostupná</p>
          </div>
        </div>
      </section>
    );
  }

  const overallScore = Math.round(scores.overall || 0);

  return (
    <section className="py-16 sm:py-24 bg-white/5 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Výsledky analýzy
          </span>
        </h2>

        {/* Overall Score Circle */}
        <div className="flex justify-center mb-16">
          <div className="relative w-40 h-40 sm:w-48 sm:h-48">
            {/* Circle background */}
            <svg
              className="absolute inset-0"
              viewBox="0 0 200 200"
              style={{ filter: "drop-shadow(0 0 20px rgba(139, 92, 246, 0.3))" }}
            >
              <circle
                cx="100"
                cy="100"
                r="95"
                fill="none"
                stroke="rgba(139, 92, 246, 0.2)"
                strokeWidth="2"
              />
              <circle
                cx="100"
                cy="100"
                r="95"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="4"
                strokeDasharray={`${(overallScore / 100) * 597} 597`}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
              />
              <defs>
                <linearGradient
                  id="scoreGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>

            {/* Score text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {overallScore}
              </span>
              <span className="text-xs sm:text-sm text-gray-400 mt-2">
                ze 100
              </span>
            </div>
          </div>
        </div>

        {/* Individual scores grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {SCORE_CATEGORIES.map((category) => {
            const score = Math.round(scores[category.key as keyof ScoresData] || 0);
            const scorePercent = (score / 100) * 100;

            return (
              <div
                key={category.key}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 sm:p-6 hover:bg-white/10 transition-colors"
              >
                {/* Icon and label */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{category.icon}</span>
                  <h3 className="font-semibold text-white text-sm sm:text-base">
                    {category.label}
                  </h3>
                </div>

                {/* Score number */}
                <div className="mb-3">
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    {score}
                  </span>
                  <span className="text-gray-500 text-xs ml-1">/100</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${scorePercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
