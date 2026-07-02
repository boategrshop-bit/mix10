import { callOmniFlashVideo, GeminiApiError } from "./gemini";
import { callVeoVideo, VeoApiError } from "./veo";
import type { GenerateVideoInput, VideoJobResult } from "./types";

export interface VideoProvider {
  name: string;
  generateVideo(input: GenerateVideoInput): Promise<VideoJobResult>;
}

// Simulated processing delay so the client's progress bar has something real
// to wait on, without needing server-side job state (no DB in this MVP).
const MOCK_DELAY_MS = 1500;

const mockVideoProvider: VideoProvider = {
  name: "mock",
  async generateVideo(input: GenerateVideoInput): Promise<VideoJobResult> {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

    return {
      status: "completed",
      placeholder: {
        kind: "mock-canvas",
        sourceImageBase64: input.storyboardImageBase64,
        caption: [
          input.videoPrompt,
          input.captionScript ? `Captions: ${input.captionScript}` : null,
          input.narrationScript ? `VO (${input.voiceGender ?? "unspecified"}): ${input.narrationScript}` : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    };
  },
};

const geminiVideoProvider: VideoProvider = {
  name: "gemini-omni-flash",
  async generateVideo(input: GenerateVideoInput): Promise<VideoJobResult> {
    if (!input.apiKey || !input.modelImageBase64 || !input.productImageBase64) {
      throw new GeminiApiError("Missing Gemini key or reference images.", 400);
    }
    const result = await callOmniFlashVideo({
      apiKey: input.apiKey,
      storyboardImageBase64: input.storyboardImageBase64,
      modelImageBase64: input.modelImageBase64,
      modelImageMimeType: input.modelImageMimeType ?? "image/png",
      productImageBase64: input.productImageBase64,
      productImageMimeType: input.productImageMimeType ?? "image/png",
      videoPrompt: input.videoPrompt,
      narrationScript: input.narrationScript,
      captionScript: input.captionScript,
      voiceGender: input.voiceGender,
      orientation: input.orientation,
    });
    return {
      status: "completed",
      placeholder: {
        kind: "gemini-video",
        videoBase64: result.videoBase64,
        mimeType: result.mimeType,
        caption: input.videoPrompt,
        providerLabel: "Generated via Google Gemini Omni Flash.",
      },
    };
  },
};

const veoVideoProvider: VideoProvider = {
  name: "veo-3.1-lite",
  async generateVideo(input: GenerateVideoInput): Promise<VideoJobResult> {
    if (!input.apiKey) {
      throw new VeoApiError("Missing Gemini key.", 400);
    }
    const result = await callVeoVideo({
      apiKey: input.apiKey,
      storyboardImageBase64: input.storyboardImageBase64,
      videoPrompt: input.videoPrompt,
      narrationScript: input.narrationScript,
      captionScript: input.captionScript,
      voiceGender: input.voiceGender,
      orientation: input.orientation,
    });
    return {
      status: "completed",
      placeholder: {
        kind: "gemini-video",
        videoBase64: result.videoBase64,
        mimeType: result.mimeType,
        caption: input.videoPrompt,
        providerLabel: "Generated via Veo 3.1 Lite (8s).",
      },
    };
  },
};

// BYOK: the choice of provider is per-request, not a build-time constant - if the
// caller supplied a Gemini API key, use the real provider matching input.videoTarget
// (both Omni Flash and Veo 3.1 Lite are part of the Gemini API family, same key);
// otherwise fall back to the mock (no forced dependency on Gemini access working).
export function selectVideoProvider(input: GenerateVideoInput): VideoProvider {
  if (!input.apiKey) return mockVideoProvider;
  return input.videoTarget === "veo-3.1-lite" ? veoVideoProvider : geminiVideoProvider;
}
