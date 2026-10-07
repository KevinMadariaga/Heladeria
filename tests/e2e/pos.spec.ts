import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

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

async function loginCajeroConCajaAbierta(page: Page, base: string) {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill("cajero.e2e");
  await page.getByLabel("Contraseña").fill("cajero123");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/pos$/);
  await page.getByLabel("Base en efectivo (COP)").fill(base);
  await page.getByRole("button", { name: "Abrir caja" }).click();
}

const fila = (page: Page, label: string) => page.locator("dt", { hasText: new RegExp(`^${label}$`) }).locator("+ dd");

test("cambiar método de pago después de cobrar: efectivo → transferencia → efectivo", async ({ page }) => {
  await loginCajeroConCajaAbierta(page, "50000");

  await page.getByRole("region", { name: "Productos" }).getByRole("button", { name: /Latte/ }).click();
  await page.getByRole("complementary", { name: "Carrito" }).getByRole("button", { name: /Cobrar/ }).click();

  const ticket = page.getByRole("dialog", { name: "Venta registrada" });
  await expect(ticket.locator("#ticket")).toContainText("Efectivo");
  await ticket.getByRole("radio", { name: "Transferencia" }).click();
  await expect(ticket.getByRole("status")).toHaveText(/ahora figura como Transferencia/);
  await expect(ticket.locator("#ticket")).toContainText("Transferencia");
  await expect(ticket.locator("#ticket")).toContainText(/\$\s?7\.500/); // el total no cambia
  await ticket.getByRole("button", { name: "Nueva venta" }).click();

  // En caja la transferencia sale aparte y no suma al efectivo esperado
  await page.getByRole("link", { name: "Caja" }).click();
  await expect(fila(page, "Transferencia")).toHaveText(/7\.500/);
  await expect(fila(page, "Efectivo")).toHaveText(/\$\s?0$/);
  await expect(fila(page, "Efectivo esperado")).toHaveText(/50\.000/);
  await expect(page.getByText("(cambiado)")).toBeVisible();

  // Se puede corregir de nuevo desde la lista del turno
  await page.getByRole("button", { name: "Cambiar pago" }).click();
  const dialog = page.getByRole("dialog", { name: /Venta #\d+/ });
  await dialog.getByRole("radio", { name: "Efectivo" }).click();
  await expect(dialog.getByRole("status")).toHaveText(/ahora figura como Efectivo/);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(fila(page, "Efectivo esperado")).toHaveText(/57\.500/);

  await page.getByLabel("Efectivo contado (COP)").fill("57500");
  await expect(page.getByText("Cuadra exacto ✓")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar caja" }).click();
  await expect(page.getByRole("heading", { name: "Último cierre" })).toBeVisible();
});

test("cajero devuelve una venta de su turno: vuelve el stock y el efectivo", async ({ page }) => {
  await loginCajeroConCajaAbierta(page, "30000");
  const stockTorta = async () => {
    await page.goto("/pos/inventario");
    const row = page.getByRole("listitem").filter({ hasText: "Torta de chocolate (porción)" });
    return Number((await row.getByText(/\d+ u\./).first().innerText()).match(/(\d+) u\./)![1]);
  };
  const stock0 = await stockTorta();

  await page.goto("/pos");
  await page.getByRole("region", { name: "Productos" }).getByRole("button", { name: /Torta de chocolate/ }).click();
  await page.getByRole("complementary", { name: "Carrito" }).getByRole("button", { name: /Cobrar \$\s?8\.000/ }).click();
  await page.getByRole("dialog", { name: "Venta registrada" }).getByRole("button", { name: "Nueva venta" }).click();
  expect(await stockTorta()).toBe(stock0 - 1);

  await page.goto("/pos/caja");
  await expect(fila(page, "Efectivo esperado")).toHaveText(/38\.000/);
  await page.getByRole("button", { name: "Devolver" }).click();
  const dialog = page.getByRole("dialog", { name: /Devolver venta #\d+/ });
  await dialog.getByLabel("Motivo").fill("Se le cayó al cliente");
  await dialog.getByRole("button", { name: "Devolver venta" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Devuelta: Se le cayó al cliente")).toBeVisible();
  await expect(fila(page, "Efectivo esperado")).toHaveText(/30\.000/);
  expect(await stockTorta()).toBe(stock0);

  await page.goto("/pos/caja");
  await page.getByLabel("Efectivo contado (COP)").fill("30000");
  await page.getByRole("button", { name: "Cerrar caja" }).click();
  await expect(page.getByRole("heading", { name: "Último cierre" })).toBeVisible();
});
