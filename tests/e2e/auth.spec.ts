import { expect, test, type Page } from "@playwright/test";

// Requiere `npm run seed`. Crea (una sola vez) el cajero cajero.e2e para las pruebas.
async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(username);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

test("sin sesión redirige a /login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});

test("contraseña incorrecta muestra error", async ({ page }) => {
  await login(page, "admin", "malaclave");
  await expect(page.getByText("Usuario o contraseña incorrectos")).toBeVisible();
});

test("admin crea cajero; cajero no entra a /admin", async ({ page }) => {
  await login(page, "admin", "123456");
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/usuarios");
  await page.getByRole("button", { name: "Crear usuario" }).click();
  const nuevo = page.locator("section", { has: page.getByRole("heading", { name: "Nuevo usuario" }) });
  await nuevo.getByLabel("Nombre").fill("Cajero E2E");
  await nuevo.getByLabel("Usuario").fill("cajero.e2e");
  await nuevo.getByLabel("Contraseña").fill("cajero123");
  await nuevo.getByRole("button", { name: "Guardar usuario" }).click();
  await expect(nuevo.getByRole("status")).toHaveText(/Guardado|ya existe/);

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await login(page, "cajero.e2e", "cajero123");
  await expect(page).toHaveURL(/\/pos$/);
  await page.goto("/admin/usuarios");
  await expect(page).toHaveURL(/\/pos$/);
});
