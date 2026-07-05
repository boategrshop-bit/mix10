interface ProductAnalysisBoxProps {
  analysis: string;
}

export default function ProductAnalysisBox({ analysis }: ProductAnalysisBoxProps) {
  if (!analysis) return null;

  return (
    <div className="space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm">
      <p className="text-sm font-semibold text-gray-100">AI วิเคราะห์สินค้าจากรูปที่แนบ</p>
      <p className="text-xs leading-relaxed text-gray-400">{analysis}</p>
      <p className="text-[11px] text-gray-600">
        ใช้จุดเด่นเหล่านี้ในการเขียนบทขายในแผนฉากด้านล่างให้อัตโนมัติแล้ว
      </p>
    </div>
  );
}
