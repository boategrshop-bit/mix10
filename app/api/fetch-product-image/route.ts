import { NextRequest, NextResponse } from "next/server";
import { fetchProductImageFromUrl, ProductLinkError } from "@/lib/product-link";
import type { ApiErrorBody } from "@/lib/types";

function errorResponse(code: string, message: string, status: number) {
  const body: ApiErrorBody = { error: { code, message } };
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const url = body?.url;

  if (typeof url !== "string" || !url.trim()) {
    return errorResponse("validation_error", "กรุณาใส่ลิงก์สินค้า", 400);
  }

  try {
    const result = await fetchProductImageFromUrl(url.trim());
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ProductLinkError) {
      return errorResponse("product_link_error", err.message, 422);
    }
    return errorResponse("unknown_error", "ดึงรูปสินค้าจากลิงก์นี้ไม่สำเร็จ กรุณาอัปโหลดรูปเอง", 502);
  }
}
