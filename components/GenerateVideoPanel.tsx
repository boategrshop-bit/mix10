"use client";

import { useEffect, useState } from "react";
import MockVideoPlayer from "./MockVideoPlayer";
import ErrorBanner from "./ErrorBanner";
import type { VideoJobResult } from "@/lib/types";
import type { Orientation } from "@/lib/prompt-template";

interface GenerateVideoPanelProps {
  canGenerate: boolean;
  orientation: Orientation;
  onGenerate: () => Promise<VideoJobResult>;
  onStartOver: () => void;
}

export default function GenerateVideoPanel({
  canGenerate,
  orientation,
  onGenerate,
  onStartOver,
}: GenerateVideoPanelProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<VideoJobResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 95));
    }, 300);
    return () => clearInterval(interval);
  }, [loading]);

  async function handleClick() {
    setProgress(0);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const job = await onGenerate();
      setProgress(100);
      setResult(job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate video. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result?.status === "completed" && result.placeholder) {
    return (
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm">
        <MockVideoPlayer placeholder={result.placeholder} orientation={orientation} />
        <p className="text-xs text-gray-500">
          แก้ไขข้อความบนภาพ/เสียงพากย์ หรือพรอมต์วิดีโอด้านบนได้ แล้วกด Regenerate Video เพื่อสร้างใหม่
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClick}
            disabled={!canGenerate}
            className="flex-1 rounded-lg bg-gradient-to-r from-[#5a9bd4] to-[#4382BB] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:shadow-lg hover:shadow-[#4382BB]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Regenerate Video
          </button>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              onStartOver();
            }}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-medium text-gray-300 shadow-sm transition hover:bg-white/5"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <button
        type="button"
        disabled={!canGenerate || loading}
        onClick={handleClick}
        className="w-full rounded-xl bg-gradient-to-r from-[#5a9bd4] to-[#4382BB] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg hover:shadow-[#4382BB]/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        {loading ? "กำลังสร้างวิดีโอ..." : "Generate Video"}
      </button>
      {loading && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-[#5a9bd4] to-[#4382BB] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {error && <ErrorBanner title="Video generation failed" message={error} />}
    </div>
  );
}
