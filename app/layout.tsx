import type { Metadata } from "next";
import { Mali } from "next/font/google";
import Link from "next/link";
import { cookies } from "next/headers";
import { TOOLS_COOKIE_NAME, verifyCustomerSessionToken } from "@/lib/tools-auth";
import { STORE_NAME, STORE_TAGLINE } from "@/lib/tools-content";
import "./globals.css";

// Mali — a rounded Thai + Latin Google font, self-hosted by next/font.
// (FC Monday is a licensed commercial font; drop its .woff2 into app/ and
//  switch to next/font/local if you have a license for it.)
const mali = Mali({
  variable: "--font-mali",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: `${STORE_NAME} — ${STORE_TAGLINE}`,
  description: STORE_TAGLINE,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = verifyCustomerSessionToken(cookieStore.get(TOOLS_COOKIE_NAME)?.value);

  return (
    <html lang="th" className={`${mali.variable} h-full antialiased`}>
      <body
        className="flex min-h-full flex-col"
        style={{ fontFamily: "var(--font-mali), 'Segoe UI', sans-serif", color: "#26221D", backgroundColor: "#FBF8F1" }}
      >
        <header className="sticky top-0 z-20 border-b border-[#EAE3D5] bg-[#FBF8F1]/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight text-[#1C1A17]">
              {STORE_NAME}
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/" className="text-[#6B6252] transition hover:text-[#1C1A17]">
                สินค้า
              </Link>
              <Link
                href="/account"
                className="rounded-full border border-[#DED6C6] px-4 py-1.5 font-medium text-[#3A342B] transition hover:border-[#1C1A17]"
              >
                {session ? "บัญชีของฉัน" : "เข้าสู่ระบบ"}
              </Link>
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-[#EAE3D5] py-8">
          <div className="mx-auto w-full max-w-4xl px-5 text-center text-xs text-[#9A9081]">
            © {new Date().getFullYear()} {STORE_NAME} · จ่ายเงินแล้วรับลิงก์ดาวน์โหลดทางอีเมลทันที
          </div>
        </footer>
      </body>
    </html>
  );
}
