import { test, expect } from "@playwright/test";

test("el mozo toma el pedido en la misma pestaña y va directo a cocina", async ({ page, playwright, baseURL }) => {
  const admin = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  expect((await admin.post("/api/v1/auth/login", { data: { email: "admin@restaurante.test", password: process.env.SEED_PASSWORD } })).status()).toBe(200);
  const table = await (await admin.post("/api/v1/tables", { data: { name: `MZ-${Date.now()}`, zone: "Pruebas", seats: 2 } })).json();

  await page.goto("/panel");
  await page.getByLabel("Correo", { exact: true }).fill("mozo@restaurante.test");
  await page.getByLabel("Contraseña", { exact: true }).fill(process.env.SEED_PASSWORD!);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByRole("button", { name: "Mesas y QR", exact: true }).click();
  await expect(page).toHaveURL(/vista=tables/);
  await page.locator(".mesa-tile", { hasText: `Mesa ${table.name}` }).click();
  await page.waitForURL(url => url.searchParams.get("mesa") === table.id);
  const detail = page.getByRole("complementary", { name: `Mesa ${table.name}` });
  await detail.getByRole("button", { name: "Abrir atención", exact: true }).click();

  const pages = page.context().pages().length;
  await detail.getByRole("link", { name: "Tomar pedido", exact: true }).click();
  await expect(page).toHaveURL(/\/carta\?mesa=/);
  expect(page.context().pages().length).toBe(pages);
  await expect(page.getByText("Tomando el pedido de la mesa: se envía directo a cocina.")).toBeVisible();
  await expect(page.getByText(/tu mozo confirmará/i)).toHaveCount(0);

  await page.getByRole("button", { name: "Agregar Humitas de la casa", exact: true }).click();
  await page.getByRole("button", { name: "Revisar pedido", exact: true }).click();
  await page.getByLabel("Nombre del cliente (opcional)").fill("Cliente QA");
  await page.getByRole("button", { name: "Enviar a cocina", exact: true }).click();

  await page.waitForURL(url => url.pathname === "/panel" && url.searchParams.get("vista") === "tables" && url.searchParams.get("mesa") === table.id);
  const back = page.getByRole("complementary", { name: `Mesa ${table.name}` });
  await expect(back.getByText("Confirmado", { exact: true })).toBeVisible();

  const kitchen = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  await kitchen.post("/api/v1/auth/login", { data: { email: "cocina@restaurante.test", password: process.env.SEED_PASSWORD } });
  const board = await (await kitchen.get("/api/v1/orders")).json();
  const sent = board.orders.find((o: { tableName: string }) => o.tableName === table.name);
  expect(sent?.status).toBe("PENDING");

  // Ticket en la misma pestaña, ya armado desde el servidor, y «Volver» regresa a la mesa.
  await page.goto(`/panel/ticket/${sent.id}?tipo=comanda`);
  await expect(page.locator(".thermal-ticket")).toContainText("Humitas de la casa");
  await page.getByRole("button", { name: "Volver", exact: true }).click();
  await expect(page).toHaveURL(/\/panel\?vista=tables/);

  await kitchen.dispose();
  await admin.dispose();
});
