"use client";

import { useState } from "react";

interface ErrorBannerProps {
  title: string;
  message: string;
  details?: string;
}

export default function ErrorBanner({ title, message, details }: ErrorBannerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300">
      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-red-200">{title}</p>
        <p className="leading-relaxed">{message}</p>
        {details && (
          <div className="mt-1.5">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs font-medium underline underline-offset-2"
            >
              {expanded ? "ซ่อนรายละเอียด" : "แสดงรายละเอียด"}
            </button>
            {expanded && <pre className="mt-1.5 whitespace-pre-wrap text-xs text-red-400">{details}</pre>}
          </div>
        )}
      </div>
    </div>
  );
}
