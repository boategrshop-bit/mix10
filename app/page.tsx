import Link from "next/link";
import {
  STORE_NAME,
  STORE_TAGLINE,
  STORE_DESCRIPTION,
  TOOLS,
  STEPS,
  FEATURES,
  REVIEWS,
  FAQS,
  DEMO_VIDEO,
  SHOWCASE_VIDEOS,
  minPrice,
} from "@/lib/tools-content";
import FaqAccordion from "@/components/tools/FaqAccordion";
import VideoEmbed from "@/components/tools/VideoEmbed";

function Stars() {
  return (
    <div className="flex gap-0.5 text-sm text-[#C6A15B]" aria-label="5 ดาว">
      {"★★★★★".split("").map((s, i) => (
        <span key={i}>{s}</span>
      ))}
    </div>
  );
}

export default function ToolsStorePage() {
  const from = minPrice();

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-4xl px-5 pb-8 pt-16 sm:pt-24">
        <div className="max-w-2xl">
          <span className="inline-flex items-center rounded-full border border-[#DED6C6] px-3 py-1 text-xs font-medium text-[#8A8072]">
            ✨ {STORE_NAME}
          </span>
          <h1 className="mt-5 text-balance text-3xl font-bold leading-snug text-[#1C1A17] sm:text-5xl sm:leading-tight">
            {STORE_TAGLINE}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#6B6252] sm:text-base">{STORE_DESCRIPTION}</p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#products"
              className="rounded-full bg-[#1C1A17] px-7 py-3 text-sm font-semibold text-[#F7F3EA] transition hover:opacity-90"
            >
              ดูเครื่องมือทั้งหมด
            </a>
            <p className="text-sm text-[#8A8072]">
              เริ่มต้นเพียง <span className="text-lg font-bold text-[#1C1A17]">{from.toLocaleString()}฿</span> · จ่ายครั้งเดียว
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works (3 steps) ───────────────────────── */}
      <section className="mx-auto w-full max-w-4xl px-5 py-14">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#9A9081]">ใช้งานง่าย 3 ขั้นตอน</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="rounded-2xl border border-[#E9E3D6] bg-[#FFFDF8] p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1EBDD] text-lg">
                  {step.icon}
                </span>
                <span className="text-xs font-bold text-[#B3A992]">ขั้นที่ {i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#1C1A17]">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#6B6252]">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Demo video ───────────────────────────────────── */}
      {DEMO_VIDEO.src && (
        <section className="mx-auto w-full max-w-3xl px-5 py-14">
          <h2 className="text-2xl font-bold text-[#1C1A17]">คลิปสาธิตการใช้งาน</h2>
          {DEMO_VIDEO.caption && <p className="mt-1 text-sm text-[#8A8072]">{DEMO_VIDEO.caption}</p>}
          <div className="mt-6">
            <VideoEmbed src={DEMO_VIDEO.src} title={DEMO_VIDEO.title} />
          </div>
        </section>
      )}

      {/* ── Products ─────────────────────────────────────── */}
      <section id="products" className="mx-auto w-full max-w-4xl scroll-mt-24 px-5 py-14">
        <h2 className="text-2xl font-bold text-[#1C1A17]">เลือกเครื่องมือ</h2>
        <p className="mt-1 text-sm text-[#8A8072]">ทุกชิ้นจ่ายครั้งเดียว รับลิงก์ดาวน์โหลดทางอีเมลทันที</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <Link
              key={tool.id}
              href={`/${tool.id}`}
              className={`group flex flex-col rounded-2xl border bg-[#FFFDF8] p-6 transition hover:shadow-[0_8px_30px_rgba(28,26,23,0.06)] ${
                tool.badge ? "border-[#1C1A17]" : "border-[#E9E3D6] hover:border-[#1C1A17]"
              }`}
            >
              {tool.badge && (
                <span className="mb-3 inline-flex w-fit rounded-full bg-[#1C1A17] px-3 py-1 text-xs font-semibold text-[#F7F3EA]">
                  {tool.badge}
                </span>
              )}
              <h3 className="text-xl font-bold text-[#1C1A17]">{tool.name}</h3>
              <p className="mt-1 text-sm text-[#8A8072]">{tool.tagline}</p>
              <p className="mt-4 line-clamp-2 flex-1 text-sm leading-relaxed text-[#6B6252]">
                {tool.description}
              </p>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-lg font-bold text-[#1C1A17]">
                  {tool.priceThb.toLocaleString()}{" "}
                  <span className="text-sm font-medium text-[#8A8072]">บาท</span>
                </span>
                <span className="rounded-full bg-[#1C1A17] px-4 py-2 text-sm font-semibold text-[#F7F3EA] transition group-hover:opacity-90">
                  ดูรายละเอียด
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-4xl px-5 py-14">
        <h2 className="text-2xl font-bold text-[#1C1A17]">ทำไมต้องซื้อกับเรา</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-[#E9E3D6] bg-[#FFFDF8] p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1EBDD] text-lg">
                {feature.icon}
              </span>
              <h3 className="mt-4 text-base font-bold text-[#1C1A17]">{feature.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#6B6252]">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Showcase (example works) ─────────────────────── */}
      {SHOWCASE_VIDEOS.length > 0 && (
        <section className="mx-auto w-full max-w-4xl px-5 py-14">
          <h2 className="text-2xl font-bold text-[#1C1A17]">ตัวอย่างผลงาน</h2>
          <p className="mt-1 text-sm text-[#8A8072]">คลิปที่สร้างจากเครื่องมือของเรา</p>
          <div className="mt-8 grid justify-items-center gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {SHOWCASE_VIDEOS.map((video, i) => (
              <figure key={`${video.src}-${i}`} className="w-full space-y-3">
                <VideoEmbed src={video.src} title={video.title} />
                <figcaption className="text-center">
                  <p className="text-sm font-semibold text-[#1C1A17]">{video.title}</p>
                  {video.caption && <p className="text-xs text-[#9A9081]">{video.caption}</p>}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ── Reviews ──────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-4xl px-5 py-14">
        <h2 className="text-2xl font-bold text-[#1C1A17]">รีวิวจากผู้ใช้จริง</h2>
        <p className="mt-1 text-sm text-[#8A8072]">เสียงจากคนที่ใช้จริง 😊</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((review) => (
            <figure key={review.name} className="flex flex-col rounded-2xl border border-[#E9E3D6] bg-[#FFFDF8] p-6">
              <Stars />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-[#4A4239]">
                “{review.text}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1EBDD] text-sm font-bold text-[#8A7A55]">
                  {review.initial}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#1C1A17]">{review.name}</p>
                  <p className="text-xs text-[#9A9081]">{review.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-3xl px-5 py-14">
        <h2 className="text-2xl font-bold text-[#1C1A17]">คำถามที่พบบ่อย</h2>
        <div className="mt-6">
          <FaqAccordion faqs={FAQS} />
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-4xl px-5 pb-20 pt-6">
        <div className="rounded-3xl border border-[#E9E3D6] bg-[#FFFDF8] px-8 py-12 text-center">
          <h2 className="text-2xl font-bold text-[#1C1A17] sm:text-3xl">พร้อมเริ่มใช้งานแล้วหรือยัง?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-[#6B6252]">
            เลือกเครื่องมือที่ใช่ จ่ายครั้งเดียว รับลิงก์ดาวน์โหลดทางอีเมลทันที
          </p>
          <a
            href="#products"
            className="mt-7 inline-block rounded-full bg-[#1C1A17] px-8 py-3 text-sm font-semibold text-[#F7F3EA] transition hover:opacity-90"
          >
            ดูเครื่องมือทั้งหมด
          </a>
        </div>
      </section>
    </main>
  );
}
