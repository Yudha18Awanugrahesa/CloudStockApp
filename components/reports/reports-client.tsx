"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

import {
  Banknote,
  BarChart3,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Download,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================

type Sale = {
  id: string;
  workspace_id: string;
  invoice_number: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_by: string | null;
  created_at: string;
};

type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
};

type Product = {
  id: string;
  nama: string;
  sku: string | null;
  kategori: string | null;
  harga_jual: number;
};

type ReportsClientProps = {
  initialSales: Sale[];
  initialSaleItems: SaleItem[];
  initialProducts: Product[];
};

type PeriodFilter = "today" | "7days" | "month" | "all";

// ============================================================
// FORMAT
// ============================================================

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(value);
}

function getStartDate(period: PeriodFilter) {
  const now = new Date();

  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (period === "7days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    start.setHours(0, 0, 0, 0);

    return start;
  }

  return null;
}

function paymentLabel(method: string) {
  const labels: Record<string, string> = {
    cash: "Cash",
    qris: "QRIS",
    transfer: "Transfer",
  };

  return labels[method] ?? method;
}

// ============================================================
// EXPORT EXCEL
// ============================================================

function exportSalesToExcel(
  sales: Sale[],
  items: SaleItem[],
  products: Map<string, Product>,
  periodLabel: string,
) {
  const completedSales = sales.filter(
    (sale) => sale.status.toLowerCase() === "completed",
  );

  const cancelledSales = sales.filter(
    (sale) => sale.status.toLowerCase() === "cancelled",
  );

  const itemsBySale = new Map<string, SaleItem[]>();

  items.forEach((item) => {
    const current = itemsBySale.get(item.sale_id) ?? [];
    current.push(item);
    itemsBySale.set(item.sale_id, current);
  });

  const transactionRows = sales.flatMap((sale) => {
    const saleItems = itemsBySale.get(sale.id) ?? [];

    if (saleItems.length === 0) {
      return [
        {
          Invoice: sale.invoice_number,
          Tanggal: new Date(sale.created_at).toLocaleString("id-ID"),
          Status:
            sale.status.toLowerCase() === "completed"
              ? "Selesai"
              : sale.status.toLowerCase() === "cancelled"
                ? "Dibatalkan"
                : sale.status,
          Pembayaran: paymentLabel(sale.payment_method),
          Produk: "-",
          SKU: "-",
          Qty: 0,
          Harga: 0,
          Subtotal: Number(sale.total_amount),
          Total_Transaksi: Number(sale.total_amount),
        },
      ];
    }

    return saleItems.map((item) => {
      const product = products.get(item.product_id);

      return {
        Invoice: sale.invoice_number,
        Tanggal: new Date(sale.created_at).toLocaleString("id-ID"),
        Status:
          sale.status.toLowerCase() === "completed"
            ? "Selesai"
            : sale.status.toLowerCase() === "cancelled"
              ? "Dibatalkan"
              : sale.status,
        Pembayaran: paymentLabel(sale.payment_method),
        Produk: product?.nama ?? "Produk tidak ditemukan",
        SKU: product?.sku ?? "-",
        Qty: Number(item.quantity),
        Harga: Number(item.unit_price),
        Subtotal: Number(item.subtotal),
        Total_Transaksi: Number(sale.total_amount),
      };
    });
  });

  const totalOmzet = completedSales.reduce(
    (total, sale) => total + Number(sale.total_amount),
    0,
  );

  const summaryRows = [
    { Metrik: "Periode", Nilai: periodLabel },
    { Metrik: "Total Transaksi", Nilai: sales.length },
    { Metrik: "Transaksi Selesai", Nilai: completedSales.length },
    { Metrik: "Transaksi Dibatalkan", Nilai: cancelledSales.length },
    { Metrik: "Total Omzet", Nilai: totalOmzet },
    {
      Metrik: "Diekspor Pada",
      Nilai: new Date().toLocaleString("id-ID"),
    },
  ];

  const productMapExport = new Map<
    string,
    {
      Produk: string;
      SKU: string;
      Terjual: number;
      Omzet: number;
    }
  >();

  const completedSaleIds = new Set(completedSales.map((sale) => sale.id));

  items.forEach((item) => {
    if (!completedSaleIds.has(item.sale_id)) return;

    const product = products.get(item.product_id);

    const existing = productMapExport.get(item.product_id) ?? {
      Produk: product?.nama ?? "Produk tidak ditemukan",
      SKU: product?.sku ?? "-",
      Terjual: 0,
      Omzet: 0,
    };

    existing.Terjual += Number(item.quantity);
    existing.Omzet += Number(item.subtotal);

    productMapExport.set(item.product_id, existing);
  });

  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  const transactionSheet = XLSX.utils.json_to_sheet(transactionRows);
  const productSheet = XLSX.utils.json_to_sheet(
    Array.from(productMapExport.values()),
  );

  summarySheet["!cols"] = [{ wch: 24 }, { wch: 28 }];

  transactionSheet["!cols"] = [
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
    { wch: 18 },
    { wch: 10 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
  ];

  productSheet["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 18 }];

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan");
  XLSX.utils.book_append_sheet(workbook, transactionSheet, "Transaksi");
  XLSX.utils.book_append_sheet(workbook, productSheet, "Produk Terjual");

  const date = new Date().toISOString().slice(0, 10);

  XLSX.writeFile(workbook, `CloudStock_Laporan_${date}.xlsx`);
}

// ============================================================
// COMPONENT
// ============================================================

export function ReportsClient({
  initialSales,
  initialSaleItems,
  initialProducts,
}: ReportsClientProps) {
  const [period, setPeriod] = useState<PeriodFilter>("month");

  // ==========================================================
  // PRODUCT MAP
  // ==========================================================

  const productMap = useMemo(() => {
    return new Map(initialProducts.map((product) => [product.id, product]));
  }, [initialProducts]);

  // ==========================================================
  // FILTER SALES
  // ==========================================================

  const filteredSales = useMemo(() => {
    const startDate = getStartDate(period);

    return initialSales.filter((sale) => {
      if (!startDate) {
        return true;
      }

      return new Date(sale.created_at) >= startDate;
    });
  }, [initialSales, period]);

  // ==========================================================
  // FILTER SALE IDS
  // ==========================================================

  const filteredSaleIds = useMemo(() => {
    return new Set(filteredSales.map((sale) => sale.id));
  }, [filteredSales]);

  // ==========================================================
  // FILTER ITEMS
  // ==========================================================

  const filteredItems = useMemo(() => {
    return initialSaleItems.filter((item) => filteredSaleIds.has(item.sale_id));
  }, [initialSaleItems, filteredSaleIds]);

  // ==========================================================
  // TRANSACTIONS THAT COUNT TOWARD REPORTING
  // ==========================================================

  const completedSales = useMemo(() => {
    return filteredSales.filter(
      (sale) => sale.status.toLowerCase() === "completed",
    );
  }, [filteredSales]);

  const completedSaleIds = useMemo(() => {
    return new Set(completedSales.map((sale) => sale.id));
  }, [completedSales]);

  const completedItems = useMemo(() => {
    return filteredItems.filter((item) => completedSaleIds.has(item.sale_id));
  }, [filteredItems, completedSaleIds]);

  // ==========================================================
  // SUMMARY
  // ==========================================================

  const summary = useMemo(() => {
    const omzet = completedSales.reduce(
      (total, sale) => total + Number(sale.total_amount),
      0,
    );

    const transaksi = completedSales.length;

    const produkTerjual = completedItems.reduce(
      (total, item) => total + Number(item.quantity),
      0,
    );

    const rataRata = transaksi > 0 ? omzet / transaksi : 0;

    return {
      omzet,
      transaksi,
      produkTerjual,
      rataRata,
    };
  }, [completedSales, completedItems]);

  // ==========================================================
  // DAILY SALES
  // ==========================================================

  const dailySales = useMemo(() => {
    const map = new Map<
      string,
      {
        date: Date;
        omzet: number;
        transaksi: number;
      }
    >();

    completedSales.forEach((sale) => {
      const date = new Date(sale.created_at);

      const key = [date.getFullYear(), date.getMonth(), date.getDate()].join(
        "-",
      );

      const existing = map.get(key);

      if (existing) {
        existing.omzet += Number(sale.total_amount);

        existing.transaksi += 1;
      } else {
        map.set(key, {
          date,
          omzet: Number(sale.total_amount),
          transaksi: 1,
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }, [completedSales]);

  // ==========================================================
  // MAX DAILY OMZET
  // ==========================================================

  const maxDailyOmzet = useMemo(() => {
    return Math.max(...dailySales.map((item) => item.omzet), 1);
  }, [dailySales]);

  // ==========================================================
  // PAYMENT SUMMARY
  // ==========================================================

  const paymentSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        method: string;
        total: number;
        count: number;
      }
    >();

    completedSales.forEach((sale) => {
      const method = sale.payment_method;

      const existing = map.get(method);

      if (existing) {
        existing.total += Number(sale.total_amount);

        existing.count += 1;
      } else {
        map.set(method, {
          method,
          total: Number(sale.total_amount),
          count: 1,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [completedSales]);

  // ==========================================================
  // TOP PRODUCTS
  // ==========================================================

  const topProducts = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        nama: string;
        sku: string | null;
        quantity: number;
        omzet: number;
      }
    >();

    completedItems.forEach((item) => {
      const product = productMap.get(item.product_id);

      const existing = map.get(item.product_id);

      if (existing) {
        existing.quantity += Number(item.quantity);

        existing.omzet += Number(item.subtotal);
      } else {
        map.set(item.product_id, {
          productId: item.product_id,
          nama: product?.nama ?? "Produk tidak ditemukan",
          sku: product?.sku ?? null,
          quantity: Number(item.quantity),
          omzet: Number(item.subtotal),
        });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [completedItems, productMap]);

  // ==========================================================
  // RECENT SALES
  // ==========================================================

  const recentSales = filteredSales.slice(0, 10);

  // ==========================================================
  // PERIOD LABEL
  // ==========================================================

  const periodLabel = {
    today: "Hari Ini",
    "7days": "7 Hari Terakhir",
    month: "Bulan Ini",
    all: "Semua Data",
  }[period];

  function handleExportExcel() {
    exportSalesToExcel(filteredSales, filteredItems, productMap, periodLabel);
  }

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <div className="-mt-2 space-y-5 sm:-mt-1">
      {/* PAGE INTRO — mobile only */}
      <div className="lg:hidden">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:ring-blue-500/20">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
              Laporan
            </h1>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Pantau performa penjualan dan aktivitas bisnis Anda.
            </p>
          </div>
        </div>
      </div>

      {/* FILTER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white sm:text-base">
            Ringkasan Performa
          </h2>

          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Menampilkan data:{" "}
            <span className="font-semibold">{periodLabel}</span>
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <div className="relative w-full sm:w-auto">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <select
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as PeriodFilter)
              }
              className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:min-w-[190px]"
            >
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="month">Bulan Ini</option>
              <option value="all">Semua Data</option>
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredSales.length === 0}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard
          title="Total Omzet"
          value={formatRupiah(summary.omzet)}
          description={periodLabel}
          icon={<Wallet className="h-5 w-5" />}
          featured
        />

        <SummaryCard
          title="Total Transaksi"
          value={formatNumber(summary.transaksi)}
          description="Transaksi berhasil"
          icon={<Receipt className="h-5 w-5" />}
        />

        <SummaryCard
          title="Produk Terjual"
          value={formatNumber(summary.produkTerjual)}
          description="Total quantity"
          icon={<ShoppingCart className="h-5 w-5" />}
        />

        <SummaryCard
          title="Rata-rata"
          value={formatRupiah(summary.rataRata)}
          description="Nilai per transaksi"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* SALES + PAYMENT */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-950 dark:text-white sm:text-base">
                  Tren Penjualan
                </h2>

                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Omzet dan jumlah transaksi berdasarkan hari.
                </p>
              </div>

              <div className="hidden rounded-xl bg-slate-50 px-3 py-2 text-right sm:block dark:bg-slate-800/60">
                <p className="text-[10px] text-slate-400">Periode</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {periodLabel}
                </p>
              </div>
            </div>
          </div>

          {dailySales.length === 0 ? (
            <EmptyReport message="Belum ada data penjualan" />
          ) : (
            <div className="space-y-4 p-4 sm:p-5">
              {dailySales.map((item) => {
                const percentage = Math.max(
                  4,
                  (item.omzet / maxDailyOmzet) * 100,
                );

                return (
                  <div key={item.date.toISOString()}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {formatShortDate(item.date)}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">
                          {item.transaksi} trx
                        </span>

                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {formatRupiah(item.omzet)}
                        </span>
                      </div>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all dark:bg-blue-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white sm:text-base">
              Metode Pembayaran
            </h2>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Distribusi nilai transaksi.
            </p>
          </div>

          {paymentSummary.length === 0 ? (
            <EmptyReport message="Belum ada transaksi" compact />
          ) : (
            <div className="mt-5 space-y-5">
              {paymentSummary.map((item) => {
                const percentage =
                  summary.omzet > 0 ? (item.total / summary.omzet) * 100 : 0;

                const Icon =
                  item.method === "cash"
                    ? Banknote
                    : item.method === "qris"
                      ? CreditCard
                      : Wallet;

                return (
                  <div key={item.method}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {paymentLabel(item.method)}
                          </p>

                          <p className="text-xs text-slate-400">
                            {item.count} transaksi
                          </p>
                        </div>
                      </div>

                      <p className="shrink-0 text-sm font-bold text-slate-900 dark:text-white">
                        {formatRupiah(item.total)}
                      </p>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-slate-700 dark:bg-slate-300"
                        style={{ width: `${Math.max(percentage, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* TOP PRODUCTS */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white sm:text-base">
            Produk Terlaris
          </h2>

          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Produk dengan quantity penjualan terbanyak.
          </p>
        </div>

        {topProducts.length === 0 ? (
          <EmptyReport message="Belum ada produk terjual" />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Produk
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Terjual
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Omzet
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {topProducts.map((product, index) => (
                    <tr
                      key={product.productId}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                            {index + 1}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {product.nama}
                            </p>

                            {product.sku && (
                              <p className="mt-0.5 text-xs text-slate-400">
                                {product.sku}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                        {formatNumber(product.quantity)}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-slate-900 dark:text-white">
                        {formatRupiah(product.omzet)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2.5 p-3 md:hidden">
              {topProducts.map((product, index) => (
                <div
                  key={product.productId}
                  className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {product.nama}
                      </p>

                      {product.sku && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {product.sku}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatRupiah(product.omzet)}
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {formatNumber(product.quantity)} unit
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* RECENT TRANSACTIONS */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white sm:text-base">
            Transaksi Terbaru
          </h2>

          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Maksimal 10 transaksi terbaru pada periode yang dipilih.
          </p>
        </div>

        {recentSales.length === 0 ? (
          <EmptyReport message="Belum ada transaksi" />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Invoice
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Tanggal
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Pembayaran
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Total
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">
                        {sale.invoice_number}
                      </td>

                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                        {formatDate(sale.created_at)}
                      </td>

                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {paymentLabel(sale.payment_method)}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-slate-900 dark:text-white">
                        {formatRupiah(Number(sale.total_amount))}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span
                          className={
                            sale.status.toLowerCase() === "completed"
                              ? "cs-badge cs-badge-success"
                              : "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
                          }
                        >
                          {sale.status.toLowerCase() === "completed"
                            ? "Selesai"
                            : sale.status.toLowerCase() === "cancelled"
                              ? "Dibatalkan"
                              : sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2.5 p-3 md:hidden">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {sale.invoice_number}
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatDate(sale.created_at)}
                      </p>
                    </div>

                    <span
                      className={
                        sale.status.toLowerCase() === "completed"
                          ? "cs-badge cs-badge-success shrink-0"
                          : "inline-flex shrink-0 items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
                      }
                    >
                      {sale.status.toLowerCase() === "completed"
                        ? "Selesai"
                        : sale.status.toLowerCase() === "cancelled"
                          ? "Dibatalkan"
                          : sale.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] text-slate-400">Pembayaran</p>
                      <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {paymentLabel(sale.payment_method)}
                      </p>
                    </div>

                    <p className="text-sm font-bold text-slate-950 dark:text-white">
                      {formatRupiah(Number(sale.total_amount))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  featured = false,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${
        featured
          ? "border-slate-900 bg-slate-950 text-white dark:border-blue-500/30 dark:bg-blue-600"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          featured
            ? "bg-white/10 text-white"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        {icon}
      </div>

      <p
        className={`mt-4 text-xs sm:text-sm ${
          featured ? "text-slate-300" : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {title}
      </p>

      <p
        className={`mt-1 truncate text-lg font-bold tracking-tight sm:text-2xl ${
          featured ? "text-white" : "text-slate-950 dark:text-white"
        }`}
      >
        {value}
      </p>

      <p
        className={`mt-1 truncate text-[11px] sm:text-xs ${
          featured ? "text-slate-400" : "text-slate-400"
        }`}
      >
        {description}
      </p>
    </div>
  );
}

function EmptyReport({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`mx-4 text-center ${
        compact
          ? "my-5 p-4"
          : "my-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-7 dark:border-slate-700 dark:bg-slate-800/40"
      }`}
    >
      <BarChart3 className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600" />

      <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
        {message}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        Data akan muncul setelah transaksi tersedia.
      </p>
    </div>
  );
}
