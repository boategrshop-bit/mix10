"use client";

import type { ScenePlanItem } from "@/lib/types";
import { maxWordsForDuration } from "@/lib/prompt-template";

interface ScenePlanEditorProps {
  scenePlan: ScenePlanItem[];
  voiceoverScript: string;
  loading: boolean;
  dirty: boolean;
  onCaptionChange: (index: number, value: string) => void;
  onVoiceoverScriptChange: (value: string) => void;
  onGenerateImage: () => void;
}

function countThaiWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function ScenePlanEditor({
  scenePlan,
  voiceoverScript,
  loading,
  dirty,
  onCaptionChange,
  onVoiceoverScriptChange,
  onGenerateImage,
}: ScenePlanEditorProps) {
  const inputClass =
    "w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-gray-100 shadow-sm outline-none transition focus:border-[#4382BB] focus:ring-2 focus:ring-[#4382BB]/30";

  const totalDuration = scenePlan[scenePlan.length - 1]?.endSeconds ?? 0;
  const maxWords = maxWordsForDuration(totalDuration);
  const wordCount = countThaiWords(voiceoverScript);
  const overBudget = wordCount > maxWords;

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm">
      <p className="text-sm font-semibold text-gray-100">แผนฉาก (แก้ไขก่อนสร้างภาพได้)</p>

      <div className="space-y-3">
        {scenePlan.map((scene) => (
          <div key={scene.index} className="space-y-2.5 rounded-xl border border-white/10 bg-black/20 p-3.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-block rounded-full bg-gradient-to-r from-[#5a9bd4] to-[#4382BB] px-2.5 py-0.5 text-xs font-semibold text-white">
                {scene.startSeconds}s–{scene.endSeconds}s
              </span>
              {scene.shotType && (
                <span className="inline-block rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-gray-400">
                  {scene.shotType}
                </span>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">ข้อความบนภาพ</label>
              <input
                type="text"
                value={scene.onScreenText}
                onChange={(e) => onCaptionChange(scene.index, e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5 rounded-xl border border-white/10 bg-black/20 p-3.5">
        <label className="flex items-center justify-between text-xs font-medium text-gray-500">
          <span>บทพูด (เสียงพากย์ต่อเนื่องทั้งคลิป)</span>
          <span className={overBudget ? "font-semibold text-amber-400" : "text-gray-500"}>
            {wordCount}/{maxWords} คำ
          </span>
        </label>
        <textarea
          value={voiceoverScript}
          onChange={(e) => onVoiceoverScriptChange(e.target.value)}
          rows={4}
          className={inputClass}
        />
        {overBudget && (
          <p className="text-[11px] text-amber-400">
            บทพูดอาจยาวเกินความยาวทั้งคลิป ({totalDuration} วินาที)
          </p>
        )}
      </div>

      {dirty && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          มีการแก้ไขข้อความหลังสร้างภาพไปแล้ว ภาพสตอรี่บอร์ดปัจจุบันยังไม่ตรงกับข้อความล่าสุด กด
          Generate ด้านล่างเพื่ออัปเดตภาพให้ตรงกัน
        </div>
      )}

      <button
        type="button"
        disabled={loading || scenePlan.length === 0}
        onClick={onGenerateImage}
        className="w-full rounded-xl bg-gradient-to-r from-[#5a9bd4] to-[#4382BB] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg hover:shadow-[#4382BB]/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        {loading ? "กำลังสร้างภาพสตอรี่บอร์ด..." : dirty ? "Regenerate Storyboard Image" : "Generate Storyboard Image"}
      </button>
    </div>
  );
}
