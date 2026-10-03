import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill("admin");
  await page.getByLabel("Contraseña").fill("123456");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});

test("admin sube foto de producto y se sirve", async ({ page }) => {
  // Foto grande generada en el navegador (2000×1500) → el form la reduce antes de subir.
  const base64 = await page.evaluate(async () => {
    const c = new OffscreenCanvas(2000, 1500);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#F7B9DA";
    ctx.fillRect(0, 0, 2000, 1500);
    ctx.fillStyle = "#5B1A7E";
    ctx.beginPath();
    ctx.arc(1000, 750, 500, 0, Math.PI * 2);
    ctx.fill();
    const blob = await c.convertToBlob({ type: "image/png" });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    bytes.forEach((b) => (s += String.fromCharCode(b)));
    return btoa(s);
  });

  await page.goto("/admin/productos");
  const name = "Producto foto E2E";
  const card = page.getByRole("button", { name: new RegExp(name) });
  let form;
  const editing = (await card.count()) > 0;
  if (editing) {
    await card.click();
    const dialog = page.getByRole("dialog", { name, exact: true });
    await dialog.getByRole("button", { name: "Editar" }).click();
    form = page.getByRole("dialog", { name: `Editar · ${name}` }).locator("form").first();
  } else {
    await page.getByRole("button", { name: "Agregar producto" }).click();
    form = page.getByRole("region", { name: "Nuevo producto" }).locator("form");
    await form.getByLabel("Nombre").fill(name);
    await form.getByLabel("Precio (COP)").fill("3000");
  }
  await form.getByLabel(/Imagen/).setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: Buffer.from(base64, "base64") });
  const save = form.getByRole("button", { name: /Crear producto|Guardar cambios/ });
  await expect(save).toBeEnabled();
  await save.click();
  if (editing) {
    // Al guardar, la ficha vuelve a la vista de detalle
    await expect(page.getByRole("dialog", { name, exact: true }).getByRole("button", { name: "Editar" })).toBeVisible();
    await page.keyboard.press("Escape");
  } else {
    await expect(form.getByText("Guardado ✓")).toBeVisible();
  }

  // La tarjeta del catálogo abre la ficha con la foto grande
  await page.getByRole("button", { name: new RegExp(name) }).click();
  const img = page.getByRole("dialog", { name, exact: true }).locator("img").first();
  await expect(img).toBeVisible();
  const src = decodeURIComponent((await img.getAttribute("src"))!);
  expect(src).toContain("/api/images/");
  const id = src.match(/\/api\/images\/([a-f0-9]{24})/)![1];
  const res = await page.request.get(`/api/images/${id}`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/jpeg"); // reducida a JPEG en el navegador
  expect((await res.body()).length).toBeLessThan(300_000);
});

test("dashboard muestra KPIs y gráficas", async ({ page }) => {
  await expect(page.getByText("Hoy", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ventas" })).toBeVisible();
  await expect(page.locator(".recharts-bar-rectangle").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Más vendidos de la semana" })).toBeVisible();
  for (const tab of ["Semana", "Mes", "Año"]) {
    await page.getByRole("link", { name: tab, exact: true }).click();
    await expect(page.getByRole("link", { name: tab, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".recharts-bar-rectangle").first()).toBeVisible();
  }
});
