// Prices are numeric(10,2) pounds in the database and whole pence everywhere in the app.

export function toPence(value: number | string | null | undefined): number {
  const pounds = typeof value === "string" ? Number.parseFloat(value) : (value ?? 0);
  return Number.isFinite(pounds) ? Math.round(pounds * 100) : 0;
}

export function toPounds(pence: number): number {
  return Math.round(pence) / 100;
}

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export function formatPence(pence: number): string {
  return gbp.format(pence / 100);
}
