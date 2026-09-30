"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { API_URL } from "../../../lib/api-client";
import { GradeBarChart } from "./grade-bar-chart";
import { ImageCropper } from "../image-cropper";
import { ResolutionSelect } from "../resolution-select";

interface GeoImagerResult {
  image: string;
  population: number[];
}

import { DEFAULT_COLOR_SCHEME } from "./color-scheme";

export default function GeoImagerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [result, setResult] = useState<GeoImagerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const [maxDimension, setMaxDimension] = useState<number | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);

  const [freshA, setFreshA] = useState("0");
  const [freshB, setFreshB] = useState("0");
  const [weatheredA, setWeatheredA] = useState("4");
  const [weatheredB, setWeatheredB] = useState("20");
  const [levels, setLevels] = useState(5);
  const [thresholds, setThresholds] = useState<number[]>([0.2, 0.4, 0.6, 0.8]);

  function changeLevel(newLevels: number) {
    setLevels(newLevels);
    const count = newLevels - 1;
    setThresholds(Array.from({ length: count }, (_, i) => parseFloat(((i + 1) / newLevels).toFixed(2))));
  }

  function pickFile(f: File) {
    setFile(f);
    setResult(null);
    setError("");
    setCroppedUrl(null);
    setImgDims(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setPreview(url);
      const img = new Image();
      img.onload = () => setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = url;
    };
    reader.readAsDataURL(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) {
      setFlashing(true);
      setTimeout(() => setFlashing(false), 600);
      pickFile(f);
    }
  }

  async function handleProcess() {
    if (!file) return;
    setError("");
    setLoading(true);
    try {
      const base64 = croppedUrl
        ? (croppedUrl.split(",")[1] ?? croppedUrl)
        : await fileToBase64(file, maxDimension ?? undefined);
      const normArray = [...thresholds].reverse();

      const res = await fetch(`${API_URL}/methods/geoimager`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          unweathered_a_threshold: parseFloat(freshA),
          unweathered_b_threshold: parseFloat(freshB),
          unweathered_l_threshold: 0,
          a_threshold: parseFloat(weatheredA),
          b_threshold: parseFloat(weatheredB),
          l_threshold: 0,
          levels,
          normalization_levels: normArray,
          color_scheme: DEFAULT_COLOR_SCHEME,
          ignored_range: [],
          ignored_color: [0, 0, 0, 0],
        }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setResult(await res.json() as GeoImagerResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <div className="max-w-[1400px] mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">GeoImager</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload a slope photograph masked to rock surface, set the fresh rock reference colour, then classify pixels by weathering grade.
        </p>
        <div className="h-px bg-slate-200 mt-4" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <FadeIn delay={0}>
          <SectionCard step={1} title="Upload Slope Image">
            <div
              className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                flashing
                  ? "border-blue-400 bg-blue-50"
                  : dragging
                  ? "border-blue-400 bg-blue-50"
                  : preview
                  ? "border-slate-200 bg-slate-50"
                  : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
              }`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {preview ? (
                <div className="relative group">
                  <img src={croppedUrl ?? preview} alt="preview" className="w-full rounded-lg object-contain max-h-56" />
                  <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Click to replace</span>
                  </div>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center gap-3 text-slate-400">
                  <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-500">Drop image here or click to browse</p>
                    <p className="text-xs text-slate-400 mt-0.5">PNG, JPG, TIFF supported</p>
                  </div>
                </div>
              )}
            </div>
            {file && (
              <div className="flex items-center gap-2 mt-2 px-1">
                <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-xs text-slate-500 truncate">{file.name}</span>
                <span className="text-xs text-slate-400 shrink-0">({(file.size / 1024).toFixed(0)} KB{imgDims ? ` · ${imgDims.w}×${imgDims.h}px` : ""})</span>
                <button
                  onClick={() => setCropperOpen(true)}
                  className="ml-auto shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21H3v-4M21 7V3h-4M3 7V3h4M21 21h-4v-4M7 3H3v4M21 3h-4v4M3 21h4v-4M21 21v-4h-4" />
                  </svg>
                  {croppedUrl ? "Re-crop" : "Crop"}
                </button>
              </div>
            )}
            {croppedUrl && (
              <div className="flex items-center gap-1.5 mt-1 px-1">
                <svg className="w-3 h-3 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-xs text-blue-600 font-medium">Crop applied</span>
                <button onClick={() => setCroppedUrl(null)} className="ml-1 text-xs text-slate-400 hover:text-slate-600 underline">remove</button>
              </div>
            )}
            <div className="mt-3">
              <ResolutionSelect value={maxDimension} onChange={setMaxDimension} />
            </div>
          </SectionCard>
          </FadeIn>

          <FadeIn delay={150}>
          <SectionCard step={2} title="Rock References (CIELAB a* b*)">
            <p className="text-xs text-slate-400 mb-3">
              ΔE from the fresh reference point classifies each pixel into a weathering grade.
            </p>
            <div className="space-y-3">
              <AbInput label="Fresh / Unweathered" a={freshA} b={freshB} onA={setFreshA} onB={setFreshB} accent="emerald" />
              <AbInput label="Weathered Reference" a={weatheredA} b={weatheredB} onA={setWeatheredA} onB={setWeatheredB} accent="amber" />
            </div>
            <PresetManager
              type="reference"
              getCurrentData={() => ({ freshA: parseFloat(freshA), freshB: parseFloat(freshB), weatheredA: parseFloat(weatheredA), weatheredB: parseFloat(weatheredB) })}
              onLoad={(d) => {
                if (d.freshA != null) setFreshA(String(d.freshA));
                if (d.freshB != null) setFreshB(String(d.freshB));
                if (d.weatheredA != null) setWeatheredA(String(d.weatheredA));
                if (d.weatheredB != null) setWeatheredB(String(d.weatheredB));
              }}
            />
            <AbColorPreview
              freshA={parseFloat(freshA) || 0}
              freshB={parseFloat(freshB) || 0}
              weatheredA={parseFloat(weatheredA) || 0}
              weatheredB={parseFloat(weatheredB) || 0}
            />
          </SectionCard>
          </FadeIn>

          <FadeIn delay={300}>
          <SectionCard step={3} title="Weathering Levels">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="text-xs font-medium text-slate-500 w-24 shrink-0">No. of levels</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeLevel(Math.max(2, levels - 1))}
                    className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors text-sm"
                  >−</button>
                  <span className="w-8 text-center text-sm font-semibold text-slate-700">{levels}</span>
                  <button
                    onClick={() => changeLevel(Math.min(8, levels + 1))}
                    className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors text-sm"
                  >+</button>
                </div>
                <div className="flex gap-1 ml-1">
                  {Array.from({ length: levels }).map((_, i) => (
                    <span
                      key={i}
                      className="w-4 h-4 rounded-sm"
                      style={{ background: LEVEL_COLORS[i] }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Normalisation thresholds
                  <span className="ml-1 font-normal text-slate-400">(fractions of max ΔE, 0–1)</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {thresholds.map((val, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">T{i + 1}</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={val}
                        onChange={(e) => {
                          const next = [...thresholds];
                          next[i] = parseFloat(e.target.value);
                          setThresholds(next);
                        }}
                        className="w-16 border border-slate-200 rounded-lg px-2 py-2 text-sm font-mono text-slate-700 text-center bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <PresetManager
              type="threshold"
              getCurrentData={() => ({ levels, thresholds: [...thresholds] })}
              onLoad={(d) => {
                if (typeof d.levels === "number") changeLevel(d.levels);
                if (Array.isArray(d.thresholds)) setThresholds(d.thresholds as number[]);
              }}
            />
          </SectionCard>
          </FadeIn>

          <FadeIn delay={450}>
          <button
            onClick={handleProcess}
            disabled={!file || loading}
            className="w-full flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Processing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.698-1.38 2.528l-4.3-.538a9 9 0 01-4.185 0l-4.3.538c-1.41.17-2.38-1.529-1.38-2.528L5 14.5" />
                </svg>
                Process Image
              </>
            )}
          </button>
          </FadeIn>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div ref={resultRef} className="space-y-4">
          <FadeIn delay={200}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div className="w-1 h-4 rounded-full bg-blue-500" />
              <h2 className="text-sm font-semibold text-slate-700">False-Colour Output</h2>
            </div>
            <div className="p-4">
              {result ? (
                <img
                  key={result.image.slice(0, 16)}
                  src={`data:image/png;base64,${result.image}`}
                  alt="processed"
                  className="w-full rounded-lg object-contain"
                />
              ) : (
                <div className="h-56 flex flex-col items-center justify-center gap-3 text-slate-300 border-2 border-dashed border-slate-100 rounded-lg">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="text-sm">Processed image will appear here</p>
                </div>
              )}
            </div>
          </div>
          </FadeIn>

          <FadeIn delay={350}>
          {result ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-1 h-4 rounded-full bg-blue-500" />
                <h2 className="text-sm font-semibold text-slate-700">Grade Distribution</h2>
              </div>
              <div className="p-4">
                <GradeBarChart population={result.population} levels={levels} />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-1 h-4 rounded-full bg-slate-200" />
                <h2 className="text-sm font-semibold text-slate-400">Grade Distribution</h2>
              </div>
              <div className="p-4 h-40 flex items-center justify-center">
                <p className="text-sm text-slate-300">Run processing to see results</p>
              </div>
            </div>
          )}
          </FadeIn>
        </div>
      </div>
    </div>

    {cropperOpen && preview && (
      <ImageCropper
        src={preview}
        onConfirm={(url) => { setCroppedUrl(url); setCropperOpen(false); }}
        onCancel={() => setCropperOpen(false)}
      />
    )}
    </>
  );
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const LEVEL_COLORS = DEFAULT_COLOR_SCHEME.slice(1, 7).map(
  ([r, g, b]) => `rgb(${r},${g},${b})`
);

function SectionCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-1 h-4 rounded-full bg-blue-500 shrink-0" />
        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{step}</span>
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function AbInput({ label, a, b, onA, onB, accent }: {
  label: string; a: string; b: string;
  onA: (v: string) => void; onB: (v: string) => void;
  accent: "emerald" | "amber";
}) {
  const dotColor = accent === "emerald" ? "bg-emerald-400" : "bg-amber-400";
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <p className="text-xs font-medium text-slate-600">{label}</p>
      </div>
      <div className="flex gap-3">
        {[{ l: "a*", v: a, fn: onA }, { l: "b*", v: b, fn: onB }].map((f) => (
          <div key={f.l} className="flex-1">
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{f.l}</label>
            <input
              type="number"
              step="0.1"
              value={f.v}
              onChange={(e) => f.fn(e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface GeoImagerPreset {
  id: number;
  name: string;
  type: "reference" | "threshold";
  data: Record<string, unknown>;
  createdByName: string;
  createdAt: string;
}

async function fetchPresets(type: "reference" | "threshold"): Promise<GeoImagerPreset[]> {
  const res = await fetch(`${API_URL}/methods/geoimager-presets?type=${type}`);
  if (!res.ok) throw new Error("Failed to fetch presets");
  return res.json() as Promise<GeoImagerPreset[]>;
}

async function savePreset(name: string, type: "reference" | "threshold", data: Record<string, unknown>, createdByName: string): Promise<GeoImagerPreset> {
  const res = await fetch(`${API_URL}/methods/geoimager-presets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, type, data, createdByName }),
  });
  if (!res.ok) throw new Error("Failed to save preset");
  return res.json() as Promise<GeoImagerPreset>;
}

async function deletePreset(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/methods/geoimager-presets/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete preset");
}

function PresetManager({ type, onLoad, getCurrentData }: {
  type: "reference" | "threshold";
  onLoad: (data: Record<string, unknown>) => void;
  getCurrentData: () => Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState<GeoImagerPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveMode, setSaveMode] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveAuthor, setSaveAuthor] = useState("")
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPresets(await fetchPresets(type)); } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [type]);

  useEffect(() => { if (open) load(); }, [open, load]);

  async function handleSave() {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const p = await savePreset(saveName.trim(), type, getCurrentData(), saveAuthor.trim());
      setPresets(ps => [p, ...ps]);
      setSaveMode(false); setSaveName(""); setSaveAuthor("");
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this preset?")) return;
    try {
      await deletePreset(id);
      setPresets(ps => ps.filter(p => p.id !== id));
    } catch { /* ignore */ }
  }

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(o => !o); setSaveMode(false); }}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
        >
          Presets
        </button>
        <button
          type="button"
          onClick={() => { setSaveMode(true); setOpen(true); }}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
        >
          Save as Preset
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {saveMode && (
            <div className="px-4 py-3 border-b border-slate-100 bg-blue-50/50 space-y-2">
              <p className="text-xs font-semibold text-blue-700">Save Current Values</p>
              <input
                autoFocus
                placeholder="Preset name *"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <input
                placeholder="Your name (optional)"
                value={saveAuthor}
                onChange={e => setSaveAuthor(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim() || saving}
                  className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setSaveMode(false)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-500">Cancel</button>
              </div>
            </div>
          )}

          <div className="max-h-52 overflow-y-auto">
            {loading && <p className="text-xs text-slate-400 text-center py-4">Loading…</p>}
            {!loading && presets.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No presets saved yet</p>}
            {presets.map(p => (
              <div key={p.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 group">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                  {p.createdByName && <p className="text-[10px] text-slate-400">{p.createdByName}</p>}
                </div>
                <button
                  onClick={() => { onLoad(p.data); setOpen(false); }}
                  className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 shrink-0"
                >
                  Load
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function labToRgbClamped(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const d = 6 / 29;
  const f = (t: number) => t > d ? t ** 3 : 3 * d * d * (t - 4 / 29);
  const X = f(fx) * 0.95047, Y = f(fy), Z = f(fz) * 1.08883;
  const r =  3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  const g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  const bl =  0.0557 * X - 0.2040 * Y + 1.0570 * Z;
  const gc = (v: number) => Math.round(Math.max(0, Math.min(1, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1/2.4) - 0.055)) * 255);
  return [gc(r), gc(g), gc(bl)];
}

function AbColorPreview({ freshA, freshB, weatheredA, weatheredB }: {
  freshA: number; freshB: number; weatheredA: number; weatheredB: number;
}) {
  const SIZE = 220; const PAD = 28;
  const W = SIZE + PAD * 2; const H = SIZE + PAD * 2;
  const cx = PAD + SIZE / 2; const cy = PAD + SIZE / 2; const R = SIZE / 2;
  const RANGE = 100;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgData = ctx.createImageData(SIZE, SIZE);
    for (let py = 0; py < SIZE; py++) {
      for (let px = 0; px < SIZE; px++) {
        const dx = px - SIZE / 2, dy = SIZE / 2 - py;
        if (dx * dx + dy * dy > R * R) continue;
        const a = (dx / R) * RANGE;
        const b = (dy / R) * RANGE;
        const rgb = labToRgbClamped(65, a, b);
        const i = (py * SIZE + px) * 4;
        imgData.data[i] = rgb[0]; imgData.data[i+1] = rgb[1]; imgData.data[i+2] = rgb[2]; imgData.data[i+3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, []);

  function toSvg(a: number, b: number) {
    return { x: cx + (a / RANGE) * R, y: cy - (b / RANGE) * R };
  }

  const fresh = toSvg(freshA, freshB);
  const weathered = toSvg(weatheredA, weatheredB);
  const ticks = [-100, -50, 0, 50, 100];

  return (
    <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">CIE a*b* Preview</p>
      <div className="relative block mx-auto" style={{ width: W, height: H }}>
        <svg width={W} height={H} className="absolute inset-0">
          <defs>
            <clipPath id="ab-circle"><circle cx={cx} cy={cy} r={R} /></clipPath>
          </defs>
          <foreignObject x={PAD} y={PAD} width={SIZE} height={SIZE} clipPath="url(#ab-circle)">
            <canvas ref={canvasRef} width={SIZE} height={SIZE} style={{ display: "block" }} />
          </foreignObject>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#cbd5e1" strokeWidth={1} />
          <line x1={PAD} y1={cy} x2={PAD + SIZE} y2={cy} stroke="rgba(0,0,0,0.25)" strokeWidth={0.75} />
          <line x1={cx} y1={PAD} x2={cx} y2={PAD + SIZE} stroke="rgba(0,0,0,0.25)" strokeWidth={0.75} />
          {ticks.map(v => {
            const x = cx + (v / RANGE) * R;
            if (x < PAD || x > PAD + SIZE) return null;
            return <text key={v} x={x} y={PAD + SIZE + 12} textAnchor="middle" fontSize={8} fill="#94a3b8">{v}</text>;
          })}
          {ticks.map(v => {
            const y = cy - (v / RANGE) * R;
            if (y < PAD || y > PAD + SIZE) return null;
            return <text key={v} x={PAD - 4} y={y + 3} textAnchor="end" fontSize={8} fill="#94a3b8">{v}</text>;
          })}
          <text x={cx} y={H - 1} textAnchor="middle" fontSize={9} fill="#475569" fontWeight={500}>a*</text>
          <text x={8} y={cy + 3} textAnchor="middle" fontSize={9} fill="#475569" fontWeight={500} transform={`rotate(-90,8,${cy})`}>b*</text>
          <line x1={fresh.x} y1={fresh.y} x2={weathered.x} y2={weathered.y} stroke="white" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
          <circle cx={fresh.x} cy={fresh.y} r={7} fill="white" fillOpacity={0.25} stroke="white" strokeWidth={2} />
          <circle cx={fresh.x} cy={fresh.y} r={5} fill="#10b981" stroke="white" strokeWidth={1.5} />
          <text x={fresh.x} y={fresh.y < PAD + 16 ? fresh.y + 20 : fresh.y - 11} textAnchor="middle" fontSize={9} fill="white" fontWeight={700} stroke="rgba(0,0,0,0.4)" strokeWidth={2} paintOrder="stroke">Fresh</text>
          <circle cx={weathered.x} cy={weathered.y} r={7} fill="white" fillOpacity={0.25} stroke="white" strokeWidth={2} />
          <circle cx={weathered.x} cy={weathered.y} r={5} fill="#f59e0b" stroke="white" strokeWidth={1.5} />
          <text x={weathered.x} y={weathered.y < PAD + 16 ? weathered.y + 20 : weathered.y - 11} textAnchor="middle" fontSize={9} fill="white" fontWeight={700} stroke="rgba(0,0,0,0.4)" strokeWidth={2} paintOrder="stroke">Wtd</text>
        </svg>
      </div>
    </div>
  );
}

function fileToBase64(file: File, maxDim?: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!maxDim) {
        resolve(dataUrl.split(",")[1] ?? dataUrl);
        return;
      }
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const resized = canvas.toDataURL("image/png");
        resolve(resized.split(",")[1] ?? resized);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
