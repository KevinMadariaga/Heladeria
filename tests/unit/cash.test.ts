import { describe, expect, it } from "vitest";
import { change, closeShiftTotals, splitPayment, unitPrice } from "@/lib/cash";

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

describe("splitPayment", () => {
  it("efectivo: todo en efectivo con cambio", () => {
    expect(splitPayment("cash", 14500, { cashReceived: 20000 })).toEqual({
      payments: [{ method: "cash", amount: 14500 }],
      cashReceived: 20000,
      change: 5500,
    });
  });
  it("transferencia: sin efectivo ni cambio", () => {
    expect(splitPayment("transfer", 14500)).toEqual({ payments: [{ method: "transfer", amount: 14500 }] });
  });
  it("mixto: mitad y mitad, el cambio solo sobre la parte en efectivo", () => {
    expect(splitPayment("mixed", 20000, { transferAmount: 10000, cashReceived: 20000 })).toEqual({
      payments: [
        { method: "cash", amount: 10000 },
        { method: "transfer", amount: 10000 },
      ],
      cashReceived: 20000,
      change: 10000,
    });
  });
  it("mixto: efectivo vacío = exacto", () => {
    expect(splitPayment("mixed", 7500, { transferAmount: 5000 }).change).toBe(0);
  });
  it("mixto: rechaza transferencia 0, igual o mayor al total, y efectivo insuficiente", () => {
    expect(() => splitPayment("mixed", 10000, { transferAmount: 0 })).toThrow();
    expect(() => splitPayment("mixed", 10000, { transferAmount: 10000 })).toThrow();
    expect(() => splitPayment("mixed", 10000, { transferAmount: 4000, cashReceived: 5000 })).toThrow("no alcanza");
  });
});

describe("closeShiftTotals", () => {
  it("cuadra efectivo y transferencias por separado y da los totales", () => {
    // base 50.000; ventas: 30.000 efectivo (incluye parte de mixtos) + 25.000 transferencia
    const r = closeShiftTotals(50000, { cash: 30000, transfer: 25000 }, { cash: 80000, transfer: 25000 });
    expect(r).toMatchObject({
      expectedCash: 80000,
      expectedTransfer: 25000,
      salesTotal: 55000,
      totalWithBase: 105000,
      difference: 0,
      transferDifference: 0,
    });
  });
  it("detecta faltante y sobrante", () => {
    const r = closeShiftTotals(100000, { cash: 45000, transfer: 12000 }, { cash: 144000, transfer: 13000 });
    expect(r.difference).toBe(-1000);
    expect(r.transferDifference).toBe(1000);
  });
  it("sin ventas: esperado = base", () => {
    expect(closeShiftTotals(50000, {}, { cash: 50000, transfer: 0 })).toMatchObject({ expectedCash: 50000, salesTotal: 0, difference: 0 });
  });
});
