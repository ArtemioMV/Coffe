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
  const drink = page.getByRole("button", { name: "Agregar Chicha morada", exact: true });
  await drink.click();
  const removeDish = order.getByRole("button", { name: "Retirar Caldo verde del pedido", exact: true });
  await expect(removeDish).toHaveCSS("height", "32px");
  await expect(order.getByRole("button", { name: "Sumar uno de Caldo verde", exact: true })).toHaveCSS("height", "32px");
  await removeDish.click();
  await expect(add).toBeVisible();
  await expect(order.getByText("Caldo verde", { exact: true })).toHaveCount(0);
  await expect(order.locator(".order-total strong")).toHaveText(/7\.00/);
  await order.getByRole("button", { name: "Retirar Chicha morada del pedido", exact: true }).click();
  await expect(drink).toBeVisible();
  await expect(order.getByText("Aún no agregas platos.")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
