"use client";

import { useState } from "react";
import { CreditCard, Loader2, ArrowRight } from "lucide-react";

interface CTASectionProps {
  domain: string;
  recordId: string;
}

export default function CTASection({ domain, recordId }: CTASectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          recordId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }

      setError("Nepodařilo se iniciovat platbu. Zkuste znovu.");
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Došlo k chybě. Zkuste znovu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-white/5 to-white/2 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Chci nový web
            </span>
          </h2>
          <p className="text-lg text-gray-400">
            Začněte s jedním ze tří designů a nechte nás jej pro vás dokonč
            it
          </p>
        </div>

        {/* Pricing card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 sm:p-12 mb-8">
          {/* Price */}
          <div className="text-center mb-8">
            <div className="inline-block">
              <span className="text-6xl font-bold text-white">99 €</span>
              <p className="text-gray-400 text-lg mt-2">
                Kompletní web redesign
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-8 bg-white/5 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-4">Co je součástí:</h3>
            <ul className="space-y-3">
              {[
                "3 profesionální redesigny",
                "Mobilní optimalizace",
                "SEO optimalizace",
                "Implementace na vaší stránce",
                "Technická podpora",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-green-500/20">
                    <svg
                      className="h-3 w-3 text-green-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-600/20 border border-red-600/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-200 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Přesměrování na platbu...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pokračovat na platbu
              </>
            )}
          </button>

          <p className="text-center text-gray-500 text-sm mt-4">
            Bezpečná platba přes Stripe. Bez skrytých poplatků.
          </p>
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {[
            { icon: "🔒", title: "Bezpečná platba", desc: "Chráněná SSL" },
            { icon: "⚡", title: "Rychlé doručení", desc: "Během 24 hodin" },
            { icon: "💬", title: "Podpora 24/7", desc: "Jsme tu pro vás" },
          ].map((badge) => (
            <div key={badge.title} className="p-4">
              <div className="text-2xl mb-2">{badge.icon}</div>
              <p className="font-semibold text-white text-sm">{badge.title}</p>
              <p className="text-gray-500 text-xs mt-1">{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
