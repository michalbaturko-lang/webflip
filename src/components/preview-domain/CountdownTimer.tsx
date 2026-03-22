"use client";

import { useEffect, useState } from "react";
import { Clock, AlertCircle, RefreshCw } from "lucide-react";

interface CountdownTimerProps {
  createdAt: string;
  recordId: string;
}

export default function CountdownTimer({
  createdAt,
  recordId,
}: CountdownTimerProps) {
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    function calculateDaysRemaining() {
      const created = new Date(createdAt);
      const expiryDate = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const now = new Date();

      const timeDiff = expiryDate.getTime() - now.getTime();
      const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      if (days <= 0) {
        setIsExpired(true);
        setDaysRemaining(0);
      } else {
        setIsExpired(false);
        setDaysRemaining(days);
      }
    }

    calculateDaysRemaining();
    const interval = setInterval(calculateDaysRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [createdAt]);

  const progressPercent = Math.max(0, (daysRemaining / 7) * 100);

  if (isExpired) {
    return (
      <section className="py-16 sm:py-24 bg-red-950/20 border-t border-b border-red-900/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-600/20 mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-red-400 mb-2">
              Platnost vypršela
            </h3>
            <p className="text-red-300/80 mb-6">
              Tato nabídka již není dostupná. Kontaktujte nás pro prodloužení nebo novou analýzu.
            </p>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" />
              Požádat o prodloužení
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 sm:py-24 bg-white/5 backdrop-blur-sm border-t border-white/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Timer icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 mb-6">
            <Clock className="w-8 h-8 text-blue-400" />
          </div>

          {/* Main countdown text */}
          <h3 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Zbývá {daysRemaining} {daysRemaining === 1 ? "den" : "dní"}
            </span>
          </h3>

          <p className="text-gray-400 text-lg mb-8">
            Nabídka platí do {new Date(new Date(createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("cs-CZ")}
          </p>

          {/* Progress bar */}
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-white whitespace-nowrap">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {daysRemaining === 7
                ? "Právě nyní"
                : `${7 - daysRemaining} ${7 - daysRemaining === 1 ? "den" : "dní"} uplynulo`}
            </p>
          </div>

          {/* Warning message */}
          {daysRemaining <= 2 && (
            <div className="mt-8 p-4 bg-amber-600/20 border border-amber-600/30 rounded-lg">
              <p className="text-amber-300 font-medium">
                ⚠️ Tato nabídka brzy vyprší. Rozhodněte se rychle!
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
