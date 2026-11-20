export function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32 || value.startsWith("generar-")) throw new Error("Configura AUTH_SECRET con npm run env:setup");
  return value;
}
export function origin() {
  return new URL(process.env.APP_ORIGIN || "http://localhost:3000").origin;
}
export function business() {
  return { name: process.env.BUSINESS_NAME || "", ruc: process.env.BUSINESS_RUC || "", address: process.env.BUSINESS_ADDRESS || "" };
}
