const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB client-side cap (server allows more)
const MIN_BRIEF_LENGTH = 5;
const MAX_BRIEF_LENGTH = 500;

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Please upload a PNG, JPEG, or WebP image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image is too large. Please upload a file under 10MB.";
  }
  return null;
}

export function validateBrief(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < MIN_BRIEF_LENGTH) {
    return `Brief must be at least ${MIN_BRIEF_LENGTH} characters.`;
  }
  if (trimmed.length > MAX_BRIEF_LENGTH) {
    return `Brief must be under ${MAX_BRIEF_LENGTH} characters.`;
  }
  return null;
}

export function validateApiKeyFormat(key: string): string | null {
  const trimmed = key.trim();
  if (trimmed.length < 20) {
    return "That doesn't look like a valid OpenAI API key.";
  }
  return null;
}

const MIN_SCENE_COUNT = 1;
const MAX_SCENE_COUNT = 12;
const MAX_CAPTION_LENGTH = 80;

export function validateSceneCount(count: number): string | null {
  if (count < MIN_SCENE_COUNT || count > MAX_SCENE_COUNT) {
    return `Scene count must be between ${MIN_SCENE_COUNT} and ${MAX_SCENE_COUNT}. Try a shorter duration.`;
  }
  return null;
}

export function validateSceneCaption(text: string): string | null {
  if (text.length > MAX_CAPTION_LENGTH) {
    return `Caption must be under ${MAX_CAPTION_LENGTH} characters.`;
  }
  return null;
}
