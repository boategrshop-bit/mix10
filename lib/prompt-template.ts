export type Orientation = "vertical" | "horizontal" | "square";
export type VoiceGender = "male" | "female";
export type VideoTarget = "omni-flash" | "veo-3.1-lite";

export interface BriefTemplateFields {
  productName: string;
  durationSeconds: number;
  orientation: Orientation;
  style: string;
  shotCount: number | null; // null = derive automatically from durationSeconds
}

const ORIENTATION_LABEL_TH: Record<Orientation, string> = {
  vertical: "แนวตั้ง",
  horizontal: "แนวนอน",
  square: "จัตุรัส",
};

// gpt-image-2 accepts arbitrary WIDTHxHEIGHT (both edges divisible by 16, aspect
// ratio between 1:3 and 3:1). These presets match standard video aspect ratios.
export const ORIENTATION_TO_SIZE: Record<Orientation, "720x1280" | "1280x720" | "1024x1024"> = {
  vertical: "720x1280", // 9:16
  horizontal: "1280x720", // 16:9
  square: "1024x1024", // 1:1
};

export function composeBrief(fields: BriefTemplateFields): string {
  const product = fields.productName.trim() || "[สินค้า]";
  const style = fields.style.trim() || "โมเดิร์น มินิมอล";
  const orientationLabel = ORIENTATION_LABEL_TH[fields.orientation];
  const duration = fields.durationSeconds > 0 ? fields.durationSeconds : 10;

  return (
    `สร้างภาพสตอรี่บอร์ด นางแบบคนในภาพที่แนบไป ขาย ${product} ${duration} วินาที ` +
    `เป็นวีดีโอ${orientationLabel} โดยแนบภาพ ${product} ไปให้แล้ว ทำให้สินค้าตรงปกที่สุด ` +
    `มีข้อความตัวหนังสือบนภาพด้วย ตามสไตล์ ${style} ตามคีย์เวิร์ดที่สมควรจะขาย`
  );
}

// Shared instruction reused by both the storyboard image prompt and the video
// generation prompt, so product/model identity stays consistent end-to-end.
export const PRESERVE_IDENTITY_INSTRUCTION =
  "Do not alter, redesign, or change the product's packaging, label, shape, or color in any " +
  "way, and do not alter the model's face or identity - keep both exactly as shown in the " +
  "reference photos.";

export function validateProductName(name: string): string | null {
  if (!name.trim()) return "กรุณาระบุชื่อสินค้า";
  return null;
}

export interface SceneRange {
  index: number;
  startSeconds: number;
  endSeconds: number;
}

const SCENE_CHUNK_SECONDS = 2;

export function deriveSceneCount(durationSeconds: number, explicitSceneCount?: number | null): number {
  if (explicitSceneCount && explicitSceneCount > 0) return Math.round(explicitSceneCount);
  const safeDuration = durationSeconds > 0 ? durationSeconds : 10;
  return Math.max(1, Math.round(safeDuration / SCENE_CHUNK_SECONDS));
}

export function deriveSceneRanges(durationSeconds: number, explicitSceneCount?: number | null): SceneRange[] {
  const safeDuration = durationSeconds > 0 ? durationSeconds : 10;
  const count = deriveSceneCount(safeDuration, explicitSceneCount);
  const ranges: SceneRange[] = [];
  for (let i = 0; i < count; i++) {
    const start = Math.round((i * safeDuration) / count);
    const end = i === count - 1 ? safeDuration : Math.round(((i + 1) * safeDuration) / count);
    ranges.push({ index: i, startSeconds: start, endSeconds: end });
  }
  return ranges;
}

// Rough natural Thai narration pace, used to cap voiceoverLine length per scene so
// the spoken line is actually speakable within that scene's time slot.
const WORDS_PER_SECOND = 2.5;

export function maxWordsForDuration(durationSeconds: number): number {
  return Math.max(2, Math.round(durationSeconds * WORDS_PER_SECOND));
}

// Sheet size for the single combined storyboard image, derived from scene count -
// independent of video `orientation` (which only governs the mock video step).
// gpt-image-2 requires: edges divisible by 16, aspect ratio between 1:3 and 3:1,
// max single edge 3840px, total pixels between 655,360 and 8,294,400.
export function deriveSheetSize(sceneCount: number): string {
  const width = 1024;
  const perPanelHeight = 640;
  const chromeHeight = 300; // header title + footer branding space
  const rawHeight = perPanelHeight * sceneCount + chromeHeight;
  const maxHeight = width * 3; // 1:3 minimum aspect ratio
  const height = Math.min(3840, Math.max(width, Math.min(rawHeight, maxHeight)));
  const roundedHeight = Math.floor(height / 16) * 16;
  return `${width}x${roundedHeight}`;
}
