"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type StockStatus = "SAFE" | "REORDER" | "CRITICAL" | "OUT_OF_STOCK";

type BahanBaku = {
  id: string;
  workspace_id: string;
  nama: string;
  sku: string | null;
  satuan: string;
  harga_satuan: number;
  current_stock: number;
  safety_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  created_at: string;
  updated_at: string;
};

type FormData = {
  nama: string;
  sku: string;
  satuan: string;
  harga_satuan: string;
  current_stock: string;
  safety_stock: string;
  reorder_point: string;
  reorder_quantity: string;
};

const emptyForm: FormData = {
  nama: "",
  sku: "",
  satuan: "pcs",
  harga_satuan: "0",
  current_stock: "0",
  safety_stock: "0",
  reorder_point: "0",
  reorder_quantity: "0",
};

export function InventoryClient({
  initialItems,
  workspaceId,
}: {
  initialItems: BahanBaku[];
  workspaceId: string;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [items, setItems] = useState<BahanBaku[]>(initialItems);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | StockStatus>("ALL");
  const [satuanFilter, setSatuanFilter] = useState("ALL");

  // Modal tambah/edit bahan
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BahanBaku | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  // Modal restock
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<BahanBaku | null>(null);
  const [restockQuantity, setRestockQuantity] = useState("");
  const [restockNotes, setRestockNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [restockLoading, setRestockLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [restockError, setRestockError] = useState("");

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!notification) return;

    const timer = window.setTimeout(() => {
      setNotification(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [notification]);

  const filteredItems = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return items.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.nama.toLowerCase().includes(keyword) ||
        (item.sku ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        getStockStatus(
          item.current_stock,
          item.safety_stock,
          item.reorder_point,
        ) === statusFilter;

      const matchesSatuan =
        satuanFilter === "ALL" || item.satuan === satuanFilter;

      return matchesSearch && matchesStatus && matchesSatuan;
    });
  }, [items, search, statusFilter, satuanFilter]);

  function openCreateModal() {
    setEditingItem(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(item: BahanBaku) {
    setEditingItem(item);

    setForm({
      nama: item.nama,
      sku: item.sku ?? "",
      satuan: item.satuan,
      harga_satuan: String(item.harga_satuan),
      current_stock: String(item.current_stock),
      safety_stock: String(item.safety_stock),
      reorder_point: String(item.reorder_point),
      reorder_quantity: String(item.reorder_quantity),
    });

    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (loading) return;

    setModalOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
    setError("");
  }

  function openRestockModal(item: BahanBaku) {
    setRestockItem(item);

    const defaultQuantity =
      Number(item.reorder_quantity) > 0 ? String(item.reorder_quantity) : "";

    setRestockQuantity(defaultQuantity);
    setRestockNotes("");
    setRestockError("");
    setRestockModalOpen(true);
  }

  function closeRestockModal() {
    if (restockLoading) return;

    setRestockModalOpen(false);
    setRestockItem(null);
    setRestockQuantity("");
    setRestockNotes("");
    setRestockError("");
  }

  function updateForm(field: keyof FormData, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const numericFields = {
      harga_satuan: Number(form.harga_satuan),
      current_stock: Number(form.current_stock),
      safety_stock: Number(form.safety_stock),
      reorder_point: Number(form.reorder_point),
      reorder_quantity: Number(form.reorder_quantity),
    };

    const hasInvalidNumber = Object.values(numericFields).some(
      (value) => !Number.isFinite(value) || value < 0,
    );

    if (hasInvalidNumber) {
      const message = "Nilai angka tidak valid. Pastikan semua angka >= 0.";
      setError(message);
      setNotification({
        type: "error",
        title: "Data tidak valid",
        message,
      });
      setLoading(false);
      return;
    }

    if (!form.nama.trim()) {
      const message = "Nama bahan wajib diisi.";
      setError(message);
      setNotification({
        type: "error",
        title: "Data belum lengkap",
        message,
      });
      setLoading(false);
      return;
    }

    if (!form.satuan.trim()) {
      const message = "Satuan wajib diisi.";
      setError(message);
      setNotification({
        type: "error",
        title: "Data belum lengkap",
        message,
      });
      setLoading(false);
      return;
    }

    const payload = {
      nama: form.nama.trim(),
      sku: form.sku.trim() || null,
      satuan: form.satuan.trim(),
      harga_satuan: numericFields.harga_satuan,
      current_stock: numericFields.current_stock,
      safety_stock: numericFields.safety_stock,
      reorder_point: numericFields.reorder_point,
      reorder_quantity: numericFields.reorder_quantity,
      updated_at: new Date().toISOString(),
    };

    if (editingItem) {
      const { data, error: updateError } = await supabase
        .from("bahan_baku")
        .update(payload)
        .eq("id", editingItem.id)
        .select()
        .single();

      if (updateError) {
        setError(updateError.message);
        setNotification({
          type: "error",
          title: "Gagal memperbarui bahan",
          message: updateError.message,
        });
        setLoading(false);
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === editingItem.id ? (data as BahanBaku) : item,
        ),
      );
    } else {
      const { data, error: insertError } = await supabase
        .from("bahan_baku")
        .insert({
          ...payload,
          workspace_id: workspaceId,
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        setNotification({
          type: "error",
          title: "Gagal menambahkan bahan",
          message: insertError.message,
        });
        setLoading(false);
        return;
      }

      setItems((current) => [data as BahanBaku, ...current]);
    }

    setLoading(false);
    closeModal();

    setNotification({
      type: "success",
      title: editingItem ? "Bahan diperbarui" : "Bahan ditambahkan",
      message: editingItem
        ? `"${form.nama.trim()}" berhasil diperbarui.`
        : `"${form.nama.trim()}" berhasil ditambahkan ke inventory.`,
    });
  }

  async function handleRestock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!restockItem) return;

    setRestockLoading(true);
    setRestockError("");

    const quantity = Number(restockQuantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      const message = "Jumlah stok harus lebih besar dari 0.";
      setRestockError(message);
      setNotification({
        type: "error",
        title: "Jumlah stok tidak valid",
        message,
      });
      setRestockLoading(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc("add_stock", {
      p_workspace_id: workspaceId,
      p_bahan_baku_id: restockItem.id,
      p_quantity: quantity,
      p_notes: restockNotes.trim() || null,
    });

    if (rpcError) {
      setRestockError(rpcError.message);
      setNotification({
        type: "error",
        title: "Restock gagal",
        message: rpcError.message,
      });
      setRestockLoading(false);
      return;
    }

    const result = data as {
      success?: boolean;
      new_stock?: number;
      quantity_added?: number;
    } | null;

    const newStock =
      result?.new_stock ?? Number(restockItem.current_stock) + quantity;

    setItems((current) =>
      current.map((item) =>
        item.id === restockItem.id
          ? {
              ...item,
              current_stock: newStock,
              updated_at: new Date().toISOString(),
            }
          : item,
      ),
    );

    setRestockLoading(false);
    closeRestockModal();

    setNotification({
      type: "success",
      title: "Restock berhasil",
      message: `${formatNumber(quantity)} ${restockItem.satuan} ${restockItem.nama} berhasil ditambahkan.`,
    });

    // Sinkronisasi server/client
    router.refresh();
  }

  async function handleDelete(item: BahanBaku) {
    const confirmed = window.confirm(
      `Hapus bahan "${item.nama}"? Data yang sudah dihapus tidak dapat dikembalikan.`,
    );

    if (!confirmed) return;

    setDeletingId(item.id);
    setError("");

    const { error: deleteError } = await supabase
      .from("bahan_baku")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      setError(deleteError.message);
      setNotification({
        type: "error",
        title: "Gagal menghapus bahan",
        message: deleteError.message,
      });
      setDeletingId(null);
      return;
    }

    setItems((current) =>
      current.filter((existing) => existing.id !== item.id),
    );

    setDeletingId(null);

    setNotification({
      type: "success",
      title: "Bahan dihapus",
      message: `"${item.nama}" berhasil dihapus dari inventory.`,
    });
  }

  const totalItems = items.length;

  const safeItems = items.filter(
    (item) =>
      getStockStatus(
        item.current_stock,
        item.safety_stock,
        item.reorder_point,
      ) === "SAFE",
  ).length;

  const lowStockItems = items.filter((item) => {
    const status = getStockStatus(
      item.current_stock,
      item.safety_stock,
      item.reorder_point,
    );

    return status === "REORDER" || status === "CRITICAL";
  }).length;

  const outOfStockItems = items.filter(
    (item) =>
      getStockStatus(
        item.current_stock,
        item.safety_stock,
        item.reorder_point,
      ) === "OUT_OF_STOCK",
  ).length;

  const satuanOptions = Array.from(
    new Set(items.map((item) => item.satuan).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "id"));

  return (
    <>
      {/* =========================================================
          GLOBAL TOAST NOTIFICATION
      ========================================================= */}
      {notification && (
        <div
          role={notification.type === "error" ? "alert" : "status"}
          aria-live={notification.type === "error" ? "assertive" : "polite"}
          className="fixed left-4 right-4 top-20 z-[200] md:left-auto md:right-6 md:w-[430px]"
        >
          <div
            className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-2xl ring-1 ${
              notification.type === "error"
                ? "border-red-200 ring-red-100"
                : "border-emerald-200 ring-emerald-100"
            }`}
          >
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                notification.type === "error"
                  ? "bg-red-100 text-red-600"
                  : "bg-emerald-100 text-emerald-600"
              }`}
            >
              {notification.type === "error" ? (
                <XCircle size={19} />
              ) : (
                <CheckCircle2 size={19} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-bold ${
                  notification.type === "error"
                    ? "text-red-700"
                    : "text-emerald-700"
                }`}
              >
                {notification.title}
              </p>

              <p className="mt-1 text-sm leading-5 text-slate-600">
                {notification.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setNotification(null)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup notifikasi"
              title="Tutup"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          HEADER
      ========================================================= */}
      <div className="mb-6 flex items-start justify-between gap-3 sm:items-end">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2.5">
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 sm:flex">
              <Package size={20} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Inventory
              </h1>

              <p className="max-w-2xl text-sm leading-5 text-slate-500 sm:mt-0.5">
                Kelola bahan baku, pantau stok, dan lakukan restock dengan
                cepat.
              </p>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/inventory/movements")}
            title="Lihat Movement"
            aria-label="Lihat Movement"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 sm:h-11 sm:w-auto sm:gap-2 sm:px-4 sm:text-sm sm:font-semibold"
          >
            <History size={17} />
            <span className="hidden sm:inline">Movement</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            title="Tambah Bahan"
            aria-label="Tambah Bahan"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm transition hover:bg-slate-800 sm:h-11 sm:w-auto sm:gap-2 sm:px-4 sm:text-sm sm:font-semibold"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Tambah Bahan</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          STOCK OVERVIEW
      ========================================================= */}
      <div className="mb-6">
        <div className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Stock Overview
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">
            Kondisi persediaan
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SummaryCard
            label="Total Bahan"
            value={totalItems}
            description="Bahan aktif"
            icon={<Package size={18} />}
          />

          <SummaryCard
            label="Stok Aman"
            value={safeItems}
            description="Di atas reorder point"
            icon={<CheckCircle2 size={18} />}
            safe
          />

          <SummaryCard
            label="Perlu Dicek"
            value={lowStockItems}
            description="Reorder / kritis"
            icon={<AlertTriangle size={18} />}
            warning
          />

          <SummaryCard
            label="Stok Habis"
            value={outOfStockItems}
            description="Perlu restock"
            icon={<XCircle size={18} />}
            danger
          />
        </div>
      </div>

      {/* =========================================================
          ERROR
      ========================================================= */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <XCircle size={18} className="mt-0.5 shrink-0" />

          <div>
            <p className="font-semibold">Terjadi kesalahan</p>
            <p className="mt-1">{error}</p>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* =========================================================
          INVENTORY TABLE
      ========================================================= */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* TOOLBAR */}
        <div className="border-b border-slate-200 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama bahan atau SKU..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5 sm:h-11 sm:pl-10 sm:pr-4"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "ALL" | StockStatus)
              }
              aria-label="Filter status"
              className="h-10 w-[82px] shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 sm:h-11 sm:w-36 sm:px-3 sm:text-sm"
            >
              <option value="ALL">Status</option>
              <option value="SAFE">Aman</option>
              <option value="REORDER">Reorder</option>
              <option value="CRITICAL">Kritis</option>
              <option value="OUT_OF_STOCK">Habis</option>
            </select>

            <select
              value={satuanFilter}
              onChange={(event) => setSatuanFilter(event.target.value)}
              aria-label="Filter satuan"
              className="h-10 w-[82px] shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 sm:h-11 sm:w-32 sm:px-3 sm:text-sm"
            >
              <option value="ALL">Satuan</option>
              {satuanOptions.map((satuan) => (
                <option key={satuan} value={satuan}>
                  {satuan}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* =======================================================
            DESKTOP TABLE
        ======================================================= */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Bahan
                </th>

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Satuan
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Stok
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Reorder Point
                </th>

                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Status
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const status = getStockStatus(
                  item.current_stock,
                  item.safety_stock,
                  item.reorder_point,
                );

                return (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    {/* BAHAN */}
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {item.nama}
                        </p>

                        {item.sku && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            SKU: {item.sku}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* SATUAN */}
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {item.satuan}
                    </td>

                    {/* STOK */}
                    <td className="px-5 py-4 text-right">
                      <p className="font-semibold text-slate-900">
                        {formatNumber(item.current_stock)}
                      </p>

                      <p className="text-xs text-slate-400">
                        Min. {formatNumber(item.safety_stock)}
                      </p>
                    </td>

                    {/* REORDER POINT */}
                    <td className="px-5 py-4 text-right text-sm text-slate-600">
                      {formatNumber(item.reorder_point)}
                    </td>

                    {/* STATUS */}
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={status} />
                    </td>

                    {/* AKSI */}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        {/* TAMBAH STOK */}
                        <button
                          type="button"
                          onClick={() => openRestockModal(item)}
                          className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                          title="Tambah Stok"
                        >
                          <Plus size={17} />
                        </button>

                        {/* EDIT */}
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          title="Edit"
                        >
                          <Pencil size={17} />
                        </button>

                        {/* HAPUS */}
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Hapus"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* =======================================================
            MOBILE CARDS
        ======================================================= */}
        <div className="divide-y divide-slate-100 md:hidden">
          {filteredItems.map((item) => {
            const status = getStockStatus(
              item.current_stock,
              item.safety_stock,
              item.reorder_point,
            );

            return (
              <div key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.nama}</p>

                    {item.sku && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        SKU: {item.sku}
                      </p>
                    )}
                  </div>

                  <StatusBadge status={status} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Stok Saat Ini</p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {formatNumber(item.current_stock)} {item.satuan}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Reorder Point</p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {formatNumber(item.reorder_point)} {item.satuan}
                    </p>
                  </div>
                </div>

                {/* MOBILE ACTION */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => openRestockModal(item)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <Plus size={15} />
                    Tambah Stok
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* EMPTY STATE */}
        {filteredItems.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package size={22} />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              {items.length === 0
                ? "Belum ada bahan baku"
                : "Bahan tidak ditemukan"}
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              {items.length === 0
                ? "Tambahkan bahan baku pertama untuk mulai mengelola inventory."
                : "Coba gunakan kata kunci atau filter status yang berbeda."}
            </p>

            {items.length === 0 && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Plus size={17} />
                Tambah Bahan
              </button>
            )}
          </div>
        )}

        {/* FOOTER */}
        {filteredItems.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
            Menampilkan {filteredItems.length} dari {items.length} bahan
          </div>
        )}
      </div>

      {/* =========================================================
          MODAL TAMBAH / EDIT BAHAN
      ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-950">
                  {editingItem ? "Edit Bahan Baku" : "Tambah Bahan Baku"}
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Lengkapi informasi inventory bahan.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  label="Nama Bahan"
                  value={form.nama}
                  onChange={(value) => updateForm("nama", value)}
                  placeholder="Contoh: Gula"
                  required
                />

                <FormField
                  label="SKU"
                  value={form.sku}
                  onChange={(value) => updateForm("sku", value)}
                  placeholder="Contoh: GL-001"
                />

                <FormField
                  label="Satuan"
                  value={form.satuan}
                  onChange={(value) => updateForm("satuan", value)}
                  placeholder="kg, liter, pcs"
                  required
                />

                <NumberField
                  label="Harga per Satuan"
                  value={form.harga_satuan}
                  onChange={(value) => updateForm("harga_satuan", value)}
                  placeholder="0"
                />

                <NumberField
                  label="Current Stock"
                  value={form.current_stock}
                  onChange={(value) => updateForm("current_stock", value)}
                  placeholder="0"
                />

                <NumberField
                  label="Safety Stock"
                  value={form.safety_stock}
                  onChange={(value) => updateForm("safety_stock", value)}
                  placeholder="0"
                />

                <NumberField
                  label="Reorder Point"
                  value={form.reorder_point}
                  onChange={(value) => updateForm("reorder_point", value)}
                  placeholder="0"
                />

                <NumberField
                  label="Reorder Quantity"
                  value={form.reorder_quantity}
                  onChange={(value) => updateForm("reorder_quantity", value)}
                  placeholder="0"
                />
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 sm:mt-5 sm:px-4 sm:py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Status Stok
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] leading-4 text-slate-500 sm:gap-x-5 sm:text-xs">
                  <span>🟢 Aman</span>
                  <span>🟡 Reorder</span>
                  <span>🔴 Kritis</span>
                  <span>⚫ Habis</span>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
                >
                  {loading ? (
                    "Menyimpan..."
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      {editingItem ? "Simpan Perubahan" : "Simpan Bahan"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL RESTOCK / TAMBAH STOK
      ========================================================= */}
      {restockModalOpen && restockItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-5 sm:py-4">
              <div>
                <h2 className="font-semibold text-slate-950">Tambah Stok</h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Catat stok masuk untuk bahan baku.
                </p>
              </div>

              <button
                type="button"
                onClick={closeRestockModal}
                disabled={restockLoading}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleRestock} className="p-5">
              {/* PRODUCT INFO */}
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Bahan Baku</p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {restockItem.nama}
                    </p>

                    {restockItem.sku && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        SKU: {restockItem.sku}
                      </p>
                    )}
                  </div>

                  <StatusBadge
                    status={getStockStatus(
                      restockItem.current_stock,
                      restockItem.safety_stock,
                      restockItem.reorder_point,
                    )}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Stok Saat Ini</p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {formatNumber(restockItem.current_stock)}{" "}
                      {restockItem.satuan}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Reorder Point</p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {formatNumber(restockItem.reorder_point)}{" "}
                      {restockItem.satuan}
                    </p>
                  </div>
                </div>
              </div>

              {/* QUANTITY */}
              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Jumlah Stok Masuk
                  <span className="text-red-500"> *</span>
                </span>

                <div className="relative">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={restockQuantity}
                    onChange={(event) => setRestockQuantity(event.target.value)}
                    placeholder={
                      restockItem.reorder_quantity > 0
                        ? String(restockItem.reorder_quantity)
                        : "0"
                    }
                    required
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-20 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5"
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    {restockItem.satuan}
                  </span>
                </div>

                {restockItem.reorder_quantity > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setRestockQuantity(String(restockItem.reorder_quantity))
                    }
                    className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    Gunakan reorder quantity (
                    {formatNumber(restockItem.reorder_quantity)}{" "}
                    {restockItem.satuan})
                  </button>
                )}
              </label>

              {/* NOTES */}
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Catatan
                </span>

                <textarea
                  value={restockNotes}
                  onChange={(event) => setRestockNotes(event.target.value)}
                  placeholder="Contoh: Restock dari supplier Jakarta"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5"
                />
              </label>

              {/* PREVIEW */}
              {Number(restockQuantity) > 0 && (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-emerald-700">
                      Stok setelah restock
                    </span>

                    <span className="text-base font-bold text-emerald-800">
                      {formatNumber(
                        Number(restockItem.current_stock) +
                          Number(restockQuantity),
                      )}{" "}
                      {restockItem.satuan}
                    </span>
                  </div>
                </div>
              )}

              {/* ERROR */}
              {restockError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {restockError}
                </div>
              )}

              {/* ACTION */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeRestockModal}
                  disabled={restockLoading}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={
                    restockLoading ||
                    !restockQuantity ||
                    Number(restockQuantity) <= 0
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {restockLoading ? (
                    "Memproses..."
                  ) : (
                    <>
                      <Plus size={17} />
                      Tambah Stok
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ===============================================================
   FORM FIELD
=============================================================== */

function FormField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block truncate text-xs font-semibold text-slate-700 sm:mb-2 sm:text-sm">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 sm:h-auto sm:px-4 sm:py-2.5 sm:text-sm"
      />
    </label>
  );
}

/* ===============================================================
   NUMBER FIELD
=============================================================== */

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block truncate text-xs font-semibold text-slate-700 sm:mb-2 sm:text-sm">
        {label}
      </span>

      <input
        type="number"
        min="0"
        step="0.001"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 sm:h-auto sm:px-4 sm:py-2.5 sm:text-sm"
      />
    </label>
  );
}

/* ===============================================================
   SUMMARY CARD
=============================================================== */

function SummaryCard({
  label,
  value,
  description,
  icon,
  safe = false,
  warning = false,
  danger = false,
}: {
  label: string;
  value: number;
  description: string;
  icon: ReactNode;
  safe?: boolean;
  warning?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            danger
              ? "bg-red-50 text-red-600"
              : warning
                ? "bg-amber-50 text-amber-600"
                : safe
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-700"
          }`}
        >
          {icon}
        </div>

        <span
          className={`hidden rounded-full px-2 py-1 text-[10px] font-semibold sm:inline-flex ${
            danger
              ? "bg-red-50 text-red-600"
              : warning
                ? "bg-amber-50 text-amber-600"
                : safe
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-500"
          }`}
        >
          {danger
            ? "Action"
            : warning
              ? "Perhatian"
              : safe
                ? "Aman"
                : "Inventory"}
        </span>
      </div>

      <p className="mt-4 text-xs text-slate-500 sm:text-sm">{label}</p>

      <p className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
        {value}
      </p>

      <p className="mt-1 text-[10px] leading-4 text-slate-400 sm:text-xs">
        {description}
      </p>
    </div>
  );
}

/* ===============================================================
   STATUS BADGE
=============================================================== */

function StatusBadge({ status }: { status: StockStatus }) {
  const config = {
    SAFE: {
      label: "Aman",
      className: "bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
    },

    REORDER: {
      label: "Reorder",
      className: "bg-amber-50 text-amber-700",
      icon: AlertTriangle,
    },

    CRITICAL: {
      label: "Kritis",
      className: "bg-red-50 text-red-700",
      icon: AlertTriangle,
    },

    OUT_OF_STOCK: {
      label: "Habis",
      className: "bg-slate-100 text-slate-700",
      icon: XCircle,
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}
    >
      <Icon size={13} />
      {config.label}
    </span>
  );
}

/* ===============================================================
   STOCK STATUS
=============================================================== */

function getStockStatus(
  currentStock: number,
  safetyStock: number,
  reorderPoint: number,
): StockStatus {
  if (currentStock <= 0) {
    return "OUT_OF_STOCK";
  }

  if (currentStock <= safetyStock) {
    return "CRITICAL";
  }

  if (currentStock <= reorderPoint) {
    return "REORDER";
  }

  return "SAFE";
}

/* ===============================================================
   NUMBER FORMAT
=============================================================== */

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 3,
  }).format(value);
}
