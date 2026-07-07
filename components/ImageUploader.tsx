"use client";

import { useRef, useState } from "react";
import { validateImageFile } from "@/lib/validation";

interface ImageUploaderProps {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

export default function ImageUploader({ label, file, onChange }: ImageUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = file ? URL.createObjectURL(file) : null;

  function handleFile(candidate: File | undefined | null) {
    if (!candidate) return;
    const err = validateImageFile({ type: candidate.type, size: candidate.size });
    if (err) {
      setError(err);
      onChange(null);
      return;
    }
    setError(null);
    onChange(candidate);
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-gray-300">{label}</p>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className="flex h-36 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-white/15 bg-black/20 text-center text-xs text-gray-500 transition hover:border-[#4382BB]/60 hover:bg-[#4382BB]/5"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={label} className="h-full w-full rounded-xl object-cover" />
        ) : (
          <>
            <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9m0 0-3 3m3-3 3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
            <span className="px-2 text-gray-400">ลากไฟล์มาวาง หรือคลิกเพื่ออัปโหลด</span>
            <span className="text-gray-600">PNG / JPEG / WebP, สูงสุด 10MB</span>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {file && (
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setError(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="text-xs font-medium text-gray-500 underline underline-offset-2 hover:text-red-600"
        >
          ลบรูป
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
