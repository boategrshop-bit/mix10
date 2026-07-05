interface ClipTabsProps {
  clipCount: number;
  activeIndex: number;
  completedFlags: boolean[]; // whether that clip's video has been generated
  onSelect: (index: number) => void;
}

export default function ClipTabs({ clipCount, activeIndex, completedFlags, onSelect }: ClipTabsProps) {
  if (clipCount <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: clipCount }, (_, i) => i).map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          className={
            i === activeIndex
              ? "rounded-full bg-gradient-to-r from-[#5a9bd4] to-[#4382BB] px-4 py-1.5 text-xs font-semibold text-white shadow-sm"
              : "rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-white/5"
          }
        >
          คลิป {i + 1}
          {completedFlags[i] && " ✓"}
        </button>
      ))}
    </div>
  );
}
