import { test, expect, APIRequestContext } from "@playwright/test";

test("QR, aprobación del mozo, cocina, ticket, pago y cierre", async ({ page, browser, playwright, baseURL }) => {
  const staff: Record<string, APIRequestContext> = {};
  for (const [key, email] of Object.entries({ admin: "admin@restaurante.test", waiter: "mozo@restaurante.test", kitchen: "cocina@restaurante.test", cashier: "caja@restaurante.test" })) {
    const context = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
    const response = await context.post("/api/v1/auth/login", { data: { email, password: process.env.SEED_PASSWORD } });
    expect(response.status()).toBe(200);
    staff[key] = context;
  }
  const guest = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  const created = await staff.admin.post("/api/v1/tables", { data: { name: `QA-${Date.now()}`, zone: "Pruebas", seats: 4 } });
  expect(created.status()).toBe(201);
  const table = await created.json();
  expect((await staff.waiter.post(`/api/v1/tables/${table.id}/open`, { data: {} })).status()).toBe(201);
  expect((await staff.admin.patch(`/api/v1/tables/${table.id}`, { data: { active: false } })).status()).toBe(409);
  const qr = await staff.waiter.get(`/api/v1/tables/${table.id}/qr`);
  expect(qr.headers()["content-type"]).toContain("image/svg+xml");
  expect(await qr.text()).toContain("<svg");

  await page.goto(`/carta?mesa=${table.qrToken}`);
  await expect(page.getByText(`Mesa ${table.name} · Pruebas`, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Agregar Humitas de la casa", exact: true }).click();
  await page.getByRole("button", { name: "Revisar pedido", exact: true }).click();
  await page.getByLabel("Tu nombre (opcional)").fill("Cliente QA");
  await page.getByRole("button", { name: "Enviar al mozo", exact: true }).click();
  await expect(page).toHaveURL(/\/pedido\//);
  await expect(page.getByRole("heading", { name: "Por confirmar", exact: true })).toBeVisible();
  const orderId = new URL(page.url()).pathname.split("/").pop()!;
  const kitchenBefore = await (await staff.kitchen.get("/api/v1/orders")).json();
  expect(kitchenBefore.orders.some((o: { id: string }) => o.id === orderId)).toBe(false);
  expect((await staff.kitchen.get(`/api/v1/orders/${orderId}`)).status()).toBe(404);
  expect((await guest.get(`/api/v1/orders/${orderId}`)).status()).toBe(404);
  expect((await staff.kitchen.post(`/api/v1/orders/${orderId}/transition`, { data: { action: "prepare", version: 0 } })).ok()).toBe(false);
  const notices = await (await staff.waiter.get("/api/v1/notifications")).json();
  expect(notices.notifications.some((n: { orderId: string }) => n.orderId === orderId)).toBe(true);
  let order = (await (await staff.waiter.get(`/api/v1/orders/${orderId}`)).json()).order;
  for (const [actor, action] of [[staff.waiter, "confirm"], [staff.kitchen, "prepare"], [staff.kitchen, "ready"], [staff.waiter, "acknowledge"], [staff.waiter, "deliver"]] as const) {
    const response = await actor.post(`/api/v1/orders/${orderId}/transition`, { data: { action, version: order.version, reason: "" } });
    expect(response.status(), await response.text()).toBe(200);
    order = (await response.json()).order;
    if (action === "confirm") {
      const kitchenPage = await browser.newPage({ baseURL, storageState: await staff.kitchen.storageState() });
      try {
        await kitchenPage.goto("/panel");
        const lane = kitchenPage.getByRole("region", { name: "Nuevos", exact: true });
        await expect(lane.getByRole("heading", { name: `Pedido #${order.number}` })).toBeVisible();
        // Otras pruebas en paralelo pueden dejar comandas en «Nuevos»: se mira solo la tarjeta de este pedido.
        const card = lane.locator("article").filter({ has: kitchenPage.getByRole("heading", { name: `Pedido #${order.number}` }) });
        await expect(card.getByRole("button", { name: "Iniciar preparación" })).toBeVisible();
        await kitchenPage.screenshot({ path: ".cache/cocina-desktop.png", fullPage: true });
      } finally {
        await kitchenPage.context().close();
      }
    }
  }
  expect((await staff.cashier.post(`/api/v1/tables/${table.id}/close`, { data: {} })).status()).toBe(409);
  expect((await staff.waiter.post(`/api/v1/tables/${table.id}/close`, { data: {} })).status()).toBe(403);
  const cashierPage = await browser.newPage({ baseURL, storageState: await staff.cashier.storageState() });
  await cashierPage.goto("/panel?vista=orders");
  await expect(cashierPage.getByRole("combobox", { name: "Mostrar", exact: true })).toHaveValue("unpaid");
  const unpaidOrder = cashierPage.getByRole("article").filter({ has: cashierPage.getByRole("heading", { name: `Pedido #${order.number}`, exact: true }) });
  await expect(unpaidOrder.getByRole("button", { name: "Registrar cobro conciliado" })).toBeVisible();
  const paymentKey = crypto.randomUUID();
  const paymentData = { amount: order.total, method: "EFECTIVO", reference: "" };
  const paid = await staff.cashier.post(`/api/v1/orders/${orderId}/payments`, { data: paymentData, headers: { "Idempotency-Key": paymentKey } });
  expect(paid.status()).toBe(201);
  const replay = await staff.cashier.post(`/api/v1/orders/${orderId}/payments`, { data: paymentData, headers: { "Idempotency-Key": paymentKey } });
  expect((await replay.json()).id).toBe((await paid.json()).id);
  expect((await staff.cashier.post(`/api/v1/orders/${orderId}/payments`, { data: paymentData, headers: { "Idempotency-Key": crypto.randomUUID() } })).status()).toBe(409);
  await cashierPage.goto(`/panel?vista=tables&mesa=${table.id}`);
  await cashierPage.getByRole("button", { name: "Cerrar atención", exact: true }).click();
  await cashierPage.getByText("Últimas atenciones cerradas", { exact: true }).click();
  await expect(cashierPage.locator("#mesa-detalle details li").first()).toContainText("Mozo");
  await cashierPage.context().close();
  expect((await staff.admin.patch(`/api/v1/tables/${table.id}`, { data: { active: false } })).status()).toBe(200);
  const ticket = await (await staff.cashier.get(`/api/v1/orders/${orderId}/ticket`)).json();
  expect(ticket.fiscal.enabled).toBe(false);
  await expect(page.getByRole("heading", { name: "Entregado", exact: true })).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Enviar valoración", exact: true }).click();
  await expect(page.getByText("Gracias por compartir tu valoración.")).toBeVisible();
  await page.screenshot({ path: ".cache/seguimiento-desktop.png", fullPage: true });
  await page.goto("/");
  await page.screenshot({ path: ".cache/inicio-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/carta");
  await expect(page.getByRole("heading", { name: "Nuestra carta", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".cache/carta-mobile.png", fullPage: true });
  for (const context of [...Object.values(staff), guest]) await context.dispose();
});

test("contratos REST, precio actualizado e idempotencia de pedidos", async ({ playwright, baseURL }) => {
  const admin = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  const logged = await admin.post("/api/v1/auth/login", { data: { email: "admin@restaurante.test", password: process.env.SEED_PASSWORD } });
  expect(logged.ok()).toBe(true);
  const table = await (await admin.post("/api/v1/tables", { data: { name: `API-${Date.now()}`, zone: "Pruebas", seats: 2 } })).json();
  await admin.post(`/api/v1/tables/${table.id}/open`, { data: {} });
  const menu = await (await admin.get("/api/v1/menu")).json();
  const p = menu.categories[0].products[0];
  const guest = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  const data = { tableToken: table.qrToken, items: [{ productId: p.id, quantity: 1, expectedPrice: p.price }] };
  expect((await guest.post("/api/v1/orders", { data: { ...data, items: [{ ...data.items[0], expectedPrice: "0.01" }] }, headers: { "Idempotency-Key": crypto.randomUUID() } })).status()).toBe(409);
  const key = crypto.randomUUID();
  const a = await guest.post("/api/v1/orders", { data, headers: { "Idempotency-Key": key } });
  expect(a.status()).toBe(201); const first = await a.json();
  const replay = await guest.post("/api/v1/orders", { data, headers: { "Idempotency-Key": key } });
  const second = await replay.json(); expect(second.order.id).toBe(first.order.id); expect(second.token).toBe(first.token);
  expect((await guest.post("/api/v1/orders", { data: { ...data, notes: "Cambio de contenido" }, headers: { "Idempotency-Key": key } })).status()).toBe(409);
  const csrf = await guest.post("/api/v1/orders", { data, headers: { Origin: "https://otro.example", "Idempotency-Key": crypto.randomUUID() } });
  expect(csrf.status()).toBe(403);
  await admin.post(`/api/v1/orders/${first.order.id}/transition`, { data: { action: "reject", version: 0, reason: "Cierre de prueba" } });
  await admin.post(`/api/v1/tables/${table.id}/close`, { data: {} });
  await admin.patch(`/api/v1/tables/${table.id}`, { data: { active: false } });
  await admin.dispose(); await guest.dispose();
});
