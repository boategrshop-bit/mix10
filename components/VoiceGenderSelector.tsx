"use client";

import type { VoiceGender } from "@/lib/prompt-template";

interface VoiceGenderSelectorProps {
  value: VoiceGender;
  onChange: (value: VoiceGender) => void;
}

const OPTIONS: { value: VoiceGender; label: string }[] = [
  { value: "female", label: "เสียงผู้หญิง" },
  { value: "male", label: "เสียงผู้ชาย" },
];

export default function VoiceGenderSelector({ value, onChange }: VoiceGenderSelectorProps) {
  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm">
      <p className="text-sm font-semibold text-gray-100">เสียงพากย์</p>
      <div className="flex gap-4">
        {OPTIONS.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
            <input
              type="radio"
              name="voiceGender"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="h-4 w-4 accent-[#4382BB]"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}
