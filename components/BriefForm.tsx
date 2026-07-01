"use client";

import ImageUploader from "./ImageUploader";
import { validateProductName, type BriefTemplateFields, type Orientation } from "@/lib/prompt-template";

interface BriefFormProps {
  apiKey: string;
  modelImage: File | null;
  productImage: File | null;
  fields: BriefTemplateFields;
  brief: string;
  briefTouched: boolean;
  loading: boolean;
  onModelImageChange: (file: File | null) => void;
  onProductImageChange: (file: File | null) => void;
  onFieldsChange: (fields: BriefTemplateFields) => void;
  onBriefChange: (value: string) => void;
  onResetBrief: () => void;
  onSubmit: () => void;
}

const ORIENTATION_OPTIONS: { value: Orientation; label: string }[] = [
  { value: "vertical", label: "แนวตั้ง (9:16, TikTok/Reels)" },
  { value: "horizontal", label: "แนวนอน (16:9)" },
  { value: "square", label: "จัตุรัส (1:1)" },
];

export default function BriefForm({
  apiKey,
  modelImage,
  productImage,
  fields,
  brief,
  briefTouched,
  loading,
  onModelImageChange,
  onProductImageChange,
  onFieldsChange,
  onBriefChange,
  onResetBrief,
  onSubmit,
}: BriefFormProps) {
  const productNameError = validateProductName(fields.productName);
  const canSubmit = Boolean(apiKey && modelImage && productImage && !productNameError && !loading);

  function update<K extends keyof BriefTemplateFields>(key: K, value: BriefTemplateFields[K]) {
    onFieldsChange({ ...fields, [key]: value });
  }

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-100 shadow-sm outline-none transition placeholder:text-gray-600 focus:border-[#4382BB] focus:ring-2 focus:ring-[#4382BB]/30";

  return (
    <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ImageUploader label="รูปนางแบบ" file={modelImage} onChange={onModelImageChange} />
        <ImageUploader label="รูปสินค้า" file={productImage} onChange={onProductImageChange} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-300" htmlFor="productName">
            ชื่อสินค้า
          </label>
          <input
            id="productName"
            type="text"
            value={fields.productName}
            onChange={(e) => update("productName", e.target.value)}
            placeholder="เช่น เซรั่มบำรุงผิวหน้า"
            className={inputClass}
          />
          {productNameError && <p className="text-xs text-red-400">{productNameError}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-300" htmlFor="duration">
            ความยาววิดีโอ (วินาที)
          </label>
          <input
            id="duration"
            type="number"
            min={1}
            max={40}
            value={fields.durationSeconds}
            onChange={(e) => update("durationSeconds", Number(e.target.value) || 10)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-300" htmlFor="orientation">
            แนวภาพ
          </label>
          <select
            id="orientation"
            value={fields.orientation}
            onChange={(e) => update("orientation", e.target.value as Orientation)}
            className={inputClass}
          >
            {ORIENTATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#0d121c]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-300" htmlFor="style">
            สไตล์ภาพ
          </label>
          <input
            id="style"
            type="text"
            value={fields.style}
            onChange={(e) => update("style", e.target.value)}
            placeholder="เช่น มินิมอล หรูหรา พาสเทล"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            พรอมต์ที่จะส่ง (แก้ไขได้)
          </p>
          {briefTouched && (
            <button
              type="button"
              onClick={onResetBrief}
              className="text-xs font-medium text-[#7bafdb] underline underline-offset-2 hover:text-[#a3c8e6]"
            >
              รีเซ็ตเป็นข้อความอัตโนมัติ
            </button>
          )}
        </div>
        <textarea
          value={brief}
          onChange={(e) => onBriefChange(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-gray-300 shadow-sm outline-none transition focus:border-[#4382BB] focus:bg-black/30 focus:ring-2 focus:ring-[#4382BB]/30"
        />
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={onSubmit}
        className="w-full rounded-xl bg-gradient-to-r from-[#5a9bd4] to-[#4382BB] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg hover:shadow-[#4382BB]/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        {loading ? "กำลังสร้างสตอรี่บอร์ด..." : "Generate Storyboard"}
      </button>
    </div>
  );
}
