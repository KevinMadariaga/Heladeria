import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, u: string, p: string) {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(u);
  await page.getByLabel("Contraseña").fill(p);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/(admin|pos)$/);
}

async function stockOf(page: Page, name: string) {
  await page.goto("/admin/inventario");
  const row = page.getByRole("listitem").filter({ hasText: name });
  return Number((await row.getByText(/u\. · mín/).innerText()).match(/^(\d+)/)![1]);
}

test.describe.configure({ mode: "serial" });

test("admin: entrada y merma de inventario con motivo", async ({ page }) => {
  await login(page, "admin", "123456");
  const before = await stockOf(page, "Paleta de fresa");

  const row = page.getByRole("listitem").filter({ hasText: "Paleta de fresa" });
  await row.getByRole("button", { name: "Ajustar" }).click();
  let dialog = page.getByRole("dialog", { name: "Ajustar · Paleta de fresa" });
  await dialog.getByLabel("Unidades que entran").fill("5");
  await dialog.getByLabel("Motivo").fill("E2E entrada");
  await dialog.getByRole("button", { name: "Guardar movimiento" }).click();
  await expect(dialog).toBeHidden();
  expect(await stockOf(page, "Paleta de fresa")).toBe(before + 5);
  await expect(page.getByRole("cell", { name: "E2E entrada" }).first()).toBeVisible();

  await page.getByRole("listitem").filter({ hasText: "Paleta de fresa" }).getByRole("button", { name: "Ajustar" }).click();
  dialog = page.getByRole("dialog", { name: "Ajustar · Paleta de fresa" });
  await dialog.getByText("Merma").click();
  await dialog.getByLabel("Unidades que salen").fill("5");
  await dialog.getByLabel("Motivo").fill("E2E merma");
  await dialog.getByRole("button", { name: "Guardar movimiento" }).click();
  await expect(dialog).toBeHidden();
  expect(await stockOf(page, "Paleta de fresa")).toBe(before);
});

test("admin: anular venta devuelve el stock y sale de los reportes", async ({ page }) => {
  await login(page, "admin", "123456");
  const before = await stockOf(page, "Brownie");

  await page.goto("/pos");
  if (await page.getByLabel("Base en efectivo (COP)").isVisible()) {
    await page.getByLabel("Base en efectivo (COP)").fill("100000");
    await page.getByRole("button", { name: "Abrir caja" }).click();
  }
  await page.getByRole("button", { name: /Brownie/ }).click();
  const carrito = page.getByRole("complementary", { name: "Carrito" });
  // Solo se cobra en efectivo o transferencia
  await expect(carrito.getByRole("radiogroup", { name: "Método de pago" }).getByRole("radio")).toHaveText(["Efectivo", "Transferencia"]);
  await carrito.getByRole("radio", { name: "Transferencia" }).click();
  await carrito.getByRole("button", { name: /Cobrar/ }).click();
  const ticket = page.getByRole("dialog", { name: "Venta registrada" });
  const number = (await ticket.getByText(/Venta #\d+/).innerText()).match(/#(\d+)/)![1];
  await ticket.getByRole("button", { name: "Nueva venta" }).click();
  expect(await stockOf(page, "Brownie")).toBe(before - 1);

  await page.goto("/admin/reportes");
  const paidBefore = await page.getByText("Ventas pagadas").locator("+ span").innerText();
  const row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: number, exact: true }) });
  await row.getByRole("button", { name: "Anular" }).click();
  const dialog = page.getByRole("dialog", { name: `Anular venta #${number}` });
  await dialog.getByLabel("Motivo").fill("E2E anulación");
  await dialog.getByRole("button", { name: "Anular venta" }).click();
  await expect(dialog).toBeHidden();
  await expect(row.getByText("Anulada")).toBeVisible();
  await expect(page.getByText("Ventas pagadas").locator("+ span")).not.toHaveText(paidBefore);

  expect(await stockOf(page, "Brownie")).toBe(before);
});

test("admin descarga CSV; cajero no puede", async ({ page, browser }) => {
  await login(page, "admin", "123456");
  const res = await page.request.get("/admin/reportes/csv?type=ventas");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  expect(await res.text()).toMatch(/^﻿Número;Fecha;Cajero/);

  const ctx = await browser.newContext();
  const cajero = await ctx.newPage();
  await login(cajero, "cajero.e2e", "cajero123");
  const blocked = await cajero.request.get("/admin/reportes/csv?type=ventas", { maxRedirects: 0 });
  expect(blocked.status()).not.toBe(200);
  await ctx.close();
});

test("devolver una venta: el stock se descuenta al vender y vuelve al anular; la caja también", async ({ page }) => {
  await login(page, "admin", "123456");
  const stock0 = await stockOf(page, "Paleta de fresa");

  await page.goto("/pos");
  if (await page.getByLabel("Base en efectivo (COP)").isVisible()) {
    await page.getByLabel("Base en efectivo (COP)").fill("100000");
    await page.getByRole("button", { name: "Abrir caja" }).click();
  }
  const esperado = async () => {
    await page.goto("/pos/caja");
    const t = await page.locator("dt", { hasText: /^Efectivo esperado$/ }).locator("+ dd").innerText();
    return Number(t.replace(/\D/g, ""));
  };
  const caja0 = await esperado();

  // Vende 2 paletas (4.000 c/u) en efectivo
  await page.goto("/pos");
  const card = page.getByRole("region", { name: "Productos" }).getByRole("button", { name: /Paleta de fresa/ });
  await card.click();
  await card.click();
  const carrito = page.getByRole("complementary", { name: "Carrito" });
  await carrito.getByRole("radio", { name: "Efectivo" }).click();
  await carrito.getByRole("button", { name: /Cobrar \$\s?8\.000/ }).click();
  const ticket = page.getByRole("dialog", { name: "Venta registrada" });
  const number = (await ticket.getByText(/Venta #\d+/).innerText()).match(/#(\d+)/)![1];
  await ticket.getByRole("button", { name: "Nueva venta" }).click();

  expect(await stockOf(page, "Paleta de fresa")).toBe(stock0 - 2);
  expect(await esperado()).toBe(caja0 + 8000);

  // Devolución (anulación) desde Reportes
  await page.goto("/admin/reportes");
  const row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: number, exact: true }) });
  await row.getByRole("button", { name: "Anular" }).click();
  const dialog = page.getByRole("dialog", { name: `Anular venta #${number}` });
  await dialog.getByLabel("Motivo").fill("Cliente devolvió las paletas");
  await dialog.getByRole("button", { name: "Anular venta" }).click();
  await expect(dialog).toBeHidden();
  await expect(row.getByText("Anulada")).toBeVisible();

  expect(await stockOf(page, "Paleta de fresa")).toBe(stock0);
  expect(await esperado()).toBe(caja0);
  await page.goto("/admin/inventario");
  await expect(page.getByRole("cell", { name: /Anulación venta #\d+: Cliente devolvió las paletas/ }).first()).toBeVisible();
});
