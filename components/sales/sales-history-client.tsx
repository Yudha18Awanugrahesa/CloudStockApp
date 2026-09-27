"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  Ban,
  ChevronDown,
  ChevronUp,
  Receipt,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/lib/toast";

type SaleItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products:
    | {
        nama: string;
        sku: string | null;
      }
    | {
        nama: string;
        sku: string | null;
      }[]
    | null;
};

type Sale = {
  id: string;
  invoice_number: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  sale_items: SaleItem[];
};

type ArchivedSale = {
  id: string;
  workspace_id: string;
  invoice_number: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_by: string | null;
  created_at: string;
  items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    created_at?: string;
  }>;
  archived_at: string;
  archived_by: string;
  archive_batch_id: string;
};

type HistoryTab = "active" | "archive";

type Props = {
  initialSales: Sale[];
  workspaceId: string;
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const paymentLabel: Record<string, string> = {
  cash: "Cash",
  qris: "QRIS",
  transfer: "Transfer",
  debit: "Debit",
  credit: "Credit",
};

export function SalesHistoryClient({ initialSales, workspaceId }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [archiveSales, setArchiveSales] = useState<ArchivedSale[]>([]);
  const [activeTab, setActiveTab] = useState<HistoryTab>("active");
  const [archiveLoaded, setArchiveLoaded] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingSale, setConfirmingSale] = useState<Sale | null>(null);
  const [cancelingSale, setCancelingSale] = useState<Sale | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [expandedArchiveId, setExpandedArchiveId] = useState<string | null>(
    null,
  );

  const loadArchiveSales = async () => {
    if (archiveLoading) return;
    setArchiveLoading(true);
    setArchiveError(null);
    try {
      const { data, error } = await supabase.rpc("get_sales_archive", {
        p_workspace_id: workspaceId,
      });
      if (error) throw error;
      setArchiveSales((data ?? []) as ArchivedSale[]);
      setArchiveLoaded(true);
    } catch (error) {
      console.error("Load sales archive error:", error);
      setArchiveError(
        error instanceof Error
          ? error.message
          : "Arsip transaksi tidak dapat dimuat.",
      );
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleTabChange = (tab: HistoryTab) => {
    setActiveTab(tab);
    setSearch("");
    setExpandedId(null);
    setExpandedArchiveId(null);
    if (tab === "archive" && !archiveLoaded) void loadArchiveSales();
  };

  const filteredSales = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) {
      return sales;
    }

    return sales.filter((sale) =>
      sale.invoice_number.toLowerCase().includes(keyword),
    );
  }, [sales, search]);

  const todayTotal = useMemo(() => {
    const today = new Date().toDateString();

    return sales
      .filter(
        (sale) =>
          new Date(sale.created_at).toDateString() === today &&
          sale.status === "completed",
      )
      .reduce((total, sale) => total + Number(sale.total_amount), 0);
  }, [sales]);

  // ==========================================================
  // CANCEL SALE
  // ==========================================================

  const handleCancelSale = async () => {
    if (!cancelingSale) {
      return;
    }

    const sale = cancelingSale;

    setCancelingId(sale.id);
    setActionError(null);

    try {
      const { data, error } = await supabase.rpc("cancel_sale", {
        p_workspace_id: workspaceId,
        p_sale_id: sale.id,
      });

      if (error) {
        throw error;
      }

      setSales((current) =>
        current.map((item) =>
          item.id === sale.id ? { ...item, status: "cancelled" } : item,
        ),
      );

      setCancelingSale(null);

      showToast({
        type: "success",
        title: "Transaksi berhasil dibatalkan",
        message:
          data?.message ??
          `${sale.invoice_number} berhasil dibatalkan dan stok bahan baku telah dikembalikan.`,
        duration: 6000,
      });

      router.refresh();
    } catch (error) {
      console.error("Cancel sale error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Transaksi tidak dapat dibatalkan.";

      setActionError(message);

      showToast({
        type: "error",
        title: "Gagal membatalkan transaksi",
        message,
        duration: 7000,
      });
    } finally {
      setCancelingId(null);
    }
  };

  // ==========================================================
  // DELETE SALE
  // ==========================================================

  const handleDeleteSale = async () => {
    if (!confirmingSale) {
      return;
    }

    const sale = confirmingSale;

    setDeletingId(sale.id);
    setActionError(null);

    try {
      const { data, error } = await supabase.rpc("delete_sale", {
        p_workspace_id: workspaceId,
        p_sale_id: sale.id,
      });

      if (error) {
        throw error;
      }

      // Hapus transaksi dari tampilan saat ini
      setSales((current) => current.filter((item) => item.id !== sale.id));

      // Tutup detail transaksi jika sedang terbuka
      if (expandedId === sale.id) {
        setExpandedId(null);
      }

      // Tutup modal konfirmasi
      setConfirmingSale(null);

      // ======================================================
      // SUCCESS TOAST
      // ======================================================

      showToast({
        type: "success",
        title: "Transaksi berhasil dihapus",
        message:
          data?.message ??
          `${sale.invoice_number} berhasil dihapus. Stok bahan baku tidak mengalami perubahan.`,
        duration: 6000,
      });

      // Refresh data server
      router.refresh();
    } catch (error) {
      console.error("Delete sale error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Transaksi tidak dapat dihapus.";

      setActionError(message);

      // ======================================================
      // ERROR TOAST
      // ======================================================

      showToast({
        type: "error",
        title: "Gagal menghapus transaksi",
        message,
        duration: 7000,
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ======================================================
          HEADER
      ======================================================= */}

      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
            <Receipt className="h-5 w-5 text-slate-700" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Riwayat Penjualan
            </h1>

            <p className="text-sm text-slate-500">
              Lihat seluruh transaksi penjualan CloudStock.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => handleTabChange("active")}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${activeTab === "active" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <Receipt className="h-4 w-4" /> Transaksi Aktif
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("archive")}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${activeTab === "archive" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <Archive className="h-4 w-4" /> Arsip
          </button>
        </div>
      </div>

      <div className={activeTab === "active" ? "space-y-6" : "hidden"}>
        {/* ======================================================
          SUMMARY
      ======================================================= */}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Transaksi</p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {sales.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Penjualan Hari Ini</p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {formatRupiah(todayTotal)}
            </p>
          </div>
        </div>

        {/* ======================================================
          SEARCH
      ======================================================= */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nomor invoice..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>

        {/* ======================================================
          ERROR
      ======================================================= */}

        {actionError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Gagal memproses transaksi: {actionError}
          </div>
        )}

        {/* ======================================================
          SALES LIST
      ======================================================= */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {filteredSales.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="mx-auto h-10 w-10 text-slate-300" />

              <p className="mt-4 font-medium text-slate-700">
                Belum ada transaksi
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Transaksi dari POS akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSales.map((sale) => {
                const expanded = expandedId === sale.id;
                const canCancel = sale.status === "completed";
                const canDelete =
                  sale.status === "completed" || sale.status === "cancelled";

                return (
                  <div key={sale.id}>
                    {/* ==================================================
                      SALE HEADER
                  =================================================== */}

                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : sale.id)}
                      className="w-full px-5 py-4 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {sale.invoice_number}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                sale.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : sale.status === "cancelled"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {sale.status === "completed"
                                ? "Selesai"
                                : sale.status === "cancelled"
                                  ? "Dibatalkan"
                                  : sale.status}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatDate(sale.created_at)}
                            </span>

                            <span>
                              {paymentLabel[sale.payment_method] ??
                                sale.payment_method}
                            </span>

                            <span>{sale.sale_items.length} produk</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                          <p className="text-base font-bold text-slate-900">
                            {formatRupiah(Number(sale.total_amount))}
                          </p>

                          {expanded ? (
                            <ChevronUp className="h-5 w-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* ==================================================
                      DETAIL
                  =================================================== */}

                    {expanded && (
                      <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                        <div className="space-y-3">
                          {sale.sale_items.map((item) => {
                            const product = Array.isArray(item.products)
                              ? item.products[0]
                              : item.products;

                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-4 rounded-xl bg-white p-3"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {product?.nama ?? "Produk tidak ditemukan"}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {item.quantity} ×{" "}
                                    {formatRupiah(Number(item.unit_price))}
                                  </p>
                                </div>

                                <p className="text-sm font-bold text-slate-900">
                                  {formatRupiah(Number(item.subtotal))}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* ==================================================
                          DELETE + TOTAL
                      =================================================== */}

                        <div className="mt-4 flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-end sm:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            {canCancel && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionError(null);
                                  setCancelingSale(sale);
                                }}
                                disabled={
                                  cancelingId === sale.id ||
                                  deletingId === sale.id
                                }
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Ban className="h-4 w-4" />
                                {cancelingId === sale.id
                                  ? "Membatalkan..."
                                  : "Batalkan Transaksi"}
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionError(null);
                                  setConfirmingSale(sale);
                                }}
                                disabled={
                                  deletingId === sale.id ||
                                  cancelingId === sale.id
                                }
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 className="h-4 w-4" />
                                Hapus Transaksi
                              </button>
                            )}

                            {!canCancel && !canDelete && (
                              <p className="text-xs text-slate-400">
                                Transaksi {sale.status} tidak memiliki tindakan.
                              </p>
                            )}
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-slate-500">Total</p>

                            <p className="mt-1 text-lg font-bold text-slate-900">
                              {formatRupiah(Number(sale.total_amount))}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className={activeTab === "archive" ? "space-y-6" : "hidden"}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Transaksi Arsip</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {archiveSales.length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Omzet Arsip</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatRupiah(
                archiveSales
                  .filter((sale) => sale.status === "completed")
                  .reduce(
                    (total, sale) => total + Number(sale.total_amount),
                    0,
                  ),
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Dibatalkan</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {
                archiveSales.filter((sale) => sale.status === "cancelled")
                  .length
              }
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari invoice arsip..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>
        {archiveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Gagal memuat arsip: {archiveError}
            <button
              type="button"
              onClick={() => void loadArchiveSales()}
              className="ml-2 font-semibold underline"
            >
              Coba lagi
            </button>
          </div>
        )}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {archiveLoading ? (
            <div className="p-12 text-center">
              <Archive className="mx-auto h-10 w-10 animate-pulse text-slate-300" />
              <p className="mt-4 font-medium text-slate-700">
                Memuat arsip transaksi...
              </p>
            </div>
          ) : (
            (() => {
              const keyword = search.toLowerCase().trim();
              const list = archiveSales.filter(
                (sale) =>
                  !keyword ||
                  sale.invoice_number.toLowerCase().includes(keyword),
              );
              return list.length === 0 ? (
                <div className="p-12 text-center">
                  <Archive className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-4 font-medium text-slate-700">
                    Belum ada transaksi arsip
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Transaksi yang sudah ditutup buku akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {list.map((sale) => {
                    const expanded = expandedArchiveId === sale.id;
                    return (
                      <div key={sale.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedArchiveId(expanded ? null : sale.id)
                          }
                          className="w-full px-5 py-4 text-left transition hover:bg-slate-50"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-slate-900">
                                  {sale.invoice_number}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sale.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                                >
                                  {sale.status === "completed"
                                    ? "Selesai"
                                    : "Dibatalkan"}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {formatDate(sale.created_at)}
                                </span>
                                <span>
                                  {paymentLabel[sale.payment_method] ??
                                    sale.payment_method}
                                </span>
                                <span>{sale.items.length} item</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-4 sm:justify-end">
                              <div className="text-right">
                                <p className="text-base font-bold text-slate-900">
                                  {formatRupiah(Number(sale.total_amount))}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-400">
                                  Arsip {formatDate(sale.archived_at)}
                                </p>
                              </div>
                              {expanded ? (
                                <ChevronUp className="h-5 w-5 text-slate-400" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                              )}
                            </div>
                          </div>
                        </button>
                        {expanded && (
                          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                            <div className="space-y-3">
                              {sale.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-4 rounded-xl bg-white p-3"
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                      Produk ID: {item.product_id}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {item.quantity} ×{" "}
                                      {formatRupiah(Number(item.unit_price))}
                                    </p>
                                  </div>
                                  <p className="text-sm font-bold text-slate-900">
                                    {formatRupiah(Number(item.subtotal))}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                              <span>Batch arsip: {sale.archive_batch_id}</span>
                              <span>
                                Diarsipkan: {formatDate(sale.archived_at)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* ======================================================
          CANCEL CONFIRMATION MODAL
      ======================================================= */}

      {cancelingSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-sale-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="cancel-sale-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Batalkan transaksi?
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Transaksi akan berubah menjadi dibatalkan dan stok bahan baku
                  yang digunakan akan dikembalikan.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!cancelingId) {
                    setCancelingSale(null);
                  }
                }}
                disabled={Boolean(cancelingId)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                Invoice
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {cancelingSale.invoice_number}
              </p>

              <p className="mt-2 text-sm font-bold text-slate-900">
                {formatRupiah(Number(cancelingSale.total_amount))}
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelingSale(null)}
                disabled={Boolean(cancelingId)}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleCancelSale}
                disabled={Boolean(cancelingId)}
                className="h-10 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelingId ? "Membatalkan..." : "Batalkan Transaksi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          DELETE CONFIRMATION MODAL
      ======================================================= */}

      {confirmingSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-sale-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            {/* Modal Header */}

            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="delete-sale-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Hapus transaksi?
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Tindakan ini akan menghapus transaksi dari riwayat aktif. Stok
                  bahan baku tidak akan mengalami perubahan.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!deletingId) {
                    setConfirmingSale(null);
                  }
                }}
                disabled={Boolean(deletingId)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Invoice Information */}

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Invoice
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {confirmingSale.invoice_number}
              </p>

              <p className="mt-2 text-sm font-bold text-slate-900">
                {formatRupiah(Number(confirmingSale.total_amount))}
              </p>
            </div>

            {/* Modal Actions */}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmingSale(null)}
                disabled={Boolean(deletingId)}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDeleteSale}
                disabled={Boolean(deletingId)}
                className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId ? "Menghapus..." : "Hapus Transaksi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
