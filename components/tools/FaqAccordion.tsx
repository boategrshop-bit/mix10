"use client";

import { useState } from "react";
import type { Faq } from "@/lib/tools-content";

export default function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-[#EAE3D5] overflow-hidden rounded-2xl border border-[#E9E3D6] bg-[#FFFDF8]">
      {faqs.map((faq, i) => {
        const isOpen = open === i;
        return (
          <div key={faq.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#FBF8F1]"
              aria-expanded={isOpen}
            >
              <span className="text-[15px] font-semibold text-[#1C1A17]">{faq.q}</span>
              <span
                className={`flex-shrink-0 text-[#9A9081] transition-transform ${isOpen ? "rotate-45" : ""}`}
                aria-hidden
              >
                +
              </span>
            </button>
            {isOpen && (
              <p className="px-5 pb-5 text-sm leading-relaxed text-[#6B6252]">{faq.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
