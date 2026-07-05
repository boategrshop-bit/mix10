import { maxWordsForDuration, type SceneRange } from "./prompt-template";
import type { ScenePlanItem } from "./types";

export class OpenAIApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface OpenAIErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

async function parseOpenAIError(response: Response): Promise<OpenAIApiError> {
  let body: OpenAIErrorBody = {};
  try {
    body = (await response.json()) as OpenAIErrorBody;
  } catch {
    // response wasn't JSON, fall through with a generic message
  }

  const rawMessage = body.error?.message ?? `OpenAI request failed with status ${response.status}`;

  if (response.status === 401) {
    return new OpenAIApiError("Invalid OpenAI API key. Check the key and try again.", 401, body.error?.code);
  }
  if (response.status === 429) {
    return new OpenAIApiError(
      "Rate limit or quota exceeded on your OpenAI account. Wait and retry.",
      429,
      body.error?.code
    );
  }
  if (response.status === 400 && body.error?.code === "content_policy_violation") {
    return new OpenAIApiError(
      "The request was rejected by OpenAI's content policy. Try different images or wording.",
      400,
      body.error?.code
    );
  }
  return new OpenAIApiError(`OpenAI request failed: ${rawMessage}`, response.status, body.error?.code);
}

export interface CallImageEditParams {
  apiKey: string;
  modelImage: Blob;
  productImage: Blob;
  promptText: string;
  size: string;
}

export async function callImageEdit(params: CallImageEditParams): Promise<string> {
  const { apiKey, modelImage, productImage, promptText, size } = params;

  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("image[]", modelImage, "model.png");
  form.append("image[]", productImage, "product.png");
  form.append("prompt", promptText);
  form.append("size", size);
  form.append("quality", "medium");
  form.append("n", "1");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    throw await parseOpenAIError(response);
  }

  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    throw new OpenAIApiError("OpenAI did not return an image.", 500);
  }
  return b64 as string;
}

export type RawScenePlanItem = Omit<ScenePlanItem, "startSeconds" | "endSeconds">;

export interface CallScenePlanParams {
  apiKey: string;
  brief: string;
  clipSceneRanges: SceneRange[][]; // one SceneRange[] per clip, precomputed by the caller
  productImageBase64?: string;
  productImageMimeType?: string;
}

export interface ClipPlanRaw {
  voiceoverScript: string; // one continuous voiceover for the whole clip
  scenes: RawScenePlanItem[];
}

export interface ScenePlanCallResult {
  productAnalysis: string;
  clips: ClipPlanRaw[]; // clips[clipIndex] = that clip's own scenes + continuous VO script
}

export async function callScenePlan(params: CallScenePlanParams): Promise<ScenePlanCallResult> {
  const { apiKey, brief, clipSceneRanges, productImageBase64, productImageMimeType } = params;
  const clipCount = clipSceneRanges.length;

  const clipBudgetBlocks = clipSceneRanges
    .map((ranges, clipIndex) => {
      const clipDuration = ranges[ranges.length - 1]?.endSeconds ?? 0;
      const maxWords = maxWordsForDuration(clipDuration);
      const lines = ranges.map((r) => `  Scene ${r.index}: ${r.startSeconds}s-${r.endSeconds}s (visual only)`).join("\n");
      return (
        `Clip ${clipIndex} (${clipDuration}s total, ${ranges.length} scenes, max ${maxWords} Thai ` +
        `words for its ONE continuous voiceoverScript):\n${lines}`
      );
    })
    .join("\n\n");

  const continuityInstruction =
    clipCount > 1
      ? `This is a MULTI-CLIP campaign of ${clipCount} separate video clips meant to be watched in ` +
        `sequence as ONE continuous story - like chapters of a single narrative, not ${clipCount} ` +
        "unrelated ads. Clip 0 must hook the viewer and introduce the product; middle clips should " +
        "build interest, demonstrate use, or reveal benefits one at a time; the LAST clip must close " +
        "with a strong call-to-action. Do not repeat the same beat, pose, or message across clips - " +
        "each clip should clearly continue from where the previous one left off. "
      : "";

  const productVisionInstruction = productImageBase64
    ? "You are also shown a photo of the actual product. Study it closely and use what you see - " +
      "packaging, shape, color, material, any visible text/branding, apparent category - to write a " +
      "short productAnalysis (in Thai, 2-4 sentences) identifying what the product is, 2-3 concrete " +
      "selling points or features you can actually see or reasonably infer, and who it's for. Then " +
      "use those concrete selling points throughout voiceoverScript/onScreenText so the copy sells " +
      "specific real benefits instead of generic marketing filler. "
    : "You were not given a product photo, so keep productAnalysis as an empty string and write " +
      "voiceoverScript/onScreenText from the brief alone. ";

  const systemMessage =
    "You are an art director and copywriter planning storyboards for short, visually polished, " +
    "high-converting marketing videos. " +
    productVisionInstruction +
    continuityInstruction +
    'Output strict JSON of the shape {"productAnalysis":string,"clips":[{"clipIndex":number,' +
    '"voiceoverScript":string,"scenes":[{"index":number,"visualDescription":string,"shotType":string,' +
    '"onScreenText":string}]}]}. You must output exactly the requested number of clips, each with ' +
    "exactly its requested number of scenes indexed 0 to count-1 within that clip, covering that " +
    "clip's full duration in order. voiceoverScript must be ONE single continuous Thai voiceover " +
    "script for that entire clip - natural flowing spoken narration read straight through without " +
    "pausing, restarting, or being chopped into separate lines per shot; the visual cuts between " +
    "scenes happen while this one narration keeps talking underneath continuously. Respect the max " +
    "word budget given for that clip's total duration so the whole script is naturally speakable " +
    "within the clip's length, never rushed or cut off. shotType must be a short English phrase " +
    "naming the camera framing for that scene (e.g. 'wide establishing shot', 'medium shot', " +
    "'close-up', 'over-the-shoulder', 'flat-lay product shot', 'low-angle hero shot', 'macro detail " +
    "shot'), chosen to fit that beat of the story and varied meaningfully scene-to-scene (do not " +
    "repeat the same shotType back-to-back unless the brief clearly calls for it). visualDescription " +
    "must be in English, richly describing a single photorealistic pose/action/moment for a " +
    "reference photo - cover the framing implied by shotType, the setting/background, lighting " +
    "mood, and any styling detail relevant to the brief - featuring the same recurring person and " +
    "product across all scenes and clips (varying only the pose/action/setting/framing) - do not " +
    "describe any on-image text in it. onScreenText must be a short Thai caption for that scene, " +
    "under 60 characters, thematically matching whatever the voiceoverScript is saying at that " +
    "point in the clip. The LAST clip's voiceoverScript and its LAST scene's onScreenText must both " +
    "include a strong Thai call-to-action (CTA) urging the viewer to buy/click immediately, using " +
    "natural Thai livestream/TikTok sales phrasing such as ปักพิกัดให้แล้ว, กดตะกร้าได้เลย, " +
    "ปักลิ้งให้แล้ว, รีบไปตำ, or รีบไปกด - pick phrasing that fits the brief naturally, while still " +
    "respecting the word budget. Output only the JSON object, no markdown.";

  const userText =
    `Brief: ${brief}\nClip count: ${clipCount}\n\n` +
    `Per-clip timing and voiceoverScript word budgets:\n${clipBudgetBlocks}`;

  const userContent = productImageBase64
    ? [
        { type: "text", text: userText },
        {
          type: "image_url",
          image_url: { url: `data:${productImageMimeType ?? "image/png"};base64,${productImageBase64}` },
        },
      ]
    : userText;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    throw await parseOpenAIError(response);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new OpenAIApiError("OpenAI did not return a scene plan.", 500);
  }

  let parsed: {
    productAnalysis?: string;
    clips?: { clipIndex: number; voiceoverScript?: string; scenes: RawScenePlanItem[] }[];
  };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new OpenAIApiError("OpenAI returned an invalid scene plan.", 500);
  }

  if (!Array.isArray(parsed.clips) || parsed.clips.length !== clipCount) {
    throw new OpenAIApiError(`OpenAI returned ${parsed.clips?.length ?? 0} clips, expected ${clipCount}.`, 500);
  }

  const clips: ClipPlanRaw[] = clipSceneRanges.map((ranges, clipIndex) => {
    const clip = parsed.clips!.find((c) => c.clipIndex === clipIndex) ?? parsed.clips![clipIndex];
    if (!Array.isArray(clip?.scenes) || clip.scenes.length !== ranges.length) {
      throw new OpenAIApiError(
        `OpenAI returned ${clip?.scenes?.length ?? 0} scenes for clip ${clipIndex}, expected ${ranges.length}.`,
        500
      );
    }
    return { voiceoverScript: clip.voiceoverScript ?? "", scenes: clip.scenes };
  });

  return { productAnalysis: parsed.productAnalysis ?? "", clips };
}

export async function callChatPrompt(
  apiKey: string,
  brief: string,
  storyboardImageBase64: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You write concise, actionable prompts for an AI video generation model, grounded in " +
            "an actual storyboard image you are shown. Look closely at the storyboard image's " +
            "panels, poses, product placement, and on-image captions, then output 2-4 sentences " +
            "describing camera motion, pacing, and on-screen action that would bring exactly this " +
            "storyboard to life as a short video, panel by panel in order. No dialogue, no scene " +
            "numbers, no markdown, no references to 'the image' or 'the storyboard' itself.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Brief: ${brief}\nHere is the generated storyboard image:` },
            { type: "image_url", image_url: { url: `data:image/png;base64,${storyboardImageBase64}` } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw await parseOpenAIError(response);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new OpenAIApiError("OpenAI did not return a video prompt.", 500);
  }
  return content as string;
}

export interface CaptionAndHashtags {
  caption: string;
  hashtags: string[];
}

export async function callCaptionAndHashtags(apiKey: string, brief: string): Promise<CaptionAndHashtags> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write social media captions and hashtags for short marketing videos, ready for a " +
            "seller to paste directly onto TikTok/Facebook/Instagram. Given a marketing brief, output " +
            'strict JSON of the shape {"caption":string,"hashtags":string[]}. caption must be in Thai, ' +
            "2-4 sentences, engaging and sales-oriented, may include relevant emoji, and end with a " +
            "clear call-to-action. hashtags must be an array of 8-12 relevant hashtags (mix of Thai " +
            "and English as appropriate), each string starting with # and containing no spaces. " +
            "Output only the JSON object, no markdown.",
        },
        {
          role: "user",
          content: `Brief: ${brief}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw await parseOpenAIError(response);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new OpenAIApiError("OpenAI did not return a caption.", 500);
  }

  let parsed: Partial<CaptionAndHashtags>;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new OpenAIApiError("OpenAI returned an invalid caption response.", 500);
  }

  if (typeof parsed.caption !== "string" || !Array.isArray(parsed.hashtags)) {
    throw new OpenAIApiError("OpenAI returned an incomplete caption response.", 500);
  }

  return { caption: parsed.caption, hashtags: parsed.hashtags };
}
