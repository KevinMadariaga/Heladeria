"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";
import { formatCOP } from "@/lib/money";

/** Contador animado para KPIs. El valor final está en el HTML desde el servidor (sin JS se ve igual). */
export function CountUp({ value, money = false }: { value: number; money?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const fmt = (n: number) => (money ? formatCOP(Math.round(n)) : Math.round(n).toLocaleString("es-CO"));
  useEffect(() => {
    if (reduce || !ref.current) return;
    const el = ref.current;
    const controls = animate(0, value, { duration: 0.4, ease: "easeOut", onUpdate: (n) => (el.textContent = fmt(n)) });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fmt depende solo de `money`
  }, [value, money, reduce]);
  return <span ref={ref}>{fmt(value)}</span>;
}
