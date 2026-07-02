"use client";

import { useState } from "react";

interface CaptionHashtagBoxProps {
  caption: string;
  hashtags: string[];
  loading: boolean;
  onRegenerate: () => void;
}

export default function CaptionHashtagBox({ caption, hashtags, loading, onRegenerate }: CaptionHashtagBoxProps) {
  const [copied, setCopied] = useState(false);
  const combinedText = [caption, hashtags.join(" ")].filter(Boolean).join("\n\n");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(combinedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard permission denied; user can still select-and-copy manually
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-100">แคปชั่น + แฮชแท็ก (พร้อมโพสต์)</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={loading}
            className="text-xs font-medium text-[#7bafdb] underline underline-offset-2 transition hover:text-[#a3c8e6] disabled:opacity-40"
          >
            {loading ? "กำลังสร้างใหม่..." : "สร้างใหม่"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={loading || !combinedText}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-medium text-gray-300 shadow-sm transition hover:bg-white/5 disabled:opacity-40"
          >
            {copied ? "คัดลอกแล้ว!" : "คัดลอก"}
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex h-24 animate-pulse items-center justify-center rounded-xl bg-[#4382BB]/10 text-xs text-[#7bafdb]">
          กำลังคิดแคปชั่น...
        </div>
      ) : (
        <textarea
          readOnly
          value={combinedText}
          rows={6}
          className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-gray-300"
        />
      )}
    </div>
  );
}
