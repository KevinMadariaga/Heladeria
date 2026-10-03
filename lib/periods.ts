// Límites de periodos en hora de Colombia.
// ponytail: offset fijo UTC−5 (Colombia no tiene horario de verano); si se usa otra zona, cambiar a Temporal/Intl.
export const TZ = "America/Bogota";
const OFFSET_MS = 5 * 60 * 60 * 1000;

export type Unit = "day" | "week" | "month" | "year";

/** Inicio (instante UTC real) del periodo de Colombia que contiene `date`. Semanas inician lunes. */
export function startOf(unit: Unit, date = new Date()) {
  const d = new Date(date.getTime() - OFFSET_MS); // "reloj" de Bogotá leído con getters UTC
  const y = d.getUTCFullYear();
  let m = d.getUTCMonth();
  let day = d.getUTCDate();
  if (unit === "week") day -= (d.getUTCDay() + 6) % 7;
  if (unit === "month" || unit === "year") day = 1;
  if (unit === "year") m = 0;
  return new Date(Date.UTC(y, m, day) + OFFSET_MS);
}

/** Suma `n` periodos a un inicio de periodo. */
export function addPeriods(unit: Unit, start: Date, n: number) {
  const d = new Date(start.getTime() - OFFSET_MS);
  if (unit === "day") d.setUTCDate(d.getUTCDate() + n);
  if (unit === "week") d.setUTCDate(d.getUTCDate() + 7 * n);
  if (unit === "month") d.setUTCMonth(d.getUTCMonth() + n);
  if (unit === "year") d.setUTCFullYear(d.getUTCFullYear() + n);
  return new Date(d.getTime() + OFFSET_MS);
}

/** Rango [desde 00:00, hasta+1 00:00) en Bogotá a partir de fechas "YYYY-MM-DD" (input type=date). */
export function dayRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00-05:00`);
  const end = addPeriods("day", new Date(`${to}T00:00:00-05:00`), 1);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  return { start, end };
}

/** "YYYY-MM-DD" de hoy en Bogotá. */
export const todayISO = (date = new Date()) => new Date(date.getTime() - OFFSET_MS).toISOString().slice(0, 10);
