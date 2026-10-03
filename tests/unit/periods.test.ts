import { describe, expect, it } from "vitest";
import { addPeriods, startOf } from "@/lib/periods";

// 2026-10-05 02:00Z = domingo 4 oct, 21:00 en Bogotá
const lateSunday = new Date("2026-10-05T02:00:00Z");

describe("startOf (hora Colombia)", () => {
  it("día: usa la fecha de Bogotá, no la UTC", () => {
    expect(startOf("day", lateSunday).toISOString()).toBe("2026-10-04T05:00:00.000Z");
  });
  it("semana: lunes anterior", () => {
    expect(startOf("week", lateSunday).toISOString()).toBe("2026-09-28T05:00:00.000Z");
  });
  it("mes y año", () => {
    expect(startOf("month", lateSunday).toISOString()).toBe("2026-10-01T05:00:00.000Z");
    expect(startOf("year", lateSunday).toISOString()).toBe("2026-01-01T05:00:00.000Z");
  });
});

describe("addPeriods", () => {
  it("retrocede meses sin desfasar la medianoche de Bogotá", () => {
    expect(addPeriods("month", startOf("month", lateSunday), -11).toISOString()).toBe("2025-11-01T05:00:00.000Z");
  });
});
