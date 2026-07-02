"use client";

import { useRef, useState } from "react";
import { validateImageFile } from "@/lib/validation";

interface ImageUploaderProps {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  allowUrlImport?: boolean;
}

function base64ToFile(base64: string, mimeType: string, filename: string): File {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  return new File([new Uint8Array(byteNumbers)], filename, { type: mimeType });
}

export default function ImageUploader({ label, file, onChange, allowUrlImport = false }: ImageUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = file ? URL.createObjectURL(file) : null;
  const [productUrl, setProductUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);

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

  async function handleUrlImport() {
    if (!productUrl.trim() || urlLoading) return;
    setUrlLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/fetch-product-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrl.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message ?? "ดึงรูปสินค้าจากลิงก์นี้ไม่สำเร็จ");
      }
      const extension = data.mimeType === "image/png" ? "png" : data.mimeType === "image/webp" ? "webp" : "jpg";
      handleFile(base64ToFile(data.imageBase64, data.mimeType, `product-link.${extension}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "ดึงรูปสินค้าจากลิงก์นี้ไม่สำเร็จ");
    } finally {
      setUrlLoading(false);
    }
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
      {allowUrlImport && (
        <div className="space-y-1">
          <div className="flex gap-1.5">
            <input
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="หรือวางลิงก์หน้าสินค้า"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs text-gray-200 placeholder:text-gray-600 focus:border-[#4382BB]/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleUrlImport}
              disabled={urlLoading || !productUrl.trim()}
              className="shrink-0 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-white/5 disabled:opacity-40"
            >
              {urlLoading ? "กำลังดึง..." : "ดึงรูป"}
            </button>
          </div>
          <p className="text-[11px] leading-snug text-gray-600">
            ใช้ได้กับบางเว็บเท่านั้น — Shopee/TikTok Shop มักกันบอทไว้ ถ้าดึงไม่ได้ให้แคปหน้าจอหรือเซฟรูปแล้วอัปโหลดแทน
          </p>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
