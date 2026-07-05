import { PRESERVE_IDENTITY_INSTRUCTION, type Orientation, type VoiceGender } from "./prompt-template";

export class GeminiApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface GeminiErrorBody {
  error?: {
    message?: string;
    status?: string;
  };
}

async function parseGeminiError(response: Response): Promise<GeminiApiError> {
  let body: GeminiErrorBody = {};
  try {
    body = (await response.json()) as GeminiErrorBody;
  } catch {
    // response wasn't JSON, fall through with a generic message
  }

  const rawMessage = body.error?.message ?? `Gemini request failed with status ${response.status}`;

  if (response.status === 400 && /api key/i.test(rawMessage)) {
    return new GeminiApiError("Invalid Gemini API key. Check the key and try again.", 400);
  }
  if (response.status === 401 || response.status === 403) {
    return new GeminiApiError("Invalid or unauthorized Gemini API key.", response.status);
  }
  if (response.status === 429) {
    return new GeminiApiError(
      "Rate limit or quota exceeded on your Gemini account. Wait and retry.",
      429
    );
  }
  return new GeminiApiError(`Gemini request failed: ${rawMessage}`, response.status);
}

// Documented values are "9:16" and "16:9" only - square is intentionally omitted
// so we fall back to the API's own default rather than guessing at an
// unsupported value.
const ORIENTATION_TO_ASPECT_RATIO: Partial<Record<Orientation, "9:16" | "16:9">> = {
  vertical: "9:16",
  horizontal: "16:9",
};

export interface CallOmniFlashVideoParams {
  apiKey: string;
  storyboardImageBase64: string;
  modelImageBase64: string;
  modelImageMimeType: string;
  productImageBase64: string;
  productImageMimeType: string;
  videoPrompt: string;
  narrationScript?: string;
  captionScript?: string;
  voiceGender?: VoiceGender;
  orientation: Orientation;
}

export interface OmniFlashVideoResult {
  videoBase64: string;
  mimeType: string;
}

export interface OmniFlashPromptParams {
  videoPrompt: string;
  narrationScript?: string;
  captionScript?: string;
  voiceGender?: VoiceGender;
}

// Pure text builder, shared by the real API call below AND by the UI, so users
// who want to paste the prompt manually into Google Flow (instead of using our
// Gemini key integration) get the exact same text - including the narration/
// caption instructions that would otherwise only ever be sent server-side and
// never shown to them, which is why a manually-pasted "videoPrompt" alone
// produces a silent clip in Flow.
export function buildOmniFlashPromptText(params: OmniFlashPromptParams): string {
  const { videoPrompt, narrationScript, captionScript, voiceGender } = params;

  const captionInstruction = captionScript
    ? ` Render these exact on-screen text captions, burned into the video at the matching time - ` +
      `do not paraphrase, translate, or alter the wording in any way: ${captionScript}`
    : "";

  const voiceInstruction = voiceGender
    ? ` The narration must be spoken in a ${voiceGender === "male" ? "male" : "female"} voice.`
    : "";

  const narrationInstruction = narrationScript
    ? ` Include one continuous spoken voiceover narration track for the whole video, read straight ` +
      `through without pausing or restarting between shots, matching exactly this script: ` +
      `${narrationScript}${voiceInstruction}`
    : "";

  return (
    `${videoPrompt} Follow the storyboard image's panels and timing as a scene-by-scene ` +
    `guide, and keep the person/product consistent with the two reference photos. ` +
    `${PRESERVE_IDENTITY_INSTRUCTION}${captionInstruction}${narrationInstruction}`
  );
}

export async function callOmniFlashVideo(params: CallOmniFlashVideoParams): Promise<OmniFlashVideoResult> {
  const {
    apiKey,
    storyboardImageBase64,
    modelImageBase64,
    modelImageMimeType,
    productImageBase64,
    productImageMimeType,
    videoPrompt,
    narrationScript,
    captionScript,
    voiceGender,
    orientation,
  } = params;

  const promptText = buildOmniFlashPromptText({ videoPrompt, narrationScript, captionScript, voiceGender });

  const body: Record<string, unknown> = {
    model: "gemini-omni-flash-preview",
    input: [
      { type: "image", data: storyboardImageBase64, mime_type: "image/png" },
      { type: "image", data: modelImageBase64, mime_type: modelImageMimeType },
      { type: "image", data: productImageBase64, mime_type: productImageMimeType },
      { type: "text", text: promptText },
    ],
    generation_config: { video_config: { task: "reference_to_video" } },
  };

  const aspectRatio = ORIENTATION_TO_ASPECT_RATIO[orientation];
  if (aspectRatio) {
    body.response_format = { type: "video", aspect_ratio: aspectRatio };
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await parseGeminiError(response);
  }

  const data = await response.json();
  const videoContent = data?.steps
    ?.find((s: { type: string }) => s.type === "model_output")
    ?.content?.find((c: { type: string }) => c.type === "video");

  if (!videoContent?.data) {
    throw new GeminiApiError("Gemini did not return a video.", 500);
  }

  return { videoBase64: videoContent.data, mimeType: videoContent.mime_type ?? "video/mp4" };
}
