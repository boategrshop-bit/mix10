"use client";

import { useRef, useState } from "react";
import { validateImageFile } from "@/lib/validation";

interface MultiImageUploaderProps {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
}

export default function MultiImageUploader({ label, files, onChange, maxFiles = 4 }: MultiImageUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(candidates: FileList | null) {
    if (!candidates || candidates.length === 0) return;
    const incoming = Array.from(candidates);
    const room = maxFiles - files.length;
    if (room <= 0) {
      setError(`เพิ่มได้สูงสุด ${maxFiles} คน`);
      return;
    }
    const toAdd = incoming.slice(0, room);
    for (const candidate of toAdd) {
      const err = validateImageFile({ type: candidate.type, size: candidate.size });
      if (err) {
        setError(err);
        return;
      }
    }
    setError(null);
    onChange([...files, ...toAdd]);
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
    setError(null);
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-gray-300">
        {label}
        {files.length > 0 && <span className="text-gray-500"> ({files.length}/{maxFiles})</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {files.map((file, i) => (
          <div key={i} className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={URL.createObjectURL(file)}
              alt={`${label} ${i + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-xs text-white transition hover:bg-red-600"
            >
              ✕
            </button>
          </div>
        ))}
        {files.length < maxFiles && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-white/15 bg-black/20 text-center text-[11px] text-gray-500 transition hover:border-[#4382BB]/60 hover:bg-[#4382BB]/5"
          >
            <span className="text-xl leading-none">+</span>
            <span>เพิ่มรูป</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <p className="text-[11px] text-gray-600">PNG / JPEG / WebP, สูงสุด 10MB ต่อรูป, เพิ่มตัวละครได้สูงสุด {maxFiles} คน</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
