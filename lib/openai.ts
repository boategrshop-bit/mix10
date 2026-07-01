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

export async function callScenePlan(
  apiKey: string,
  brief: string,
  sceneRanges: SceneRange[]
): Promise<RawScenePlanItem[]> {
  const sceneCount = sceneRanges.length;
  const durationSeconds = sceneRanges[sceneRanges.length - 1]?.endSeconds ?? 0;
  const budgetLines = sceneRanges
    .map(
      (r) =>
        `Scene ${r.index}: ${r.startSeconds}s-${r.endSeconds}s, max ${maxWordsForDuration(
          r.endSeconds - r.startSeconds
        )} Thai words for voiceoverLine`
    )
    .join("\n");

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
        {
          role: "system",
          content:
            "You plan storyboards for short marketing videos. Given a brief and a per-scene time " +
            "budget, output strict JSON of the shape " +
            '{"scenes":[{"index":number,"visualDescription":string,"onScreenText":string,' +
            '"voiceoverLine":string}]}. You must output exactly the requested number of scenes, ' +
            "indexed 0 to count-1, covering the full duration in order. visualDescription must be " +
            "in English, describing a single pose/action for a photorealistic reference photo " +
            "featuring the same recurring person and product across all scenes (varying only the " +
            "pose/action/setting) - do not describe any on-image text in it. onScreenText must be " +
            "a short Thai caption for that scene, under 60 characters. voiceoverLine must be one " +
            "Thai voiceover sentence for that scene, paced to be naturally speakable within that " +
            "scene's time slot - strictly respect the max word count given per scene below so the " +
            "narration timing feels natural, never rushed or cut off. The LAST scene's onScreenText " +
            "and voiceoverLine must both include a strong Thai call-to-action (CTA) urging the " +
            "viewer to buy/click immediately, using natural Thai livestream/TikTok sales phrasing " +
            "such as ปักพิกัดให้แล้ว, " +
            "กดตะกร้าได้เลย, " +
            "ปักลิ้งให้แล้ว, " +
            "รีบไปตำ, or รีบไปกด " +
            "- pick phrasing that fits the brief naturally, while still respecting that scene's word " +
            "budget. Output only the JSON object, no markdown.",
        },
        {
          role: "user",
          content:
            `Brief: ${brief}\nTotal duration: ${durationSeconds} seconds\nScene count: ${sceneCount}\n` +
            `Per-scene timing and voiceoverLine word budgets:\n${budgetLines}`,
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
    throw new OpenAIApiError("OpenAI did not return a scene plan.", 500);
  }

  let parsed: { scenes?: RawScenePlanItem[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new OpenAIApiError("OpenAI returned an invalid scene plan.", 500);
  }

  if (!Array.isArray(parsed.scenes) || parsed.scenes.length !== sceneCount) {
    throw new OpenAIApiError(
      `OpenAI returned ${parsed.scenes?.length ?? 0} scenes, expected ${sceneCount}.`,
      500
    );
  }

  return parsed.scenes;
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
