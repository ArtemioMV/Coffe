import { expect, test } from "@playwright/test";

test("la carta agrega cada plato una vez y las cantidades se editan en el pedido", async ({ page }) => {
  await page.goto("/carta");
  const add = page.getByRole("button", { name: "Agregar Caldo verde", exact: true });
  const order = page.getByRole("complementary", { name: "Tu pedido" });
  await expect(page.getByText("Estás explorando la carta digital")).toHaveCount(0);
  await add.click();

  await expect(add).toHaveCount(0);
  await expect(page.locator(".carta-list .stepper")).toHaveCount(0);
  await expect(order.locator(".stepper")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Escanea el QR de tu mesa para pedir" })).toHaveCount(1);
  await order.locator(".stepper button").last().click();
  await expect(order.locator(".stepper span")).toHaveText("2");
  await expect(order.locator(".order-total strong")).toHaveText(/30\.00/);
  await order.locator(".stepper button").first().click();
  await order.locator(".stepper button").first().click();
  await expect(add).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
