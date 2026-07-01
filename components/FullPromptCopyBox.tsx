"use client";

import { useState } from "react";

interface FullPromptCopyBoxProps {
  promptText: string;
}

export default function FullPromptCopyBox({ promptText }: FullPromptCopyBoxProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard permission denied; user can still select-and-copy manually
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-100">พรอมต์เต็ม (สำหรับก็อปไปใช้เองใน Google Flow)</p>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-medium text-gray-300 shadow-sm transition hover:bg-white/5"
        >
          {copied ? "คัดลอกแล้ว!" : "คัดลอก"}
        </button>
      </div>
      <p className="text-xs leading-relaxed text-gray-500">
        ข้อความนี้รวมคำสั่งเสียงพากย์/ข้อความบนภาพ/เพศเสียงไว้ครบแล้ว — ถ้าจะสร้างวิดีโอเองใน Google Flow
        (ไม่ผ่านปุ่ม Generate Video ของแอปนี้) ให้ก็อปข้อความทั้งหมดนี้ไปวาง ไม่ใช่แค่ข้อความในกล่อง
        &quot;พรอมต์วิดีโอ&quot; ด้านบน เพราะกล่องด้านบนมีแค่ส่วนอธิบายการเคลื่อนกล้องเท่านั้น
        ไม่มีคำสั่งเสียงพากย์รวมอยู่ด้วย
      </p>
      <textarea
        readOnly
        value={promptText}
        rows={6}
        className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-gray-400"
      />
    </div>
  );
}
