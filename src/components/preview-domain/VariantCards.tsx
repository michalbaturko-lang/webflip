"use client";

import { useLocale } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Wand2 } from "lucide-react";

interface Variant {
  name?: string;
  screenshotUrl?: string;
  features?: string[];
}

interface VariantCardsProps {
  variants: Variant[];
  analysisToken?: string;
  domain: string;
}

export default function VariantCards({
  variants,
  analysisToken,
  domain,
}: VariantCardsProps) {
  const locale = useLocale();

  // Default variants if none provided
  const displayVariants = variants.length > 0 ? variants : [
    {
      name: "Moderní",
      features: ["Minimalistický design", "Rychlé načítání", "Mobilní optimalizace"],
    },
    {
      name: "Profesionální",
      features: ["Důvěryhodný vzhled", "SEO optimalizace", "Responsivní layout"],
    },
    {
      name: "Konverzní",
      features: ["Call-to-action prvky", "Conversions tracking", "Social proof"],
    },
  ];

  if (!analysisToken) {
    return (
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <p>Varianty nejsou dostupné</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              3 Redesigny na míru
            </span>
          </h2>
          <p className="text-gray-400 text-lg">
            Vyberte si variantu, která se vám líbí, a personalizujte ji
          </p>
        </div>

        {/* Variants grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {displayVariants.map((variant, index) => (
            <div
              key={index}
              className="group flex flex-col bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              {/* Screenshot */}
              {variant.screenshotUrl ? (
                <div className="relative h-64 sm:h-72 bg-gray-900 overflow-hidden">
                  <Image
                    src={variant.screenshotUrl}
                    alt={variant.name || `Varianta ${index + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="h-64 sm:h-72 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-lg inline-flex items-center justify-center mb-2">
                      <svg
                        className="w-6 h-6 text-purple-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">
                      {variant.name || `Varianta ${index + 1}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 p-6 flex flex-col">
                {/* Title */}
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">
                  {variant.name || `Varianta ${index + 1}`}
                </h3>

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-1">
                  {(variant.features || []).map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <span className="text-blue-400 text-lg mt-0.5 flex-shrink-0">
                        ✓
                      </span>
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action buttons */}
                <div className="flex flex-col gap-3">
                  <Link
                    href={`/${locale}/preview/${analysisToken}/${index}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white font-medium hover:bg-white/20 transition-colors"
                  >
                    Prohlédnout
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <button className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white font-medium hover:from-blue-500 hover:to-purple-500 transition-colors">
                    <Wand2 className="w-4 h-4" />
                    Vyzkoušet AI editor
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
