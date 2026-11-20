import { expect, test } from "@playwright/test";

test("el panel distingue un fallo de carga de una lista vacía y se recupera al actualizar", async ({ page, baseURL }) => {
  const login = await page.request.post("/api/v1/auth/login", {
    headers: { Origin: baseURL! },
    data: { email: "mozo@restaurante.test", password: process.env.SEED_PASSWORD }
  });
  expect(login.status()).toBe(200);

  let unavailable = true;
  await page.route("**/api/v1/orders", route => route.fulfill(unavailable
    ? { status: 503, json: { error: "No se pudo completar la operación." } }
    : { json: { orders: [] } }));
  await page.goto("/panel?vista=orders");
  const alert = page.locator(".workspace-main").getByRole("alert");
  await expect(alert).toContainText("No se pudo actualizar el panel.");
  await expect(alert).toHaveCSS("border-left-width", "0px");
  await expect(page.getByText("Datos sin actualizar")).toBeVisible();
  await expect(page.getByText("No hay pedidos en esta vista.")).toHaveCount(0);

  unavailable = false;
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(alert).toHaveCount(0);
  await expect(page.getByText("No hay pedidos en esta vista.")).toBeVisible();
  await expect(page.getByText("Todo tranquilo por aquí")).toHaveCount(0);
});
