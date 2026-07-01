import type { Orientation, VoiceGender } from "./prompt-template";

export interface ScenePlanItem {
  index: number;
  startSeconds: number;
  endSeconds: number;
  visualDescription: string;
  onScreenText: string;
  voiceoverLine: string;
}

export interface StoryboardResult {
  storyboardImageBase64: string;
  videoPrompt: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface GenerateVideoInput {
  apiKey?: string; // Gemini key; absent -> mock fallback
  storyboardImageBase64: string;
  modelImageBase64?: string;
  modelImageMimeType?: string;
  productImageBase64?: string;
  productImageMimeType?: string;
  videoPrompt: string;
  narrationScript?: string; // composed from scenePlan voiceoverLine fields, time-ordered
  captionScript?: string; // composed from scenePlan onScreenText fields, time-ordered
  voiceGender?: VoiceGender;
  orientation: Orientation;
}

export interface VideoJobResult {
  status: "completed" | "failed";
  placeholder?:
    | { kind: "mock-canvas"; sourceImageBase64: string; caption: string }
    | { kind: "gemini-video"; videoBase64: string; mimeType: string; caption: string };
  errorMessage?: string;
}
