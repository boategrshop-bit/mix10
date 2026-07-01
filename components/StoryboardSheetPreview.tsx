"use client";

import ErrorBanner from "./ErrorBanner";

interface StoryboardSheetPreviewProps {
  imageBase64: string | null;
  loading: boolean;
  error: { title: string; message: string; details?: string } | null;
  onRegenerate: () => void;
}

export default function StoryboardSheetPreview({
  imageBase64,
  loading,
  error,
  onRegenerate,
}: StoryboardSheetPreviewProps) {
  function handleDownload() {
    if (!imageBase64) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${imageBase64}`;
    link.download = `storyboard-${Date.now()}.png`;
    link.click();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm">
      <p className="text-sm font-semibold text-gray-100">สตอรี่บอร์ด</p>
      {loading && (
        <div className="flex h-48 animate-pulse items-center justify-center rounded-xl bg-[#4382BB]/10 text-xs text-[#7bafdb]">
          กำลังสร้างภาพสตอรี่บอร์ด...
        </div>
      )}
      {!loading && error && <ErrorBanner title={error.title} message={error.message} details={error.details} />}
      {!loading && !error && imageBase64 && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${imageBase64}`}
            alt="Generated storyboard sheet"
            className="w-full rounded-xl border border-white/10 object-contain"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-lg bg-gradient-to-r from-[#5a9bd4] to-[#4382BB] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:shadow-lg hover:shadow-[#4382BB]/20"
            >
              ดาวน์โหลดภาพ
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-medium text-gray-300 shadow-sm transition hover:bg-white/5"
            >
              Regenerate
            </button>
          </div>
        </>
      )}
    </div>
  );
}
