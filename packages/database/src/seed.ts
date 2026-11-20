import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db } from "./index";

async function seed() {
  if (process.env.SEED_DEMO !== "true" || process.env.NODE_ENV === "production") throw new Error("Semilla solo local: habilita SEED_DEMO=true explícitamente");
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12 || password.startsWith("generar-")) throw new Error("Genera SEED_PASSWORD con npm run env:setup");
  const passwordHash = await hash(password, 12);
  for (const [role, name, email] of [
    ["ADMIN", "Administración", "admin@restaurante.test"],
    ["WAITER", "Mozo de demostración", "mozo@restaurante.test"],
    ["KITCHEN", "Cocina", "cocina@restaurante.test"],
    ["CASHIER", "Caja", "caja@restaurante.test"]
  ] as const) await db.user.upsert({ where: { email }, create: { email, name, role, passwordHash }, update: {} });
  const categories = ["Entradas de la casa", "Sabores cajamarquinos", "Del campo a la mesa", "Bebidas y dulces"];
  const ids: string[] = [];
  for (let i = 0; i < categories.length; i++) ids.push((await db.category.upsert({ where: { name: categories[i] }, create: { name: categories[i], position: i }, update: {} })).id);
  const products = [
    ["Humitas de la casa", "Maíz tierno, queso y el sabor de una receta familiar.", "12.00", 0, "KITCHEN"],
    ["Caldo verde", "Hierbas de la región, papa y queso fresco.", "15.00", 0, "KITCHEN"],
    ["Cuy frito con picante de papa", "Un clásico de Cajamarca, preparado al momento.", "48.00", 1, "KITCHEN"],
    ["Chicharrón con mote", "Cerdo dorado, mote y zarza criolla.", "32.00", 1, "KITCHEN"],
    ["Trucha a la plancha", "Con papas nativas y ensalada de temporada.", "34.00", 2, "KITCHEN"],
    ["Choclo con queso", "Choclo del valle y queso fresco cajamarquino.", "14.00", 2, "KITCHEN"],
    ["Chicha morada", "Vaso de nuestra preparación de la casa.", "7.00", 3, "BAR"],
    ["Quesillo con miel", "Quesillo fresco y miel de chancaca.", "12.00", 3, "KITCHEN"]
  ] as const;
  for (const [name, description, price, category, station] of products) {
    if (!await db.product.findFirst({ where: { name } })) await db.product.create({ data: { name, description, price, categoryId: ids[category], station } });
  }
  for (let i = 1; i <= 6; i++) await db.diningTable.upsert({ where: { name: String(i) }, create: { name: String(i), zone: i <= 3 ? "Jardín" : "Terraza", seats: 4, qrToken: randomBytes(24).toString("base64url") }, update: {} });
  console.log("Semilla local lista: carta y seis mesas de demostración. Contraseña en SEED_PASSWORD; no se imprime.");
}
seed().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
