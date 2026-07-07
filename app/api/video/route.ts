import { NextRequest, NextResponse } from "next/server";
import { GeminiApiError } from "@/lib/gemini";
import { VeoApiError } from "@/lib/veo";
import { selectVideoProvider } from "@/lib/video-provider";
import { requireValidLicenseKey } from "@/lib/api-guard";
import type { Orientation, VideoTarget, VoiceGender } from "@/lib/prompt-template";
import type { ApiErrorBody, GenerateVideoInput } from "@/lib/types";

const VALID_ORIENTATIONS: Orientation[] = ["vertical", "horizontal", "square"];
const VALID_VOICE_GENDERS: VoiceGender[] = ["male", "female"];
const VALID_VIDEO_TARGETS: VideoTarget[] = ["omni-flash", "veo-3.1-lite"];

function errorResponse(code: string, message: string, status: number) {
  const body: ApiErrorBody = { error: { code, message } };
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  const licenseError = await requireValidLicenseKey(request);
  if (licenseError) return licenseError;

  const form = await request.formData();

  const apiKey = form.get("apiKey");
  const storyboardImageBase64 = form.get("storyboardImageBase64");
  const videoPrompt = form.get("videoPrompt");
  const narrationScript = form.get("narrationScript");
  const captionScript = form.get("captionScript");
  const voiceGenderRaw = form.get("voiceGender");
  const videoTargetRaw = form.get("videoTarget");
  const orientationRaw = form.get("orientation");
  const modelImage = form.get("modelImage");
  const productImage = form.get("productImage");

  if (typeof storyboardImageBase64 !== "string" || typeof videoPrompt !== "string") {
    return errorResponse("validation_error", "storyboardImageBase64 and videoPrompt are required.", 400);
  }

  const orientation: Orientation = VALID_ORIENTATIONS.includes(orientationRaw as Orientation)
    ? (orientationRaw as Orientation)
    : "vertical";

  const input: GenerateVideoInput = { storyboardImageBase64, videoPrompt, orientation };
  if (typeof narrationScript === "string" && narrationScript) {
    input.narrationScript = narrationScript;
  }
  if (typeof captionScript === "string" && captionScript) {
    input.captionScript = captionScript;
  }
  if (VALID_VOICE_GENDERS.includes(voiceGenderRaw as VoiceGender)) {
    input.voiceGender = voiceGenderRaw as VoiceGender;
  }
  if (VALID_VIDEO_TARGETS.includes(videoTargetRaw as VideoTarget)) {
    input.videoTarget = videoTargetRaw as VideoTarget;
  }

  if (typeof apiKey === "string" && apiKey) {
    if (!(modelImage instanceof Blob) || !(productImage instanceof Blob)) {
      return errorResponse(
        "validation_error",
        "Model and product images are required to use the real Gemini provider.",
        400
      );
    }
    input.apiKey = apiKey;
    input.modelImageBase64 = Buffer.from(await modelImage.arrayBuffer()).toString("base64");
    input.modelImageMimeType = modelImage.type || "image/png";
    input.productImageBase64 = Buffer.from(await productImage.arrayBuffer()).toString("base64");
    input.productImageMimeType = productImage.type || "image/png";
  }

  try {
    const result = await selectVideoProvider(input).generateVideo(input);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GeminiApiError || err instanceof VeoApiError) {
      return errorResponse("gemini_error", err.message, err.status >= 400 ? err.status : 500);
    }
    return errorResponse("unknown_error", "Could not reach Gemini, check connection and retry.", 502);
  }
}
