import { describe, expect, it } from "vitest";
import { change, closeShiftTotals, unitPrice } from "@/lib/cash";

const cono = {
  name: "Cono",
  price: 5000,
  variants: [
    { name: "Pequeño", price: 5000 },
    { name: "Grande", price: 11000 },
  ],
  addons: [
    { name: "Arequipe", price: 2000 },
    { name: "Gomitas", price: 1500 },
  ],
};

describe("unitPrice", () => {
  it("usa la variante y suma toppings", () => {
    expect(unitPrice(cono, "Grande", ["Arequipe", "Gomitas"]).unitPrice).toBe(14500);
  });
  it("usa el precio base sin variantes", () => {
    expect(unitPrice({ ...cono, variants: [] }, undefined, []).unitPrice).toBe(5000);
  });
  it("rechaza variante o topping inexistente (precio no lo pone el cliente)", () => {
    expect(() => unitPrice(cono, "Gigante", [])).toThrow();
    expect(() => unitPrice(cono, "Grande", ["Oro"])).toThrow();
  });
});

describe("change", () => {
  it("calcula el cambio", () => expect(change(14500, 20000)).toBe(5500));
  it("rechaza efectivo insuficiente", () => expect(() => change(14500, 10000)).toThrow());
});

describe("closeShiftTotals", () => {
  it("base + efectivo = esperado; diferencia contra contado", () => {
    const r = closeShiftTotals(100000, { cash: 45000, card: 30000, nequi: 12000 }, 144000);
    expect(r).toEqual({ expectedCash: 145000, difference: -1000 });
  });
  it("sin ventas en efectivo el esperado es la base", () => {
    expect(closeShiftTotals(50000, { card: 9000 }, 50000)).toEqual({ expectedCash: 50000, difference: 0 });
  });
});
