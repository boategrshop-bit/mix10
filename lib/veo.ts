import { PRESERVE_IDENTITY_INSTRUCTION, type Orientation } from "./prompt-template";

export class VeoApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "veo-3.1-lite-generate-preview";

// Documented values are "16:9" and "9:16" only - square is intentionally
// omitted, same convention as lib/gemini.ts's Omni Flash mapping.
const ORIENTATION_TO_ASPECT_RATIO: Partial<Record<Orientation, "16:9" | "9:16">> = {
  vertical: "9:16",
  horizontal: "16:9",
};

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 30; // ~5 minutes

interface VeoErrorBody {
  error?: { message?: string; code?: number };
}

async function parseVeoError(response: Response): Promise<VeoApiError> {
  let body: VeoErrorBody = {};
  try {
    body = (await response.json()) as VeoErrorBody;
  } catch {
    // response wasn't JSON, fall through with a generic message
  }
  const rawMessage = body.error?.message ?? `Veo request failed with status ${response.status}`;

  if (response.status === 400 && /api key/i.test(rawMessage)) {
    return new VeoApiError("Invalid Gemini API key. Check the key and try again.", 400);
  }
  if (response.status === 401 || response.status === 403) {
    return new VeoApiError("Invalid or unauthorized Gemini API key.", response.status);
  }
  if (response.status === 429) {
    return new VeoApiError("Rate limit or quota exceeded on your Gemini account. Wait and retry.", 429);
  }
  return new VeoApiError(`Veo request failed: ${rawMessage}`, response.status);
}

export interface CallVeoVideoParams {
  apiKey: string;
  storyboardImageBase64: string;
  videoPrompt: string;
  narrationScript?: string;
  captionScript?: string;
  voiceGender?: "male" | "female";
  orientation: Orientation;
}

export interface VeoVideoResult {
  videoBase64: string;
  mimeType: string;
}

function buildVeoPromptText(params: CallVeoVideoParams): string {
  const { videoPrompt, narrationScript, captionScript, voiceGender } = params;

  const captionInstruction = captionScript
    ? ` Render these exact on-screen text captions, burned into the video at the matching time - ` +
      `do not paraphrase, translate, or alter the wording in any way: ${captionScript}`
    : "";
  const voiceInstruction = voiceGender
    ? ` The narration must be spoken in a ${voiceGender === "male" ? "male" : "female"} voice.`
    : "";
  const narrationInstruction = narrationScript
    ? ` Include spoken voiceover narration/dialogue audio matching this script, timed to the ` +
      `matching scene: ${narrationScript}${voiceInstruction}`
    : "";

  return (
    `${videoPrompt} Follow the reference storyboard image's panels and timing as a scene-by-scene ` +
    `guide. ${PRESERVE_IDENTITY_INSTRUCTION}${captionInstruction}${narrationInstruction}`
  );
}

export async function callVeoVideo(params: CallVeoVideoParams): Promise<VeoVideoResult> {
  const { apiKey, storyboardImageBase64, orientation } = params;

  const submitResponse = await fetch(`${BASE_URL}/models/${MODEL}:predictLongRunning`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [
        {
          prompt: buildVeoPromptText(params),
          image: { inlineData: { mimeType: "image/png", data: storyboardImageBase64 } },
        },
      ],
      parameters: {
        aspectRatio: ORIENTATION_TO_ASPECT_RATIO[orientation] ?? "16:9",
        durationSeconds: "8",
        resolution: "720p",
      },
    }),
  });

  if (!submitResponse.ok) {
    throw await parseVeoError(submitResponse);
  }

  const submitData = await submitResponse.json();
  const operationName: string | undefined = submitData?.name;
  if (!operationName) {
    throw new VeoApiError("Veo did not return an operation to poll.", 500);
  }

  let operation = submitData;
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS && !operation.done; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const pollResponse = await fetch(`${BASE_URL}/${operationName}`, {
      headers: { "x-goog-api-key": apiKey },
    });
    if (!pollResponse.ok) {
      throw await parseVeoError(pollResponse);
    }
    operation = await pollResponse.json();
  }

  if (!operation.done) {
    throw new VeoApiError("Veo video generation timed out. Try again later.", 504);
  }
  if (operation.error) {
    throw new VeoApiError(`Veo generation failed: ${operation.error.message ?? "unknown error"}`, 500);
  }

  const videoUri: string | undefined =
    operation?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  if (!videoUri) {
    throw new VeoApiError("Veo did not return a video.", 500);
  }

  const videoResponse = await fetch(videoUri, { headers: { "x-goog-api-key": apiKey } });
  if (!videoResponse.ok) {
    throw await parseVeoError(videoResponse);
  }

  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
  return { videoBase64: videoBuffer.toString("base64"), mimeType: "video/mp4" };
}
