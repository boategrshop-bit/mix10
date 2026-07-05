import { NextRequest, NextResponse } from "next/server";
import {
  callCaptionAndHashtags,
  callChatPrompt,
  callImageEdit,
  callScenePlan,
  OpenAIApiError,
  type RawScenePlanItem,
} from "@/lib/openai";
import { validateApiKeyFormat, validateBrief, validateImageFile, validateSceneCount } from "@/lib/validation";
import { deriveSceneRanges, deriveSheetSize, PRESERVE_IDENTITY_INSTRUCTION, type SceneRange } from "@/lib/prompt-template";
import type { ApiErrorBody, ScenePlanItem } from "@/lib/types";

const VALID_MODES = ["full", "plan_only", "image_only", "prompt_only", "caption_only"] as const;
type Mode = (typeof VALID_MODES)[number];

function errorResponse(code: string, message: string, status: number, details?: string) {
  const body: ApiErrorBody = { error: { code, message, details } };
  return NextResponse.json(body, { status });
}

function handleOpenAIError(err: unknown) {
  if (err instanceof OpenAIApiError) {
    return errorResponse(err.code ?? "openai_error", err.message, err.status >= 400 ? err.status : 500);
  }
  return errorResponse("unknown_error", "Could not reach OpenAI, check connection and retry.", 502);
}

function mergeSceneRanges(items: RawScenePlanItem[], ranges: SceneRange[]): ScenePlanItem[] {
  return items.map((item, i) => ({
    ...item,
    startSeconds: ranges[i].startSeconds,
    endSeconds: ranges[i].endSeconds,
  }));
}

function buildStoryboardSheetPrompt(
  brief: string,
  scenePlan: ScenePlanItem[],
  options: { modelImageCount: number; hasProductImage: boolean }
): string {
  const panelLines = scenePlan
    .map(
      (s) =>
        `Panel ${s.index + 1} (${s.startSeconds}s-${s.endSeconds}s, ${s.shotType}): show ` +
        `${s.visualDescription}. Bold on-image caption text for this panel, rendered exactly as: ` +
        `"${s.onScreenText}".`
    )
    .join("\n");

  const peopleInstruction =
    options.modelImageCount > 1
      ? `Use the ${options.modelImageCount} people shown in the first ${options.modelImageCount} reference ` +
        "images as the recurring cast, keeping each of them visually consistent (same face/identity) " +
        "across every panel they appear in, matching each as closely as possible to their own " +
        "reference photo. "
      : options.modelImageCount === 1
        ? "Use the person from the first reference image consistently across every panel, matching " +
          "them as closely as possible to the reference. "
        : "";

  const productInstruction = options.hasProductImage
    ? `Use the product from the ${options.modelImageCount > 0 ? "last" : "attached"} reference image ` +
      "consistently across every panel, matching it as closely as possible to the reference. "
    : "";

  const referenceInstruction = peopleInstruction + productInstruction;
  const hasAnyReference = options.modelImageCount > 0 || options.hasProductImage;
  const identityInstruction = hasAnyReference ? ` ${PRESERVE_IDENTITY_INSTRUCTION}` : "";

  return (
    `Create a single storyboard sheet image for a short video, designed like a premium ad agency's ` +
    `shot-list deck. Context: ${brief}. Stack ${scenePlan.length} panels vertically in one image, ` +
    `each panel clearly separated with card-style framing (subtle border, soft drop shadow, ` +
    `consistent rounded corners and spacing), each labeled with a small numbered badge and its ` +
    `time-range, and each showing the described photo shot exactly as specified by its shot type ` +
    `(framing/angle) with its caption text baked into the image:\n${panelLines}\n` +
    `${referenceInstruction}Keep a cohesive color grade, lighting mood, and background styling ` +
    `across all panels so the sheet reads as one unified visual story, not disconnected photos. Add ` +
    `a clean title header at the top and subtle footer branding space. Clean modern layout, elegant ` +
    `readable typography, generous whitespace, brand-safe composition, polished high-resolution ` +
    `photography look.${identityInstruction}`
  );
}

export async function POST(request: NextRequest) {
  const form = await request.formData();

  const apiKey = form.get("apiKey");
  const brief = form.get("brief");
  const modeRaw = form.get("mode");
  const modelImages = form.getAll("modelImages").filter((v): v is File => v instanceof Blob);
  const productImage = form.get("productImage");
  const mode: Mode = VALID_MODES.includes(modeRaw as Mode) ? (modeRaw as Mode) : "full";

  if (typeof apiKey !== "string" || typeof brief !== "string") {
    return errorResponse("validation_error", "Missing apiKey or brief.", 400);
  }

  const keyError = validateApiKeyFormat(apiKey);
  if (keyError) return errorResponse("validation_error", keyError, 400);

  const briefError = validateBrief(brief);
  if (briefError) return errorResponse("validation_error", briefError, 400);

  if (mode === "prompt_only") {
    const storyboardImageBase64 = form.get("storyboardImageBase64");
    if (typeof storyboardImageBase64 !== "string" || !storyboardImageBase64) {
      return errorResponse("validation_error", "storyboardImageBase64 is required.", 400);
    }
    try {
      const videoPrompt = await callChatPrompt(apiKey, brief, storyboardImageBase64);
      return NextResponse.json({ videoPrompt });
    } catch (err) {
      return handleOpenAIError(err);
    }
  }

  if (mode === "caption_only") {
    try {
      const result = await callCaptionAndHashtags(apiKey, brief);
      return NextResponse.json(result);
    } catch (err) {
      return handleOpenAIError(err);
    }
  }

  if (mode === "image_only") {
    const scenePlanRaw = form.get("scenePlan");
    if (typeof scenePlanRaw !== "string") {
      return errorResponse("validation_error", "scenePlan is required.", 400);
    }
    let scenePlan: ScenePlanItem[];
    try {
      scenePlan = JSON.parse(scenePlanRaw);
      if (!Array.isArray(scenePlan) || scenePlan.length === 0) throw new Error("empty");
    } catch {
      return errorResponse("validation_error", "scenePlan must be a non-empty JSON array.", 400);
    }
    const hasProductImage = productImage instanceof Blob;
    for (const img of modelImages) {
      const modelImageError = validateImageFile({ type: img.type, size: img.size });
      if (modelImageError) return errorResponse("validation_error", modelImageError, 400);
    }
    if (hasProductImage) {
      const productImageError = validateImageFile({ type: (productImage as Blob).type, size: (productImage as Blob).size });
      if (productImageError) return errorResponse("validation_error", productImageError, 400);
    }

    try {
      const storyboardImageBase64 = await callImageEdit({
        apiKey,
        modelImages,
        productImage: hasProductImage ? (productImage as Blob) : undefined,
        promptText: buildStoryboardSheetPrompt(brief, scenePlan, {
          modelImageCount: modelImages.length,
          hasProductImage,
        }),
        size: deriveSheetSize(scenePlan.length),
      });
      return NextResponse.json({ storyboardImageBase64 });
    } catch (err) {
      return handleOpenAIError(err);
    }
  }

  // mode is "full" or "plan_only" from here on - both need duration/scene count.
  const durationSeconds = Number(form.get("durationSeconds")) || 10; // duration per clip
  const explicitSceneCountRaw = form.get("sceneCount");
  const explicitSceneCount = explicitSceneCountRaw ? Number(explicitSceneCountRaw) : undefined;
  const clipCountRaw = form.get("clipCount");
  const clipCount = Math.max(1, Math.min(4, Number(clipCountRaw) || 1));
  const contentMode: "sales" | "creative" = form.get("contentMode") === "creative" ? "creative" : "sales";

  const clipSceneRanges: SceneRange[][] = [];
  for (let i = 0; i < clipCount; i++) {
    const ranges = deriveSceneRanges(durationSeconds, explicitSceneCount);
    const sceneCountError = validateSceneCount(ranges.length);
    if (sceneCountError) return errorResponse("validation_error", sceneCountError, 400);
    clipSceneRanges.push(ranges);
  }

  let productImageBase64: string | undefined;
  let productImageMimeType: string | undefined;
  if (productImage instanceof Blob) {
    const productImageError = validateImageFile({ type: productImage.type, size: productImage.size });
    if (productImageError) return errorResponse("validation_error", productImageError, 400);
    productImageBase64 = Buffer.from(await productImage.arrayBuffer()).toString("base64");
    productImageMimeType = productImage.type || "image/png";
  }

  if (mode === "plan_only") {
    try {
      const result = await callScenePlan({
        apiKey,
        brief,
        clipSceneRanges,
        productImageBase64,
        productImageMimeType,
        contentMode,
      });
      const clips = result.clips.map((clip, i) => ({
        scenePlan: mergeSceneRanges(clip.scenes, clipSceneRanges[i]),
        voiceoverScript: clip.voiceoverScript,
      }));
      return NextResponse.json({ clips, productAnalysis: result.productAnalysis });
    } catch (err) {
      return handleOpenAIError(err);
    }
  }

  // mode === "full" (single-clip convenience path; not used by the current UI, which
  // always drives the two-step plan_only -> image_only flow)
  const hasProductImage = productImage instanceof Blob;
  for (const img of modelImages) {
    const modelImageError = validateImageFile({ type: img.type, size: img.size });
    if (modelImageError) return errorResponse("validation_error", modelImageError, 400);
  }

  try {
    const result = await callScenePlan({
      apiKey,
      brief,
      clipSceneRanges,
      productImageBase64,
      productImageMimeType,
      contentMode,
    });
    const scenePlan = mergeSceneRanges(result.clips[0].scenes, clipSceneRanges[0]);
    const voiceoverScript = result.clips[0].voiceoverScript;

    const storyboardImageBase64 = await callImageEdit({
      apiKey,
      modelImages,
      productImage: hasProductImage ? (productImage as Blob) : undefined,
      promptText: buildStoryboardSheetPrompt(brief, scenePlan, {
        modelImageCount: modelImages.length,
        hasProductImage,
      }),
      size: deriveSheetSize(scenePlan.length),
    });

    const videoPrompt = await callChatPrompt(apiKey, brief, storyboardImageBase64);

    return NextResponse.json({
      storyboardImageBase64,
      videoPrompt,
      scenePlan,
      voiceoverScript,
      productAnalysis: result.productAnalysis,
    });
  } catch (err) {
    return handleOpenAIError(err);
  }
}
