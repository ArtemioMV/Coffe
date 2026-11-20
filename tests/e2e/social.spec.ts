import { expect, test } from "@playwright/test";

test("Administración publica los enlaces sociales y la portada muestra los cambios", async ({ page, request, baseURL }) => {
  const guest = await request.put("/api/v1/admin/social", { headers: { Origin: baseURL! }, data: {} });
  expect(guest.status()).toBe(401);

  await page.route(/^https:\/\/(?:www\.)?(?:facebook|instagram|tiktok)\.com\//, route => route.fulfill({ body: "Vista previa de prueba" }));
  await page.goto("/");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole("heading", { name: "La experiencia de La Posada" })).toBeVisible();
  await expect(page.getByText("Imagen ilustrativa", { exact: true })).toHaveCount(0);
  await expect(page.locator(".woven-divider")).toBeVisible();
  const menuLink = page.getByRole("link", { name: "Explorar la carta completa", exact: true });
  await expect(menuLink).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(menuLink).toHaveCSS("border-top-width", "0px");
  await expect(page.getByRole("link", { name: "Ver reseña compartida en Google Maps" })).toHaveAttribute("href", "https://maps.app.goo.gl/8pwp6QwgMfCp68Bq9");
  const social = page.getByRole("region", { name: "Visita nuestras redes" });
  await expect(social.getByRole("link", { name: "Instagram", exact: true })).toHaveAttribute("href", "https://www.instagram.com/posadacajamarquina/");
  await expect(social.getByTitle("Publicaciones de Facebook")).toHaveAttribute("src", /^https:\/\/www\.facebook\.com\/plugins\/page\.php\?.*tabs=timeline/);
  await expect(social.getByTitle("Perfil de TikTok")).toHaveAttribute("src", "https://www.tiktok.com/embed/@posadacajamarquina");
  await expect(social.getByTitle("Publicación de Instagram")).toHaveAttribute("loading", "lazy");
  await expect(social.getByRole("button", { name: /^Cargar/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Waze" })).toHaveAttribute("href", /ll=-8\.1426352%2C-79\.058001/);
  await page.getByRole("button", { name: /Ir a la diapositiva 2/ }).click();
  await expect(page.getByRole("button", { name: /Ir a la diapositiva 2/ })).toHaveAttribute("aria-current", "true");
  const howLink = page.getByRole("link", { name: "Cómo funciona", exact: true });
  await expect(howLink).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(howLink).toHaveCSS("border-top-width", "0px");
  await expect(page.getByRole("button", { name: "Diapositiva siguiente" })).toHaveCount(0);

  await page.getByRole("link", { name: "Mi cuenta", exact: true }).click();
  await page.getByLabel("Correo", { exact: true }).fill("admin@restaurante.test");
  await page.getByLabel("Contraseña", { exact: true }).fill(process.env.SEED_PASSWORD!);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByRole("button", { name: "Redes sociales", exact: true }).click();
  const instagram = page.getByLabel("Perfil de Instagram");
  await expect(instagram).toHaveValue("https://www.instagram.com/posadacajamarquina/");
  const { settings } = await (await page.request.get("/api/v1/admin/social")).json();
  const invalid = await page.request.put("/api/v1/admin/social", {
    headers: { Origin: baseURL! }, data: { ...settings, instagram: "https://www.instagram.com.ejemplo.test/posadacajamarquina/" }
  });
  expect(invalid.status()).toBe(422);
  await instagram.fill("");
  await page.getByLabel("Video público de TikTok").fill("https://www.tiktok.com/@posadacajamarquina/video/1234567890123456789");
  await page.getByRole("button", { name: "Guardar redes sociales" }).click();
  await expect(page.getByText("Redes sociales guardadas.")).toBeVisible();
  const stale = await page.request.put("/api/v1/admin/social", {
    headers: { Origin: baseURL! }, data: { ...settings, instagramPost: settings.instagramPost ?? "", tiktokVideo: "" }
  });
  expect(stale.status()).toBe(409);

  await page.goto("/");
  await expect(social.getByRole("link", { name: "Instagram", exact: true })).toHaveCount(0);
  await expect(social.getByTitle("Video de TikTok")).toHaveAttribute("src", "https://www.tiktok.com/player/v1/1234567890123456789");
  await expect(social.getByTitle("Perfil de TikTok")).toHaveCount(0);
  await expect(social.getByTitle("Publicación de Instagram")).toHaveAttribute("src", "https://www.instagram.com/reel/DJu4_fpSaXW/embed/");
});
