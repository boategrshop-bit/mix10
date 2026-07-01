"use client";

interface VideoPromptEditorProps {
  prompt: string;
  loading: boolean;
  onChange: (value: string) => void;
  onRegenerate: () => void;
}

const MAX_LENGTH = 800;

export default function VideoPromptEditor({ prompt, loading, onChange, onRegenerate }: VideoPromptEditorProps) {
  return (
    <div className="space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-100">พรอมต์วิดีโอ</p>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={loading}
          className="text-xs font-medium text-[#7bafdb] underline underline-offset-2 transition hover:text-[#a3c8e6] disabled:opacity-40"
        >
          {loading ? "กำลังสร้างใหม่..." : "สร้างพรอมต์ใหม่"}
        </button>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_LENGTH))}
        rows={4}
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-100 shadow-sm outline-none transition focus:border-[#4382BB] focus:ring-2 focus:ring-[#4382BB]/30"
      />
      <p className="text-right text-xs text-gray-500">
        {prompt.length}/{MAX_LENGTH}
      </p>
    </div>
  );
}
