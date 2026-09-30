"use client";

const RESOLUTION_HINTS: Record<string, string> = {
  "":     "No downscaling — image sent at full original resolution. May be slow for large images.",
  "2048": "Longest side capped at 2048 px. Smaller images are not upscaled. Good balance of detail and speed.",
  "1024": "Longest side capped at 1024 px. Faster processing, lower memory. Suitable for most slope images.",
  "512":  "Longest side capped at 512 px. Fastest, lowest detail. Use only for quick previews.",
};

export function ResolutionSelect({ value, onChange }: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const key = value != null ? String(value) : "";
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">Output resolution</label>
      <select
        value={key}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <option value="">Original</option>
        <option value="2048">2048 px (max side)</option>
        <option value="1024">1024 px (max side)</option>
        <option value="512">512 px (max side)</option>
      </select>
      <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{RESOLUTION_HINTS[key] ?? ""}</p>
    </div>
  );
}
