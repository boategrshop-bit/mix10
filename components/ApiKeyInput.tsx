"use client";

import { useEffect, useState } from "react";

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  storageKey: string;
  placeholder: string;
  helpText: string;
  required?: boolean;
}

export default function ApiKeyInput({
  value,
  onChange,
  label,
  storageKey,
  placeholder,
  helpText,
  required = true,
}: ApiKeyInputProps) {
  const [open, setOpen] = useState(required && !value);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) onChange(stored);
    // Only hydrate once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (value) sessionStorage.setItem(storageKey, value);
    else sessionStorage.removeItem(storageKey);
  }, [value, storageKey]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-sm backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-100 transition hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-2">
          {label}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              value
                ? "bg-emerald-500/10 text-emerald-400"
                : required
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-white/5 text-gray-400"
            }`}
          >
            {value ? "ตั้งค่าแล้ว" : required ? "จำเป็น" : "ไม่บังคับ"}
          </span>
        </span>
        <span className="text-gray-500">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-white/10 bg-black/20 p-4">
          <div className="flex gap-2">
            <input
              type={show ? "text" : "password"}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-100 shadow-sm outline-none transition placeholder:text-gray-600 focus:border-[#4382BB] focus:ring-2 focus:ring-[#4382BB]/30"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="rounded-lg border border-white/10 bg-black/30 px-3 text-xs font-medium text-gray-300 transition hover:bg-white/5"
            >
              {show ? "ซ่อน" : "แสดง"}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-gray-500">{helpText}</p>
        </div>
      )}
    </div>
  );
}
