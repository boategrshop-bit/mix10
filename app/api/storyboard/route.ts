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
import { deriveSceneCount, deriveSceneRanges, deriveSheetSize, PRESERVE_IDENTITY_INSTRUCTION, type SceneRange } from "@/lib/prompt-template";
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

function buildStoryboardSheetPrompt(brief: string, scenePlan: ScenePlanItem[]): string {
  const panelLines = scenePlan
    .map(
      (s) =>
        `Panel ${s.index + 1} (${s.startSeconds}s-${s.endSeconds}s, ${s.shotType}): show ` +
        `${s.visualDescription}. Bold on-image caption text for this panel, rendered exactly as: ` +
        `"${s.onScreenText}".`
    )
    .join("\n");

  return (
    `Create a single storyboard sheet image for a marketing video, designed like a premium ad ` +
    `agency's shot-list deck. Context: ${brief}. Stack ${scenePlan.length} panels vertically in ` +
    `one image, each panel clearly separated with card-style framing (subtle border, soft drop ` +
    `shadow, consistent rounded corners and spacing), each labeled with a small numbered badge and ` +
    `its time-range, and each showing the described photo shot exactly as specified by its shot ` +
    `type (framing/angle) with its caption text baked into the image:\n${panelLines}\n` +
    `Use the person from the first reference image and the product from the second reference ` +
    `image consistently across every panel, matching both as closely as possible to the ` +
    `references. Keep a cohesive color grade, lighting mood, and background styling across all ` +
    `panels so the sheet reads as one unified visual story, not disconnected photos. Add a clean ` +
    `title header at the top and subtle footer branding space. Clean modern layout, elegant ` +
    `readable typography, generous whitespace, product/brand-safe composition, polished ` +
    `high-resolution photography look. ${PRESERVE_IDENTITY_INSTRUCTION}`
  );
}

export async function POST(request: NextRequest) {
  const form = await request.formData();

  const apiKey = form.get("apiKey");
  const brief = form.get("brief");
  const modeRaw = form.get("mode");
  const modelImage = form.get("modelImage");
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
    if (!(modelImage instanceof Blob) || !(productImage instanceof Blob)) {
      return errorResponse("validation_error", "Both model and product images are required.", 400);
    }
    const modelImageError = validateImageFile({ type: modelImage.type, size: modelImage.size });
    if (modelImageError) return errorResponse("validation_error", modelImageError, 400);
    const productImageError = validateImageFile({ type: productImage.type, size: productImage.size });
    if (productImageError) return errorResponse("validation_error", productImageError, 400);

    try {
      const storyboardImageBase64 = await callImageEdit({
        apiKey,
        modelImage,
        productImage,
        promptText: buildStoryboardSheetPrompt(brief, scenePlan),
        size: deriveSheetSize(scenePlan.length),
      });
      return NextResponse.json({ storyboardImageBase64 });
    } catch (err) {
      return handleOpenAIError(err);
    }
  }

  // mode is "full" or "plan_only" from here on - both need duration/scene count.
  const durationSeconds = Number(form.get("durationSeconds")) || 10;
  const explicitSceneCountRaw = form.get("sceneCount");
  const explicitSceneCount = explicitSceneCountRaw ? Number(explicitSceneCountRaw) : undefined;
  const sceneCount = deriveSceneCount(durationSeconds, explicitSceneCount);
  const sceneCountError = validateSceneCount(sceneCount);
  if (sceneCountError) return errorResponse("validation_error", sceneCountError, 400);
  const sceneRanges = deriveSceneRanges(durationSeconds, explicitSceneCount);

  if (mode === "plan_only") {
    try {
      const rawItems = await callScenePlan(apiKey, brief, sceneRanges);
      const scenePlan = mergeSceneRanges(rawItems, sceneRanges);
      return NextResponse.json({ scenePlan });
    } catch (err) {
      return handleOpenAIError(err);
    }
  }

  // mode === "full"
  if (!(modelImage instanceof Blob) || !(productImage instanceof Blob)) {
    return errorResponse("validation_error", "Both model and product images are required.", 400);
  }
  const modelImageError = validateImageFile({ type: modelImage.type, size: modelImage.size });
  if (modelImageError) return errorResponse("validation_error", modelImageError, 400);
  const productImageError = validateImageFile({ type: productImage.type, size: productImage.size });
  if (productImageError) return errorResponse("validation_error", productImageError, 400);

  try {
    const rawItems = await callScenePlan(apiKey, brief, sceneRanges);
    const scenePlan = mergeSceneRanges(rawItems, sceneRanges);

    const storyboardImageBase64 = await callImageEdit({
      apiKey,
      modelImage,
      productImage,
      promptText: buildStoryboardSheetPrompt(brief, scenePlan),
      size: deriveSheetSize(scenePlan.length),
    });

    const videoPrompt = await callChatPrompt(apiKey, brief, storyboardImageBase64);

    return NextResponse.json({ storyboardImageBase64, videoPrompt, scenePlan });
  } catch (err) {
    return handleOpenAIError(err);
  }
}
