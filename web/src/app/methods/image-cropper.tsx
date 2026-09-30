"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface Point { x: number; y: number }
type DrawMode = "polygon" | "freehand";

export interface ImageCropperProps {
  src: string;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const STROKE  = "#3b82f6";
const FILL    = "rgba(59,130,246,0.15)";
const SNAP_R  = 10;

function dist(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y); }

export function ImageCropper({ src, onConfirm, onCancel }: ImageCropperProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const imgRef     = useRef<HTMLImageElement>(null);
  const origRef    = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);
  const [mode, setMode]               = useState<DrawMode>("polygon");
  const [vertices, setVertices]       = useState<Point[]>([]);
  const [closed, setClosed]           = useState(false);
  const [cursor, setCursor]           = useState<Point | null>(null);

  const freehandActive = useRef(false);
  const freehandPts    = useRef<Point[]>([]);

  const canConfirm = closed && vertices.length >= 3;

  // Load original dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => { origRef.current = { w: img.naturalWidth, h: img.naturalHeight }; };
    img.src = src;
  }, [src]);

  // Measure displayed image size
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setDisplaySize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync canvas dimensions
  useEffect(() => {
    if (!displaySize) return;
    const c = canvasRef.current;
    if (!c) return;
    if (c.width !== Math.round(displaySize.w) || c.height !== Math.round(displaySize.h)) {
      c.width  = Math.round(displaySize.w);
      c.height = Math.round(displaySize.h);
    }
  }, [displaySize]);

  // Redraw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (vertices.length === 0) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (closed) {
      ctx.beginPath();
      ctx.moveTo(vertices[0]!.x, vertices[0]!.y);
      for (let i = 1; i < vertices.length; i++) ctx.lineTo(vertices[i]!.x, vertices[i]!.y);
      ctx.closePath();
      ctx.fillStyle = FILL;
      ctx.fill();
      ctx.strokeStyle = STROKE;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (mode === "polygon") {
        for (const v of vertices) {
          ctx.beginPath(); ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = "white"; ctx.fill();
          ctx.strokeStyle = STROKE; ctx.lineWidth = 2; ctx.stroke();
        }
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(vertices[0]!.x, vertices[0]!.y);
      for (let i = 1; i < vertices.length; i++) ctx.lineTo(vertices[i]!.x, vertices[i]!.y);
      ctx.strokeStyle = STROKE; ctx.lineWidth = 2; ctx.stroke();

      if (mode === "polygon") {
        for (const v of vertices) {
          ctx.beginPath(); ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = "white"; ctx.fill();
          ctx.strokeStyle = STROKE; ctx.lineWidth = 2; ctx.stroke();
        }
        if (cursor && vertices.length > 0) {
          const last = vertices[vertices.length - 1]!;
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(cursor.x, cursor.y);
          ctx.strokeStyle = STROKE; ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
        }
        // Snap circle near first vertex
        if (vertices.length >= 3 && cursor && dist(cursor, vertices[0]!) <= SNAP_R) {
          ctx.beginPath(); ctx.arc(vertices[0]!.x, vertices[0]!.y, SNAP_R, 0, Math.PI * 2);
          ctx.strokeStyle = STROKE; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
          ctx.stroke(); ctx.setLineDash([]);
        }
      }
    }
  }, [vertices, closed, cursor, mode]);

  useEffect(() => { draw(); }, [draw]);

  function pt(e: React.MouseEvent<HTMLCanvasElement>): Point {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // Polygon
  function polyClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (closed) return;
    const p = pt(e);
    if (vertices.length >= 3 && dist(p, vertices[0]!) <= SNAP_R) { setClosed(true); return; }
    setVertices(prev => [...prev, p]);
  }
  function polyDbl(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (closed || vertices.length < 3) return;
    // Remove the extra vertex added by the second click of dblclick
    setVertices(prev => prev.slice(0, -1));
    setClosed(true);
  }
  function polyMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!closed) setCursor(pt(e));
  }

  // Freehand
  function fhDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (closed) return;
    freehandActive.current = true;
    freehandPts.current = [pt(e)];
    setVertices([pt(e)]); setClosed(false);
  }
  function fhMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!freehandActive.current || closed) return;
    const p = pt(e);
    freehandPts.current.push(p);
    setVertices([...freehandPts.current]);
  }
  function fhUp() {
    if (!freehandActive.current) return;
    freehandActive.current = false;
    if (freehandPts.current.length < 3) { handleClear(); return; }
    setClosed(true);
  }

  // Unified
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => { if (mode === "freehand") fhDown(e); };
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === "polygon") polyMove(e);
    else fhMove(e);
  };
  const onMouseUp   = () => { if (mode === "freehand") fhUp(); };
  const onClick     = (e: React.MouseEvent<HTMLCanvasElement>) => { if (mode === "polygon") polyClick(e); };
  const onDblClick  = (e: React.MouseEvent<HTMLCanvasElement>) => { if (mode === "polygon") polyDbl(e); };
  const onMouseLeave = () => {
    setCursor(null);
    if (mode === "freehand" && freehandActive.current) fhUp();
  };

  function handleUndo() {
    if (closed) { setClosed(false); return; }
    setVertices(prev => prev.slice(0, -1));
  }
  function handleClear() {
    setVertices([]); setClosed(false); setCursor(null);
    freehandPts.current = []; freehandActive.current = false;
  }
  function switchMode(m: DrawMode) { setMode(m); handleClear(); }

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onCancel(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && mode === "polygon") {
        e.preventDefault(); handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, closed, onCancel]);

  // Export
  function handleConfirm() {
    if (!canConfirm) return;
    const { w: ow, h: oh } = origRef.current;
    const { w: dw, h: dh } = displaySize ?? { w: 1, h: 1 };
    const sx = ow / dw, sy = oh / dh;

    const off = document.createElement("canvas");
    off.width = ow; off.height = oh;
    const ctx = off.getContext("2d")!;

    ctx.beginPath();
    ctx.moveTo(vertices[0]!.x * sx, vertices[0]!.y * sy);
    for (let i = 1; i < vertices.length; i++)
      ctx.lineTo(vertices[i]!.x * sx, vertices[i]!.y * sy);
    ctx.closePath();
    ctx.fillStyle = "white";
    ctx.fill();

    ctx.globalCompositeOperation = "source-in";
    const orig = new Image();
    orig.onload = () => {
      ctx.drawImage(orig, 0, 0);
      onConfirm(off.toDataURL("image/png"));
    };
    orig.src = src;
  }

  const statusMsg = (() => {
    if (mode === "polygon") {
      if (closed) return "Polygon closed ✓";
      if (vertices.length === 0) return "Click to place first vertex";
      if (vertices.length < 3) return `${vertices.length} vertices — need ${3 - vertices.length} more`;
      return "Double-click or click first vertex to close";
    }
    if (closed) return "Path drawn ✓";
    return "Click and drag to draw";
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxWidth: 880, width: "100%", maxHeight: "calc(100vh - 32px)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 flex-shrink-0">
          {/* Mode toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <TBtn active={mode === "polygon"} onClick={() => switchMode("polygon")} title="Click to place vertices">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
              </svg>
              Polygon
            </TBtn>
            <TBtn active={mode === "freehand"} onClick={() => switchMode("freehand")} title="Click and drag to draw">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l-4 4v2h2l4-4-2-2zM16 4l4 4-9 9-4-1 1-4 8-8z" />
              </svg>
              Freehand
            </TBtn>
          </div>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          <button
            onClick={handleUndo} disabled={vertices.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            Undo
          </button>
          <button
            onClick={handleClear} disabled={vertices.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>

          <span className="flex-1 text-center text-xs text-slate-400 select-none">{statusMsg}</span>

          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Cancel (Esc)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Canvas area */}
        <div className="relative flex-1 overflow-auto bg-slate-100 flex items-center justify-center min-h-0 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt="Crop source"
            draggable={false}
            style={{ display: "block", maxWidth: 820, maxHeight: 560, width: "100%", objectFit: "contain", pointerEvents: "none", userSelect: "none" }}
          />
          {displaySize && (
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                width: displaySize.w,
                height: displaySize.h,
                cursor: closed ? "default" : mode === "polygon" ? "crosshair" : "cell",
                touchAction: "none",
              }}
              onClick={onClick}
              onDoubleClick={onDblClick}
              onMouseMove={onMouseMove}
              onMouseDown={onMouseDown}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseLeave}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <span className="text-xs text-slate-400">
            {!canConfirm && (vertices.length === 0 ? "Draw a mask to enable crop" : !closed ? "Close the shape to crop" : "")}
          </span>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-sm"
          >
            Crop &amp; Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function TBtn({ active, onClick, title, children }: {
  active: boolean; onClick: () => void; title?: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick} title={title}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
        active ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
