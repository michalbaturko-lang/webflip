"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface PreviewHeroProps {
  companyName: string;
  videoUrl: string | null;
  autoPlay?: boolean;
}

export default function PreviewHero({
  companyName,
  videoUrl,
  autoPlay = false,
}: PreviewHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  useEffect(() => {
    if (videoRef.current) {
      if (autoPlay) {
        videoRef.current.play().catch((err) => {
          console.error("Auto-play failed:", err);
        });
      }
    }
  }, [autoPlay]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-12 sm:pt-20">
      {/* Dark gradient background matching video style */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#1a0a2e] to-[#1a0533] z-0" />

      {/* Animated accent elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-4xl w-full px-4 sm:px-6 lg:px-8 mx-auto">
        {/* Headline */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
              Nový web pro {companyName}
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
            Webflipper.com analyzoval váš web a připravil 3 redesigny na míru
          </p>
        </div>

        {/* Video embed or placeholder */}
        {videoUrl ? (
          <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 aspect-video">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-cover"
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Custom play/pause overlay for better UX */}
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors cursor-pointer group"
              onClick={togglePlay}
              style={{ display: isPlaying ? "none" : "flex" }}
            >
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden shadow-2xl border border-white/10 aspect-video flex items-center justify-center">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-600/20 mb-4">
                <svg
                  className="w-8 h-8 text-purple-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm4 2v4h8V8H6z" />
                </svg>
              </div>
              <p className="text-gray-400 font-medium">Video se připravuje...</p>
              <p className="text-sm text-gray-500 mt-2">
                Vraťte se za chvíli
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
