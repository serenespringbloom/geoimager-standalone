"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { DEFAULT_COLOR_SCHEME } from "./color-scheme";

// Grade colours derived from the colour scheme the backend actually uses.
// After backend reverses the array and applies list_offset=2, grades 1..N
// map to original indices (len-2) down to (len-2-N+1), i.e. descending from index 6.
function gradeColors(levels: number): string[] {
  const reversed = [...DEFAULT_COLOR_SCHEME].reverse();
  const listOffset = DEFAULT_COLOR_SCHEME.length - levels - 1;
  return Array.from({ length: levels }, (_, i) => {
    const c = reversed[listOffset + (levels - 1 - i)] ?? [100, 100, 100];
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  });
}

export function GradeBarChart({ population, levels }: { population: number[]; levels: number }) {
  const colors = gradeColors(levels);
  const data = Array.from({ length: levels }, (_, i) => ({
    grade: `W${i + 1}`,
    pct: parseFloat((population[i] ?? 0).toFixed(1)),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11 }}
          domain={[0, 100]}
        />
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.08)" }}
          content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0]?.payload as { grade: string; pct: number } | undefined;
            if (!d) return null;
            return (
              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-sm">
                <p className="font-semibold text-slate-700">{d.grade}</p>
                <p className="text-slate-500">{d.pct.toFixed(1)}% coverage</p>
              </div>
            );
          }}
        />
        <Bar dataKey="pct" name="Coverage" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1800} animationEasing="ease">
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i] ?? "#6b7280"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
