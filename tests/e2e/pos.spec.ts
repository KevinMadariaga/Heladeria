import { expect, test } from "@playwright/test";

// Flujo completo con el cajero de prueba: abrir caja → vender → cerrar caja.
test("cajero abre caja, vende y cierra cuadrado", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill("cajero.e2e");
  await page.getByLabel("Contraseña").fill("cajero123");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/pos$/);

  // Si quedó una caja abierta de una corrida anterior, la cierra primero.
  if (await page.getByRole("searchbox", { name: "Buscar producto" }).isVisible()) {
    await page.goto("/pos/caja");
    const esperado = await page.locator("dt", { hasText: "Efectivo esperado" }).locator("+ dd").innerText();
    await page.getByLabel("Efectivo contado (COP)").fill(esperado.replace(/\D/g, ""));
    await page.getByRole("button", { name: "Cerrar caja" }).click();
    await page.goto("/pos");
  }

  await page.getByLabel("Base en efectivo (COP)").fill("50000");
  await page.getByRole("button", { name: "Abrir caja" }).click();

  // Producto con variantes y toppings: Cono sencillo Mediano + Arequipe = 8000 + 2000
  await page.getByRole("button", { name: /Cono sencillo/ }).click();
  const dialog = page.getByRole("dialog", { name: "Cono sencillo" });
  await dialog.getByText("Mediano").click();
  await dialog.getByText("Arequipe").click();
  await dialog.getByRole("button", { name: /Agregar · \$\s?10\.000/ }).click();

  // Producto simple: Tinto tiene variantes; Latte no → directo al carrito (7500)
  await page.getByRole("button", { name: /Latte/ }).click();
  const carrito = page.getByRole("complementary", { name: "Carrito" });
  await expect(carrito.getByText(/\$\s?17\.500/).first()).toBeVisible();

  await carrito.getByLabel("Efectivo recibido (vacío = exacto)").fill("20000");
  await expect(carrito.getByText(/Cambio: \$\s?2\.500/)).toBeVisible();
  await carrito.getByRole("button", { name: /Cobrar/ }).click();

  const ticket = page.getByRole("dialog", { name: "Venta registrada" });
  await expect(ticket.getByText("TOTAL")).toBeVisible();
  await expect(ticket.locator("#ticket")).toContainText("Cambio");
  await ticket.getByRole("button", { name: "Nueva venta" }).click();

  // Cierre: base 50.000 + efectivo 17.500 = 67.500
  await page.getByRole("link", { name: "Caja" }).click();
  await expect(page.locator("dt", { hasText: "Efectivo esperado" }).locator("+ dd")).toHaveText(/67\.500/);
  await page.getByLabel("Efectivo contado (COP)").fill("67500");
  await expect(page.getByText("Cuadra exacto ✓")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar caja" }).click();
  await expect(page.getByRole("heading", { name: "Último cierre" })).toBeVisible();
});
