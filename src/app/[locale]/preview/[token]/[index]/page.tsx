"use client";

import dynamic from "next/dynamic";

// Load the entire preview UI on client only — SSR hangs on Vercel serverless
const PreviewClient = dynamic(() => import("./PreviewClient"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "var(--bg-primary, #0a0a1a)" }}>
      <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full" />
    </div>
  ),
});

export default function PreviewPage() {
  return <PreviewClient />;
}
