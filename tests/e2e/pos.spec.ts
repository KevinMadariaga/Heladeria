import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

// El <dt> trae una ayuda debajo del título: se compara solo el inicio.
const fila = (page: Page, label: string) => page.locator("dt", { hasText: new RegExp(`^${label}`) }).locator("+ dd");
const pesos = async (page: Page, label: string) => Number((await fila(page, label).innerText()).replace(/\D/g, ""));

/** Cierra la caja contando exactamente lo esperado (efectivo y transferencias). */
async function cerrarCuadrado(page: Page) {
  await page.getByLabel("Efectivo contado (COP)").fill(String(await pesos(page, "Debes tener en efectivo")));
  await page.getByLabel("Transferencias recibidas (COP)").fill(String(await pesos(page, "Debes tener en transferencias")));
  await expect(page.getByText("Cuadra exacto ✓")).toHaveCount(2);
  await page.getByRole("button", { name: "Cerrar caja" }).click();
  await expect(page.getByRole("heading", { name: "Último cierre" })).toBeVisible();
}

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
    await cerrarCuadrado(page);
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
  await expect(carrito.getByRole("button", { name: /Cobrar \$\s?17\.500/ })).toBeVisible();

  await carrito.getByLabel("Efectivo recibido (vacío = exacto)").fill("20000");
  await expect(carrito.getByText(/Cambio: \$\s?2\.500/)).toBeVisible();
  await carrito.getByRole("button", { name: /Cobrar/ }).click();

  const ticket = page.getByRole("dialog", { name: "Venta registrada" });
  await expect(ticket.getByText("TOTAL")).toBeVisible();
  await expect(ticket.locator("#ticket")).toContainText("Cambio");
  await ticket.getByRole("button", { name: "Nueva venta" }).click();

  // Cierre: base 50.000 + efectivo 17.500 = 67.500
  await page.getByRole("link", { name: "Caja" }).click();
  await expect(fila(page, "Debes tener en efectivo")).toHaveText(/67\.500/);
  await expect(fila(page, "Total con la base")).toHaveText(/67\.500/);
  await cerrarCuadrado(page);
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
  await expect(fila(page, "Ventas por transferencia")).toHaveText(/7\.500/);
  await expect(fila(page, "Ventas en efectivo")).toHaveText(/\$\s?0$/);
  await expect(fila(page, "Debes tener en efectivo")).toHaveText(/50\.000/);
  await expect(fila(page, "Debes tener en transferencias")).toHaveText(/7\.500/);
  await expect(page.getByText("(cambiado)")).toBeVisible();

  // Se puede corregir de nuevo desde la lista del turno
  await page.getByRole("button", { name: "Cambiar pago" }).click();
  const dialog = page.getByRole("dialog", { name: /Venta #\d+/ });
  await dialog.getByRole("radio", { name: "Efectivo" }).click();
  await expect(dialog.getByRole("status")).toHaveText(/ahora figura como Efectivo/);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(fila(page, "Debes tener en efectivo")).toHaveText(/57\.500/);

  // Y también a mixto: $2.500 por transferencia y $5.000 en efectivo
  await page.getByRole("button", { name: "Cambiar pago" }).click();
  const mixto = page.getByRole("dialog", { name: /Venta #\d+/ });
  await mixto.getByRole("radio", { name: "Mixto" }).click();
  await mixto.getByLabel("Valor por transferencia").fill("2500");
  await expect(mixto.getByText(/En efectivo: \$\s?5\.000/)).toBeVisible();
  await mixto.getByRole("button", { name: "Guardar" }).click();
  await expect(mixto.getByRole("status")).toHaveText(/ahora figura como Mixto/);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(fila(page, "Debes tener en efectivo")).toHaveText(/55\.000/);
  await expect(fila(page, "Debes tener en transferencias")).toHaveText(/2\.500/);
  await cerrarCuadrado(page);
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
  await expect(fila(page, "Debes tener en efectivo")).toHaveText(/38\.000/);
  await page.getByRole("button", { name: "Devolver" }).click();
  const dialog = page.getByRole("dialog", { name: /Devolver venta #\d+/ });
  await dialog.getByLabel("Motivo").fill("Se le cayó al cliente");
  await dialog.getByRole("button", { name: "Devolver venta" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Devuelta: Se le cayó al cliente")).toBeVisible();
  await expect(fila(page, "Debes tener en efectivo")).toHaveText(/30\.000/);
  expect(await stockTorta()).toBe(stock0);

  await page.goto("/pos/caja");
  await cerrarCuadrado(page);
});

test("pago mixto + domicilio + cierre que no cuadra exige nota", async ({ page }) => {
  await loginCajeroConCajaAbierta(page, "20000");
  const productos = page.getByRole("region", { name: "Productos" });
  const carrito = page.getByRole("complementary", { name: "Carrito" });

  // 1) Latte $7.500 en pago mixto: $5.000 transferencia + $2.500 efectivo (paga con $10.000 → cambio $7.500)
  await productos.getByRole("button", { name: /Latte/ }).click();
  await carrito.getByRole("radio", { name: "Mixto" }).click();
  await carrito.getByLabel("Valor por transferencia").fill("5000");
  await expect(carrito.getByText(/En efectivo: \$\s?2\.500/)).toBeVisible();
  await carrito.getByLabel("Efectivo recibido (vacío = exacto)").fill("10000");
  await expect(carrito.getByText(/Cambio: \$\s?7\.500/)).toBeVisible();
  await carrito.getByRole("button", { name: /Cobrar \$\s?7\.500/ }).click();
  let ticket = page.getByRole("dialog", { name: "Venta registrada" });
  await expect(ticket.locator("#ticket")).toContainText("Mixto");
  await expect(ticket.locator("#ticket")).toContainText(/Transferencia\s*\$\s?5\.000/);
  await ticket.getByRole("button", { name: "Nueva venta" }).click();

  // 2) Domicilio: Cono doble $8.000 + porta $1.000 + domicilio $3.000 = $12.000 por transferencia
  await productos.getByRole("button", { name: /Cono doble/ }).click();
  await page.getByRole("dialog", { name: "Cono doble" }).getByRole("button", { name: /Agregar · \$\s?8\.000/ }).click(); // tiene toppings: abre opciones
  const cliente = `Laura Gómez ${Date.now()}`; // único: la base de pruebas guarda domicilios de corridas anteriores
  await carrito.getByLabel("Es domicilio").check();
  await expect(carrito.getByRole("button", { name: /Cobrar/ })).toBeDisabled(); // faltan cliente y dirección
  const domicilio = carrito.getByRole("group", { name: "Datos del domicilio" }); // marcar muestra los campos debajo
  await expect(domicilio.getByLabel("Cliente *")).toBeFocused();
  await domicilio.getByLabel("Cliente *").fill(cliente);
  await domicilio.getByLabel("Dirección *").fill("Calle 10 # 5-20");
  await domicilio.getByLabel("Teléfono").fill("3001234567");
  await domicilio.getByLabel("Valor domicilio").fill("3000");
  await carrito.getByLabel("Lleva porta").check();
  const porta = carrito.getByRole("group", { name: "Porta / envase" });
  await porta.getByLabel("Cantidad").fill("2");
  await porta.getByLabel("Valor de cada porta").fill("500");
  await expect(porta.getByText(/= \$\s?1\.000/)).toBeVisible();
  await carrito.getByRole("radio", { name: "Transferencia" }).click();
  await carrito.getByRole("button", { name: /Cobrar \$\s?12\.000/ }).click();
  ticket = page.getByRole("dialog", { name: "Venta registrada" });
  await expect(ticket.locator("#ticket")).toContainText(cliente);
  await expect(ticket.locator("#ticket")).toContainText(/Domicilio\s*\$\s?3\.000/);
  await expect(ticket.locator("#ticket")).toContainText(/Porta \/ envase x2\s*\$\s?1\.000/);
  await expect(ticket.locator("#ticket")).toContainText(/Productos\s*\$\s?8\.000/);
  await ticket.getByRole("button", { name: "Nueva venta" }).click();

  // 3) Seguimiento del domicilio
  await page.getByRole("link", { name: "Domicilios" }).click();
  const pedido = page.getByRole("listitem").filter({ hasText: cliente });
  await expect(page.getByRole("region", { name: /Pendiente/ }).getByText(cliente)).toBeVisible();
  await pedido.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByRole("region", { name: /En camino/ }).getByText(cliente)).toBeVisible();
  await page.getByRole("listitem").filter({ hasText: cliente }).getByRole("button", { name: "Marcar entregado" }).click();
  await expect(page.getByRole("region", { name: /Entregado/ }).getByText(cliente)).toBeVisible();

  // 4) Caja: efectivo = base 20.000 + 2.500 ; transferencias = 5.000 + 12.000 ; total vendido 19.500
  await page.getByRole("link", { name: "Caja" }).click();
  await expect(fila(page, "Ventas en efectivo")).toHaveText(/2\.500/);
  await expect(fila(page, "Ventas por transferencia")).toHaveText(/17\.000/);
  await expect(fila(page, "Portas / envases")).toHaveText(/1\.000/);
  await expect(page.locator("dt", { hasText: /^Portas \/ envases/ })).toContainText("2 envase(s)");
  await expect(fila(page, "Domicilios")).toHaveText(/3\.000/);
  await expect(fila(page, "Total vendido")).toHaveText(/19\.500/);
  await expect(fila(page, "Debes tener en efectivo")).toHaveText(/22\.500/);
  await expect(fila(page, "Debes tener en transferencias")).toHaveText(/17\.000/);
  await expect(fila(page, "Total con la base")).toHaveText(/39\.500/);

  // 5) Cierre con faltante de $500 en efectivo: pide nota antes de cerrar
  await page.getByLabel("Efectivo contado (COP)").fill("22000");
  await page.getByLabel("Transferencias recibidas (COP)").fill("17000");
  await expect(page.getByText(/Falta \$\s?500/)).toBeVisible();
  await expect(page.getByText("La caja no cuadra", { exact: false })).toBeVisible();
  await page.getByLabel("Nota (obligatoria)").fill("Se dio mal un cambio");
  await page.getByRole("button", { name: "Cerrar con diferencia" }).click();
  await expect(page.getByRole("heading", { name: "Último cierre" })).toBeVisible();
  await expect(page.getByText("Faltó $ 500", { exact: false }).or(page.getByText(/Faltó \$\s?500/))).toBeVisible();
  await expect(page.getByText("Nota: Se dio mal un cambio")).toBeVisible();
});

test("cajero anota lo que saca: no entra en la caja, sale al cerrar y el admin ve cuánto debe", async ({ page }) => {
  await loginCajeroConCajaAbierta(page, "10000");
  const nota = `almuerzo ${Date.now()}`; // único: la base de pruebas guarda consumos de corridas anteriores
  const carrito = page.getByRole("complementary", { name: "Carrito" });
  await page.getByRole("region", { name: "Productos" }).getByRole("button", { name: /Torta de chocolate/ }).click();
  await carrito.getByRole("button", { name: /Lo saco yo/ }).click();
  const dialog = page.getByRole("dialog", { name: "Anotar a mi cuenta" });
  await expect(dialog).toContainText(/\$\s?8\.000/);
  await dialog.getByLabel("Nota (opcional)").fill(nota);
  await dialog.getByRole("button", { name: "Sí, anotar" }).click();
  await expect(carrito.getByText(/Consumo anotado a tu cuenta: \$\s?8\.000/)).toBeVisible();

  // Caja: no suma dinero; se ve lo que sacó, y también en el último cierre
  await page.getByRole("link", { name: "Caja" }).click();
  await expect(fila(page, "Debes tener en efectivo")).toHaveText(/10\.000/);
  await expect(page.getByText(nota)).toBeVisible();
  await cerrarCuadrado(page);
  await expect(page.getByRole("heading", { name: "Lo que sacaste (a tu cuenta)" })).toBeVisible();
  await expect(page.getByText(nota)).toBeVisible();

  // Admin: deuda del mes por cajero
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Usuario").fill("admin");
  await page.getByLabel("Contraseña").fill("123456");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/consumos");
  await expect(page.locator("dt", { hasText: "Cajero E2E" }).locator("+ dd")).toHaveText(/debe \$\s?[\d.]+/);
  await expect(page.getByText(nota)).toBeVisible();
});

test("descuento de cumpleaños: 1 gratis en la línea, sale en el ticket y en la caja", async ({ page }) => {
  await loginCajeroConCajaAbierta(page, "10000");
  const productos = page.getByRole("region", { name: "Productos" });
  const carrito = page.getByRole("complementary", { name: "Carrito" });

  // 2 Latte ($15.000) y el cumpleañero se lleva 1 gratis → $7.500
  await productos.getByRole("button", { name: /Latte/ }).click();
  await carrito.getByRole("button", { name: "Agregar uno de Latte" }).click();
  await carrito.getByRole("button", { name: "Descuento de cumpleaños en Latte" }).click();
  await carrito.getByRole("group", { name: "Cumpleaños: Latte" }).getByRole("button", { name: "1 gratis" }).click();
  await carrito.getByRole("button", { name: /Cobrar \$\s?7\.500/ }).click();

  const ticket = page.getByRole("dialog", { name: "Venta registrada" });
  await expect(ticket.locator("#ticket")).toContainText(/Desc\. cumpleaños\s*-\$\s?7\.500/);
  await expect(ticket.locator("#ticket")).toContainText(/TOTAL\s*\$\s?7\.500/);
  await ticket.getByRole("button", { name: "Nueva venta" }).click();

  await page.getByRole("link", { name: "Caja" }).click();
  await expect(fila(page, "Descuentos cumpleaños")).toHaveText(/-\s?\$\s?7\.500|\$\s?-7\.500/);
  await expect(fila(page, "Total vendido")).toHaveText(/7\.500/);
  await expect(fila(page, "Debes tener en efectivo")).toHaveText(/17\.500/);
  await expect(page.getByText(/🎂 -\$\s?7\.500/)).toBeVisible();
  await cerrarCuadrado(page);
});
