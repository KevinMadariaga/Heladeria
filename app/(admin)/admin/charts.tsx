"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { formatCOP } from "@/lib/money";

const compactCOP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", notation: "compact", maximumFractionDigits: 1 });
const axis = { fill: "var(--muted-foreground)", fontSize: 12 };

function Tip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; total?: number; tickets?: number; value?: number; display?: string } }[] }) {
  const d = active && payload?.[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg">
      <p className="font-heading font-semibold">{d.label}</p>
      {d.total !== undefined && <p>{formatCOP(d.total)}</p>}
      {d.tickets !== undefined && <p className="text-muted-foreground">{d.tickets} tickets</p>}
      {d.display && <p>{d.display}</p>}
    </div>
  );
}

/** Ventas por periodo: una serie, barras ≤24px con punta redondeada que crecen desde la base. */
export function SalesChart({ data }: { data: { label: string; total: number; tickets: number }[] }) {
  const reduce = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => compactCOP.format(v)} />
        <Tooltip content={<Tip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
        <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={!reduce} animationDuration={400} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Barras horizontales con el valor en la punta (ranking). */
export function RankChart({ data }: { data: { label: string; value: number; display: string }[] }) {
  const reduce = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 68, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ ...axis, fill: "var(--foreground)" }}
          tickLine={false}
          axisLine={false}
          width={112}
          tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
        />
        <Tooltip content={<Tip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
        <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={!reduce} animationDuration={400}>
          <LabelList dataKey="display" position="right" style={{ fill: "var(--foreground)", fontSize: 12 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
