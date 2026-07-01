import type { Orientation } from "./prompt-template";

export const ORIENTATION_ASPECT: Record<Orientation, string> = {
  // Cap by max-width (not max-height) so the 9:16 aspect ratio is preserved by
  // shrinking width, instead of clamping height and squishing the frame square.
  vertical: "aspect-[9/16] max-w-[380px]",
  horizontal: "aspect-video",
  square: "aspect-square",
};
