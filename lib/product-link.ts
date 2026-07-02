import { ALLOWED_IMAGE_TYPES } from "./validation";

export class ProductLinkError extends Error {}

const MANUAL_UPLOAD_HINT =
  "ดึงรูปอัตโนมัติไม่สำเร็จ (บางเว็บ เช่น Shopee/TikTok Shop กันบอทไว้แน่นมาก) — " +
  'กรุณาแคปหน้าจอ หรือคลิกขวาที่รูปสินค้าแล้วเลือก "บันทึกรูปภาพเป็น..." แล้วอัปโหลดไฟล์นั้นแทน';

const FETCH_TIMEOUT_MS = 10_000;
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
};

const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
];

function assertPublicHttpUrl(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ProductLinkError("ลิงก์ต้องเป็น http หรือ https เท่านั้น");
  }
  if (BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(url.hostname))) {
    throw new ProductLinkError("ไม่รองรับลิงก์นี้");
  }
}

async function fetchWithTimeout(url: string, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timeout);
  }
}

function extractMetaImage(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export interface ProductLinkImage {
  imageBase64: string;
  mimeType: string;
}

export async function fetchProductImageFromUrl(pageUrl: string): Promise<ProductLinkImage> {
  let parsedPageUrl: URL;
  try {
    parsedPageUrl = new URL(pageUrl);
  } catch {
    throw new ProductLinkError("ลิงก์ไม่ถูกต้อง");
  }
  assertPublicHttpUrl(parsedPageUrl);

  let pageResponse: Response;
  try {
    pageResponse = await fetchWithTimeout(parsedPageUrl.toString(), BROWSER_HEADERS);
  } catch {
    throw new ProductLinkError(MANUAL_UPLOAD_HINT);
  }
  if (!pageResponse.ok) {
    throw new ProductLinkError(MANUAL_UPLOAD_HINT);
  }

  const html = await pageResponse.text();
  const imageUrlRaw = extractMetaImage(html);
  if (!imageUrlRaw) {
    throw new ProductLinkError(MANUAL_UPLOAD_HINT);
  }

  let parsedImageUrl: URL;
  try {
    parsedImageUrl = new URL(imageUrlRaw, parsedPageUrl);
  } catch {
    throw new ProductLinkError(MANUAL_UPLOAD_HINT);
  }
  assertPublicHttpUrl(parsedImageUrl);

  let imageResponse: Response;
  try {
    imageResponse = await fetchWithTimeout(parsedImageUrl.toString(), BROWSER_HEADERS);
  } catch {
    throw new ProductLinkError(MANUAL_UPLOAD_HINT);
  }
  if (!imageResponse.ok) {
    throw new ProductLinkError(MANUAL_UPLOAD_HINT);
  }

  const mimeType = imageResponse.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    throw new ProductLinkError(MANUAL_UPLOAD_HINT);
  }

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  return { imageBase64: buffer.toString("base64"), mimeType };
}
