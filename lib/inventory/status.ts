export type StockStatus = "SAFE" | "REORDER" | "CRITICAL" | "OUT_OF_STOCK";

export function getStockStatus(current: number, safety: number, rop: number): StockStatus {
  if (current <= 0) return "OUT_OF_STOCK";
  if (current <= safety) return "CRITICAL";
  if (current <= rop) return "REORDER";
  return "SAFE";
}

export function buildStockAlert(
  name: string,
  current: number,
  safety: number,
  rop: number,
  roq: number
) {
  const status = getStockStatus(current, safety, rop);
  if (status === "OUT_OF_STOCK") return `Stok ${name} habis. Segera lakukan pemesanan sebanyak ${roq}.`;
  if (status === "CRITICAL") return `Stok ${name} tersisa ${current} dan berada di bawah Safety Stock. Segera pesan ${roq}.`;
  if (status === "REORDER") return `Stok ${name} tersisa ${current} dan telah mencapai Reorder Point. Segera pesan ${roq}.`;
  return null;
}
