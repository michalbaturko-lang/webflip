"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scan, FileText, Radar } from "lucide-react";

interface Props {
  url: string;
  pages: { url: string; title: string }[];
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

function getPathFromUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export default function StageCrawling({ url, pages }: Props) {
  const domain = getDomainFromUrl(url);
  const [currentUrlIdx, setCurrentUrlIdx] = useState(0);
  const [radarAngle, setRadarAngle] = useState(0);

  const simulatedPaths = ["/", "/o-nas", "/kontakt", "/sluzby", "/reference", "/blog"];

  // Cycle simulated paths when no pages yet
  useEffect(() => {
    if (pages.length > 0) return;
    const interval = setInterval(() => {
      setCurrentUrlIdx((prev) => (prev + 1) % simulatedPaths.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [pages.length]);

  // Radar sweep animation
  useEffect(() => {
    const interval = setInterval(() => {
      setRadarAngle((prev) => (prev + 3) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const currentCrawlUrl =
    pages.length > 0
      ? pages[pages.length - 1]?.url
      : `https://${domain}${simulatedPaths[currentUrlIdx]}`;

  const maxPages = 10;

  return (
    <motion.div
      key="crawling"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto"
    >
      {/* Radar / Scanner visual */}
      <div className="relative h-36 w-36">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border border-cyan-500/20" />
        <div className="absolute inset-3 rounded-full border border-cyan-500/15" />
        <div className="absolute inset-6 rounded-full border border-cyan-500/10" />

        {/* Radar sweep */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from ${radarAngle}deg, transparent 0deg, rgba(6,182,212,0.3) 30deg, transparent 60deg)`,
          }}
        />

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Radar className="h-8 w-8 text-cyan-400" />
          </motion.div>
        </div>

        {/* Ping dots for discovered pages */}
        {pages.slice(0, 6).map((_, i) => {
          const angle = (i * 60 + 30) * (Math.PI / 180);
          const r = 52;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          return (
            <motion.div
              key={i}
              className="absolute h-2 w-2 rounded-full bg-cyan-400"
              style={{
                left: `calc(50% + ${x}px - 4px)`,
                top: `calc(50% + ${y}px - 4px)`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: [0, 1, 0.6] }}
              transition={{ duration: 0.5, delay: i * 0.2 }}
            />
          );
        })}
      </div>

      {/* Title & status */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Skenujeme {domain}
        </h2>
        <p className="text-cyan-400 font-mono text-sm">
          {pages.length > 0 ? `Nalezeno ${pages.length} stránek` : "Hledáme stránky..."}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
          <span>Průběh crawlování</span>
          <span className="text-cyan-400 font-mono">{pages.length}/{maxPages}</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bar-bg)" }}>
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max((pages.length / maxPages) * 100, 5)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Live crawl URL indicator */}
      <motion.div
        className="glass rounded-xl px-5 py-3 w-full max-w-md"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="h-2.5 w-2.5 rounded-full bg-cyan-400"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-xs font-mono truncate" style={{ color: "var(--text-secondary)" }}>
            Načítáme {domain}{getPathFromUrl(currentCrawlUrl)}...
          </span>
        </div>
      </motion.div>

      {/* Discovered pages grid */}
      {pages.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
          <AnimatePresence>
            {pages.map((page, i) => (
              <motion.div
                key={page.url}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08, ease: "easeOut" }}
                className="glass rounded-lg px-3 py-2.5 flex items-center gap-2.5"
              >
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-cyan-400/10 shrink-0">
                  <FileText className="h-3 w-3 text-cyan-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium block truncate" style={{ color: "var(--text-primary)" }}>
                    {page.title || getPathFromUrl(page.url)}
                  </span>
                  <span className="text-[10px] font-mono truncate block" style={{ color: "var(--text-muted)" }}>
                    {getPathFromUrl(page.url)}
                  </span>
                </div>
                <Scan className="h-3 w-3 text-cyan-400/50 shrink-0" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
