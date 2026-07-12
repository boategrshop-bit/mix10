import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getToolById } from "@/lib/tools-content";
import { TOOLS_COOKIE_NAME, verifyCustomerSessionToken } from "@/lib/tools-auth";
import CheckoutPanel from "@/components/tools/CheckoutPanel";

export default async function ToolProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const product = getToolById(productId);
  if (!product) notFound();

  const cookieStore = await cookies();
  const session = verifyCustomerSessionToken(cookieStore.get(TOOLS_COOKIE_NAME)?.value);

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-12">
      <Link href="/tools" className="text-sm text-[#8A8072] transition hover:text-[#1C1A17]">
        ← กลับไปหน้าสินค้า
      </Link>

      <div className="mt-6 grid items-start gap-10 md:grid-cols-[1.1fr_0.9fr]">
        {/* Details */}
        <div>
          {product.badge && (
            <span className="mb-3 inline-block rounded-full bg-[#1C1A17] px-3 py-1 text-xs font-semibold text-[#F7F3EA]">
              {product.badge}
            </span>
          )}
          <h1 className="text-3xl font-bold leading-tight text-[#1C1A17] sm:text-4xl">{product.name}</h1>
          <p className="mt-2 text-base text-[#8A8072]">{product.tagline}</p>
          <p className="mt-6 text-[15px] leading-relaxed text-[#4A4239]">{product.description}</p>

          <ul className="mt-8 space-y-3">
            {product.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[15px] text-[#3A342B]">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#1C1A17] text-[11px] text-[#F7F3EA]">
                  ✓
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <p className="mt-8 inline-flex items-center gap-2 rounded-lg border border-[#E9E3D6] bg-[#FFFDF8] px-4 py-2 text-sm text-[#6B6252]">
            <span>📦</span> {product.fileLabel}
          </p>
        </div>

        {/* Checkout */}
        <div className="md:sticky md:top-24">
          <CheckoutPanel
            product={{
              id: product.id,
              name: product.name,
              priceThb: product.priceThb,
              fileLabel: product.fileLabel,
            }}
            initialEmail={session?.email ?? null}
          />
        </div>
      </div>
    </main>
  );
}
