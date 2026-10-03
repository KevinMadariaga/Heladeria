import { describe, expect, it } from "vitest";
import { toCSV } from "@/lib/csv";
import { stockDelta } from "@/lib/inventory";
import { dayRange, todayISO } from "@/lib/periods";

describe("stockDelta", () => {
  it("entrada suma, merma resta, conteo deja el valor contado", () => {
    expect(stockDelta("in", 5, 10)).toBe(5);
    expect(stockDelta("out", 3, 10)).toBe(-3);
    expect(stockDelta("adjust", 7, 10)).toBe(-3);
    expect(stockDelta("adjust", 12, 10)).toBe(2);
  });
  it("no permite dar de baja más de lo que hay", () => {
    expect(() => stockDelta("out", 11, 10)).toThrow("Solo hay 10");
  });
});

describe("toCSV", () => {
  it("usa ; con BOM y escapa comillas y separadores", () => {
    expect(toCSV(["a", "b"], [["x;y", 'di "hola"'], [1, null]])).toBe('﻿a;b\r\n"x;y";"di ""hola"""\r\n1;');
  });
});

describe("dayRange", () => {
  it("incluye el día completo en hora de Bogotá", () => {
    const r = dayRange("2026-10-03", "2026-10-03")!;
    expect(r.start.toISOString()).toBe("2026-10-03T05:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-10-04T05:00:00.000Z");
  });
  it("rechaza rangos invertidos o inválidos", () => {
    expect(dayRange("2026-10-05", "2026-10-03")).toBeNull();
    expect(dayRange("x", "2026-10-03")).toBeNull();
  });
  it("hoy según Bogotá (a las 9pm del domingo sigue siendo domingo)", () => {
    expect(todayISO(new Date("2026-10-05T02:00:00Z"))).toBe("2026-10-04");
  });
});
