"use client";

import type { Orientation } from "@/lib/prompt-template";
import type { VideoJobResult } from "@/lib/types";
import { ORIENTATION_ASPECT } from "@/lib/orientation";

interface MockVideoPlayerProps {
  placeholder: NonNullable<VideoJobResult["placeholder"]>;
  orientation: Orientation;
}

export default function MockVideoPlayer({ placeholder, orientation }: MockVideoPlayerProps) {
  const isReal = placeholder.kind === "gemini-video";

  return (
    <div className="space-y-2.5">
      <div
        className={`relative mx-auto w-full overflow-hidden rounded-xl bg-black shadow-sm ${ORIENTATION_ASPECT[orientation]}`}
      >
        {isReal ? (
          <video
            src={`data:${placeholder.mimeType};base64,${placeholder.videoBase64}`}
            controls
            autoPlay
            muted
            loop
            className="h-full w-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${placeholder.sourceImageBase64}`}
            alt="Mock video preview"
            className="mock-video-frame h-full w-full object-cover"
          />
        )}
        <span
          className={`absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white ${
            isReal ? "bg-emerald-600" : "bg-black/60"
          }`}
        >
          {isReal ? "Real" : "Preview"}
        </span>
      </div>
      <p className="whitespace-pre-line text-xs leading-relaxed text-gray-500">{placeholder.caption}</p>
      {isReal ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          {placeholder.providerLabel}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          This is a simulated preview. Enter a Gemini API key above to generate a real video via
          Google Gemini Omni Flash.
        </div>
      )}
    </div>
  );
}
