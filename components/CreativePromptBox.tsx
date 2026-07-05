"use client";

interface CreativePromptBoxProps {
  value: string;
  onChange: (value: string) => void;
  creativeMode: boolean;
  onCreativeModeChange: (value: boolean) => void;
}

export default function CreativePromptBox({
  value,
  onChange,
  creativeMode,
  onCreativeModeChange,
}: CreativePromptBoxProps) {
  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm">
      <label className="text-sm font-medium text-gray-300" htmlFor="creativePrompt">
        คุณอยากสร้างอะไร
      </label>
      <textarea
        id="creativePrompt"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="เช่น อยากสร้างละครสั้นย้อนยุค, คลิปรีวิวสถานที่ท่องเที่ยว, คลิปตลกสั้น ๆ ฯลฯ"
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-100 shadow-sm outline-none transition placeholder:text-gray-600 focus:border-[#4382BB] focus:ring-2 focus:ring-[#4382BB]/30"
      />
      <label className="flex items-center gap-2 text-xs text-gray-400">
        <input
          type="checkbox"
          checked={creativeMode}
          onChange={(e) => onCreativeModeChange(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-black/30 accent-[#4382BB]"
        />
        ปิดโหมดขายของ (ใช้พรอมต์นี้สร้างเนื้อหาอิสระแทน ไม่ต้องมีสินค้า/บทขาย)
      </label>
    </div>
  );
}
