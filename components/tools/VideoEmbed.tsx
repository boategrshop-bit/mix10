import { youTubeId } from "@/lib/tools-content";

// Renders a vertical (9:16) clip inside a minimal iPhone-style frame.
// A YouTube link becomes an embedded player; anything else (e.g. "/demo.mp4")
// is served as a native HTML5 <video>.
export default function VideoEmbed({ src, title }: { src: string; title?: string }) {
  const id = youTubeId(src);

  return (
    <div className="mx-auto w-full max-w-[260px]">
      {/* Phone body (bezel) */}
      <div className="relative rounded-[2.6rem] bg-[#1C1A17] p-[9px] shadow-[0_22px_50px_rgba(28,26,23,0.28)] ring-1 ring-black/10">
        {/* Side buttons */}
        <span className="absolute -left-[3px] top-24 h-12 w-[3px] rounded-l bg-[#2b2824]" aria-hidden />
        <span className="absolute -right-[3px] top-20 h-8 w-[3px] rounded-r bg-[#2b2824]" aria-hidden />

        {/* Screen */}
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[2rem] bg-black">
          {id ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube.com/embed/${id}`}
              title={title ?? "video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={src}
              controls
              preload="metadata"
              playsInline
            />
          )}

          {/* Dynamic island / notch */}
          <div
            className="pointer-events-none absolute left-1/2 top-2 z-10 h-[18px] w-[74px] -translate-x-1/2 rounded-full bg-black"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
