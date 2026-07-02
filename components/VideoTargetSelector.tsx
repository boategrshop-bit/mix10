"use client";

import type { VideoTarget } from "@/lib/prompt-template";

interface VideoTargetSelectorProps {
  value: VideoTarget;
  onChange: (value: VideoTarget) => void;
}

const OPTIONS: { value: VideoTarget; label: string }[] = [
  { value: "omni-flash", label: "Gemini Omni Flash" },
  { value: "veo-3.1-lite", label: "Veo 3.1 Lite (8 วินาที)" },
];

export default function VideoTargetSelector({ value, onChange }: VideoTargetSelectorProps) {
  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm">
      <p className="text-sm font-semibold text-gray-100">โมเดลสร้างวิดีโอ</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as VideoTarget)}
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-100 shadow-sm outline-none transition focus:border-[#4382BB] focus:ring-2 focus:ring-[#4382BB]/30"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0d121c]">
            {opt.label}
          </option>
        ))}
      </select>
      <p className="text-xs leading-relaxed text-gray-500">
        ใช้ Gemini API key เดียวกันด้านบน — Veo 3.1 Lite ตรึงความยาวไว้ที่ 8 วินาที
      </p>
    </div>
  );
}
