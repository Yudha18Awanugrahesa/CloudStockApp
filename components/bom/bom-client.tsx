"use client";

import { FormEvent, useMemo, useState } from "react";

import { ChefHat, Edit3, Plus, Trash2, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

// ============================================================
// TYPES
// ============================================================

type Product = {
  id: string;
  workspace_id: string;
  nama: string;
  sku: string | null;
  kategori: string | null;
  harga_jual: number;
  stok_produk: number;
  aktif: boolean;
};

type BahanBaku = {
  id: string;
  workspace_id: string;
  nama: string;
  sku: string | null;
  satuan: string;
  harga_satuan: number;
  current_stock: number;
};

type BomRow = {
  id: string;
  workspace_id: string;
  product_id: string;
  bahan_baku_id: string;
  quantity: number;
  created_at: string;
};

type BomClientProps = {
  initialProducts: Product[];
  initialBahanBaku: BahanBaku[];
  initialBomRows: BomRow[];
  workspaceId: string;
};

// ============================================================
// FORMAT
// ============================================================

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 3,
  }).format(value);
};

const formatRupiah = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

// ============================================================
// COMPONENT
// ============================================================

export function BomClient({
  initialProducts,
  initialBahanBaku,
  initialBomRows,
  workspaceId,
}: BomClientProps) {
  const supabase = createClient();

  // ==========================================================
  // STATE
  // ==========================================================

  const [products, setProducts] = useState<Product[]>(initialProducts);

  const [bahanBaku, setBahanBaku] = useState<BahanBaku[]>(initialBahanBaku);

  const [bomRows, setBomRows] = useState<BomRow[]>(initialBomRows);

  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProducts[0]?.id ?? "",
  );

  const [showModal, setShowModal] = useState(false);

  const [editingRow, setEditingRow] = useState<BomRow | null>(null);

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");

  // ==========================================================
  // FORM
  // ==========================================================

  const [form, setForm] = useState({
    bahan_baku_id: "",
    quantity: "",
  });

  // ==========================================================
  // SELECTED PRODUCT
  // ==========================================================

  const selectedProduct = useMemo(() => {
    return products.find((product) => product.id === selectedProductId);
  }, [products, selectedProductId]);

  // ==========================================================
  // SELECTED PRODUCT BOM
  // ==========================================================

  const selectedBomRows = useMemo(() => {
    return bomRows.filter((row) => row.product_id === selectedProductId);
  }, [bomRows, selectedProductId]);

  // ==========================================================
  // MAP BAHAN
  // ==========================================================

  const bahanMap = useMemo(() => {
    return new Map(bahanBaku.map((item) => [item.id, item]));
  }, [bahanBaku]);

  // ==========================================================
  // AVAILABLE BAHAN
  // ==========================================================

  const availableBahan = useMemo(() => {
    const usedIds = new Set(selectedBomRows.map((row) => row.bahan_baku_id));

    return bahanBaku.filter(
      (bahan) =>
        !usedIds.has(bahan.id) || editingRow?.bahan_baku_id === bahan.id,
    );
  }, [bahanBaku, selectedBomRows, editingRow]);

  // ==========================================================
  // TOTAL RECIPE COST
  // ==========================================================

  const totalRecipeCost = useMemo(() => {
    return selectedBomRows.reduce((total, row) => {
      const bahan = bahanMap.get(row.bahan_baku_id);

      if (!bahan) {
        return total;
      }

      return total + Number(bahan.harga_satuan) * Number(row.quantity);
    }, 0);
  }, [selectedBomRows, bahanMap]);

  // ==========================================================
  // OPEN ADD
  // ==========================================================

  function openAddModal() {
    setEditingRow(null);

    setForm({
      bahan_baku_id: availableBahan[0]?.id ?? "",
      quantity: "",
    });

    setError("");

    setShowModal(true);
  }

  // ==========================================================
  // OPEN EDIT
  // ==========================================================

  function openEditModal(row: BomRow) {
    setEditingRow(row);

    setForm({
      bahan_baku_id: row.bahan_baku_id,
      quantity: String(row.quantity),
    });

    setError("");

    setShowModal(true);
  }

  // ==========================================================
  // CLOSE MODAL
  // ==========================================================

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);

    setEditingRow(null);

    setForm({
      bahan_baku_id: "",
      quantity: "",
    });

    setError("");
  }

  // ==========================================================
  // UPDATE FORM
  // ==========================================================

  function updateForm(field: "bahan_baku_id" | "quantity", value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // ==========================================================
  // SUBMIT BOM
  // ==========================================================

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    // --------------------------------------------------------
    // VALIDASI BAHAN
    // --------------------------------------------------------

    if (!form.bahan_baku_id) {
      setError("Bahan baku wajib dipilih.");

      return;
    }

    // --------------------------------------------------------
    // VALIDASI QUANTITY
    // --------------------------------------------------------

    const quantity = Number(form.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity harus lebih besar dari 0.");

      return;
    }

    if (!selectedProductId) {
      setError("Produk belum dipilih.");

      return;
    }

    // --------------------------------------------------------
    // CEK DUPLIKAT
    // --------------------------------------------------------

    const duplicate = bomRows.some(
      (row) =>
        row.product_id === selectedProductId &&
        row.bahan_baku_id === form.bahan_baku_id &&
        row.id !== editingRow?.id,
    );

    if (duplicate) {
      setError("Bahan baku tersebut sudah ada di resep produk ini.");

      return;
    }

    setSaving(true);

    try {
      // ======================================================
      // UPDATE
      // ======================================================

      if (editingRow) {
        const { data, error } = await supabase
          .from("product_bom")
          .update({
            bahan_baku_id: form.bahan_baku_id,
            quantity,
          })
          .eq("id", editingRow.id)
          .eq("workspace_id", workspaceId)
          .select(
            `
                id,
                workspace_id,
                product_id,
                bahan_baku_id,
                quantity,
                created_at
              `,
          )
          .single();

        if (error) {
          throw error;
        }

        setBomRows((current) =>
          current.map((row) => (row.id === editingRow.id ? data : row)),
        );
      }

      // ======================================================
      // INSERT
      // ======================================================
      else {
        const { data, error } = await supabase
          .from("product_bom")
          .insert({
            workspace_id: workspaceId,
            product_id: selectedProductId,
            bahan_baku_id: form.bahan_baku_id,
            quantity,
          })
          .select(
            `
                id,
                workspace_id,
                product_id,
                bahan_baku_id,
                quantity,
                created_at
              `,
          )
          .single();

        if (error) {
          throw error;
        }

        setBomRows((current) => [...current, data]);
      }

      closeModal();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error ? error.message : "Gagal menyimpan resep.",
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // DELETE BOM
  // ==========================================================

  async function handleDelete(row: BomRow) {
    const bahan = bahanMap.get(row.bahan_baku_id);

    const confirmed = window.confirm(
      `Hapus "${bahan?.nama ?? "bahan"}" dari resep "${selectedProduct?.nama ?? "produk"}"?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(row.id);

    setError("");

    try {
      const { error } = await supabase
        .from("product_bom")
        .delete()
        .eq("id", row.id)
        .eq("workspace_id", workspaceId);

      if (error) {
        throw error;
      }

      setBomRows((current) => current.filter((item) => item.id !== row.id));
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error ? error.message : "Gagal menghapus resep.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">
      {/* ====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <ChefHat className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                BOM / Resep
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Atur komposisi bahan baku untuk setiap produk.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div>
            <p className="font-semibold">Terjadi kesalahan</p>

            <p className="mt-1">{error}</p>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            className="rounded-lg p-1 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ====================================================
          MAIN LAYOUT
      ===================================================== */}

      <div className="grid gap-4 lg:grid-cols-[300px_1fr] lg:gap-6">
        {/* ==================================================
            PRODUCT LIST
        =================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Produk
              </p>

              <h2 className="mt-1 text-sm font-semibold text-slate-950 sm:text-base">
                Pilih produk
              </h2>
            </div>

            {selectedProduct && (
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                {selectedBomRows.length} bahan
              </span>
            )}
          </div>

          <select
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            aria-label="Pilih produk"
            className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5"
          >
            <option value="">Pilih produk...</option>

            {products.map((product) => {
              const recipeCount = bomRows.filter(
                (row) => row.product_id === product.id,
              ).length;

              return (
                <option key={product.id} value={product.id}>
                  {product.nama}
                  {product.sku ? ` · ${product.sku}` : ""}
                  {" — "}
                  {recipeCount} bahan
                </option>
              );
            })}
          </select>
        </div>

        {/* ==================================================
            RECIPE DETAIL
        =================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Recipe Header */}

          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Resep Produk
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950">
                {selectedProduct?.nama ?? "Pilih produk"}
              </h2>

              {selectedProduct && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {selectedProduct.sku && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {selectedProduct.sku}
                    </span>
                  )}

                  {selectedProduct.kategori && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {selectedProduct.kategori}
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={openAddModal}
              disabled={!selectedProductId || availableBahan.length === 0}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 sm:h-auto sm:px-4 sm:py-2.5 sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              Tambah Bahan
            </button>
          </div>

          {/* =================================================
              SUMMARY
          ================================================== */}

          <div className="grid grid-cols-3 gap-2 border-b border-slate-100 p-4 sm:gap-3 sm:p-5">
            <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
              <p className="text-xs text-slate-400">Jumlah Bahan</p>

              <p className="mt-1 text-xl font-bold text-slate-950">
                {selectedBomRows.length}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
              <p className="text-xs text-slate-400">Estimasi HPP Bahan</p>

              <p className="mt-1 text-xl font-bold text-slate-950">
                {formatRupiah(totalRecipeCost)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
              <p className="text-xs text-slate-400">Harga Jual</p>

              <p className="mt-1 text-xl font-bold text-slate-950">
                {selectedProduct
                  ? formatRupiah(Number(selectedProduct.harga_jual))
                  : "Rp0"}
              </p>
            </div>
          </div>

          {/* =================================================
              RECIPE TABLE
          ================================================== */}

          {selectedBomRows.length === 0 ? (
            <div className="p-8 text-center sm:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ChefHat className="h-6 w-6" />
              </div>

              <h3 className="mt-4 font-semibold text-slate-800">
                Belum ada resep
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Tambahkan bahan baku yang digunakan untuk membuat produk ini.
              </p>

              <button
                type="button"
                onClick={openAddModal}
                disabled={availableBahan.length === 0}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Tambah Bahan
              </button>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/70">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Bahan Baku
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Quantity
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Satuan
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Estimasi Biaya
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {selectedBomRows.map((row) => {
                      const bahan = bahanMap.get(row.bahan_baku_id);
                      const biaya = bahan
                        ? Number(bahan.harga_satuan) * Number(row.quantity)
                        : 0;

                      return (
                        <tr
                          key={row.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {bahan?.nama ?? "Bahan tidak ditemukan"}
                            </p>
                            {bahan?.sku && (
                              <p className="mt-0.5 text-xs text-slate-400">
                                SKU: {bahan.sku}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-slate-900">
                            {formatNumber(Number(row.quantity))}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {bahan?.satuan ?? "-"}
                          </td>

                          <td className="px-5 py-4 text-right font-medium text-slate-700">
                            {formatRupiah(biaya)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(row)}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                title="Edit"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(row)}
                                disabled={deletingId === row.id}
                                className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                                title="Hapus"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-200 md:hidden">
                {selectedBomRows.map((row, index) => {
                  const bahan = bahanMap.get(row.bahan_baku_id);
                  const biaya = bahan
                    ? Number(bahan.harga_satuan) * Number(row.quantity)
                    : 0;

                  return (
                    <div key={row.id} className="bg-white px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">
                              {index + 1}
                            </span>

                            <p className="truncate text-sm font-semibold text-slate-900">
                              {bahan?.nama ?? "Bahan tidak ditemukan"}
                            </p>
                          </div>

                          {bahan?.sku && (
                            <p className="mt-1 pl-8 text-[11px] text-slate-400">
                              SKU: {bahan.sku}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            disabled={deletingId === row.id}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Quantity
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatNumber(Number(row.quantity))}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Satuan
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                            {bahan?.satuan ?? "-"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Biaya
                          </p>
                          <p className="mt-1 truncate text-sm font-bold text-slate-900">
                            {formatRupiah(biaya)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}

            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-950">
                  {editingRow ? "Edit Bahan Resep" : "Tambah Bahan Resep"}
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Produk: {selectedProduct?.nama ?? "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              {/* Error */}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Bahan */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Bahan Baku
                </label>

                <select
                  value={form.bahan_baku_id}
                  onChange={(event) =>
                    updateForm("bahan_baku_id", event.target.value)
                  }
                  disabled={Boolean(editingRow)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                >
                  <option value="">Pilih bahan baku</option>

                  {availableBahan.map((bahan) => (
                    <option key={bahan.id} value={bahan.id}>
                      {bahan.nama} {bahan.sku ? `(${bahan.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Quantity per Produk
                </label>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.quantity}
                    onChange={(event) =>
                      updateForm("quantity", event.target.value)
                    }
                    placeholder="Contoh: 18"
                    className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />

                  <div className="flex h-11 min-w-24 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-medium text-slate-600">
                    {form.bahan_baku_id
                      ? (bahanMap.get(form.bahan_baku_id)?.satuan ?? "-")
                      : "-"}
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Masukkan kebutuhan bahan untuk menghasilkan 1 unit produk.
                </p>
              </div>

              {/* Current Stock */}

              {form.bahan_baku_id && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Stok bahan saat ini
                    </span>

                    <span className="text-sm font-semibold text-slate-900">
                      {formatNumber(
                        Number(
                          bahanMap.get(form.bahan_baku_id)?.current_stock ?? 0,
                        ),
                      )}{" "}
                      {bahanMap.get(form.bahan_baku_id)?.satuan}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />

                      {editingRow ? "Simpan Perubahan" : "Tambah Bahan"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
