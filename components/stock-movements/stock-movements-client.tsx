"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Search,
  Package,
  Trash2,
  RotateCcw,
  X,
  AlertTriangle,
  Clock3,
  Archive,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Movement = {
  id: string;
  bahan_baku_id: string;
  movement_type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  bahan_nama: string;
  bahan_sku: string | null;
  bahan_satuan: string;
};

type Props = {
  movements: Movement[];
};

type MovementFilter = "ALL" | "IN" | "OUT";

type TrashMovement = {
  id: string;
  workspace_id: string;
  archive_batch_id: string;
  original_movement_id: string;
  bahan_baku_id: string;
  movement_type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  original_created_at: string;
  deleted_at: string;
  expires_at: string;
};

type TrashBatch = {
  batchId: string;
  count: number;
  deletedAt: string;
  expiresAt: string;
  movements: TrashMovement[];
};

type Notification = {
  type: "success" | "error";
  message: string;
};

export function StockMovementsClient({ movements }: Props) {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MovementFilter>("ALL");
  const [bahanFilter, setBahanFilter] = useState(
    searchParams.get("bahan_id") ?? "ALL",
  );

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  const [trashBatches, setTrashBatches] = useState<TrashBatch[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState<string | null>(null);
  const [permanentDeleteLoading, setPermanentDeleteLoading] = useState<
    string | null
  >(null);

  const [notification, setNotification] = useState<Notification | null>(null);

  const totalMovement = movements.length;

  const stockIn = movements.filter(
    (movement) => movement.movement_type === "in",
  ).length;

  const stockOut = movements.filter(
    (movement) => movement.movement_type === "out",
  ).length;

  const bahanOptions = useMemo(() => {
    const map = new Map<string, { id: string; nama: string }>();

    movements.forEach((movement) => {
      if (!map.has(movement.bahan_baku_id)) {
        map.set(movement.bahan_baku_id, {
          id: movement.bahan_baku_id,
          nama: movement.bahan_nama,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.nama.localeCompare(b.nama, "id"),
    );
  }, [movements]);

  const filteredMovements = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return movements.filter((movement) => {
      const matchesSearch =
        !keyword ||
        movement.bahan_nama.toLowerCase().includes(keyword) ||
        (movement.bahan_sku ?? "").toLowerCase().includes(keyword) ||
        (movement.notes ?? "").toLowerCase().includes(keyword) ||
        (movement.reference_type ?? "").toLowerCase().includes(keyword);

      const matchesType =
        typeFilter === "ALL" ||
        (typeFilter === "IN" && movement.movement_type === "in") ||
        (typeFilter === "OUT" && movement.movement_type === "out");

      const matchesBahan =
        bahanFilter === "ALL" || movement.bahan_baku_id === bahanFilter;

      return matchesSearch && matchesType && matchesBahan;
    });
  }, [movements, search, typeFilter, bahanFilter]);

  const groupedMovements = useMemo(() => {
    const groups = new Map<
      string,
      {
        id: string;
        nama: string;
        sku: string | null;
        satuan: string;
        movements: Movement[];
      }
    >();

    filteredMovements.forEach((movement) => {
      const existing = groups.get(movement.bahan_baku_id);

      if (existing) {
        existing.movements.push(movement);
      } else {
        groups.set(movement.bahan_baku_id, {
          id: movement.bahan_baku_id,
          nama: movement.bahan_nama,
          sku: movement.bahan_sku,
          satuan: movement.bahan_satuan,
          movements: [movement],
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) =>
      a.nama.localeCompare(b.nama, "id"),
    );
  }, [filteredMovements]);

  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message });

    window.setTimeout(() => {
      setNotification(null);
    }, 4000);
  }

  async function loadTrash() {
    setTrashLoading(true);

    try {
      // Membersihkan data yang sudah melewati 30 hari.
      // Fungsi database hanya menghapus data yang sudah expired.
      const { error: cleanupError } = await supabase.rpc(
        "cleanup_expired_stock_movement_trash",
      );

      if (cleanupError) {
        console.warn("Cleanup trash:", cleanupError.message);
      }

      const { data, error } = await supabase
        .from("stock_movement_trash")
        .select(
          `
            id,
            workspace_id,
            archive_batch_id,
            original_movement_id,
            bahan_baku_id,
            movement_type,
            quantity,
            reference_type,
            reference_id,
            notes,
            created_by,
            original_created_at,
            deleted_at,
            expires_at
          `,
        )
        .order("deleted_at", { ascending: false });

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as TrashMovement[];

      const map = new Map<string, TrashBatch>();

      rows.forEach((movement) => {
        const existing = map.get(movement.archive_batch_id);

        if (existing) {
          existing.count += 1;
          existing.movements.push(movement);

          if (
            new Date(movement.deleted_at).getTime() >
            new Date(existing.deletedAt).getTime()
          ) {
            existing.deletedAt = movement.deleted_at;
          }

          if (
            new Date(movement.expires_at).getTime() <
            new Date(existing.expiresAt).getTime()
          ) {
            existing.expiresAt = movement.expires_at;
          }
        } else {
          map.set(movement.archive_batch_id, {
            batchId: movement.archive_batch_id,
            count: 1,
            deletedAt: movement.deleted_at,
            expiresAt: movement.expires_at,
            movements: [movement],
          });
        }
      });

      setTrashBatches(Array.from(map.values()));
    } catch (error) {
      console.error(error);

      showNotification(
        "error",
        error instanceof Error
          ? error.message
          : "Gagal memuat Sampah Movement.",
      );
    } finally {
      setTrashLoading(false);
    }
  }

  async function openTrash() {
    setTrashOpen(true);
    await loadTrash();
  }

  async function handleDeleteAllMovements() {
    setDeleteLoading(true);

    try {
      const { data, error } = await supabase.rpc(
        "move_all_stock_movements_to_trash",
        {
        p_confirm: true,  
        }
      );

      if (error) {
        throw error;
      }

      const result = Array.isArray(data) ? data[0] : data;

      setDeleteConfirmOpen(false);

      if (result?.deleted_count === 0) {
        showNotification(
          "success",
          "Tidak ada riwayat movement yang perlu dihapus.",
        );
      } else {
        showNotification(
          "success",
          `${result?.deleted_count ?? 0} movement dipindahkan ke Sampah.`,
        );
      }

      window.location.reload();
    } catch (error) {
      console.error(error);

      const errorValue = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
      const message =
      typeof errorValue?.message === "string"
        ? errorValue.message
        : typeof errorValue?.details === "string"
          ? errorValue.details
          : error instanceof Error
            ? error.message
            : "Gagal menghapus riwayat movement.";

    showNotification("error", message);
  } finally {
    setDeleteLoading(false);
  }
}

  async function handleRestore(batchId: string) {
    setRestoreLoading(batchId);

    try {
      const { data, error } = await supabase.rpc(
        "restore_stock_movement_batch",
        {
          p_archive_batch_id: batchId,
        },
      );

      if (error) {
        throw error;
      }

      const result = Array.isArray(data) ? data[0] : data;

      showNotification(
        "success",
        `${result?.restored_count ?? 0} movement berhasil dipulihkan.`,
      );

      await loadTrash();

      window.location.reload();
    } catch (error) {
      console.error(error);

      showNotification(
        "error",
        error instanceof Error ? error.message : "Gagal memulihkan movement.",
      );
    } finally {
      setRestoreLoading(null);
    }
  }

  async function handlePermanentDelete(batchId: string) {
    const confirmed = window.confirm(
      "Hapus permanen batch movement ini?\n\nData tidak dapat dipulihkan kembali.",
    );

    if (!confirmed) {
      return;
    }

    setPermanentDeleteLoading(batchId);

    try {
      const { data, error } = await supabase.rpc(
        "permanently_delete_stock_movement_batch",
        {
          p_archive_batch_id: batchId,
        },
      );

      if (error) {
        throw error;
      }

      const result = Array.isArray(data) ? data[0] : data;

      showNotification(
        "success",
        `${result?.deleted_count ?? 0} movement dihapus permanen.`,
      );

      await loadTrash();
    } catch (error) {
      console.error(error);

      showNotification(
        "error",
        error instanceof Error
          ? error.message
          : "Gagal menghapus movement secara permanen.",
      );
    } finally {
      setPermanentDeleteLoading(null);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        {/* HEADER */}
        <section>
          <div className="mt-1 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 sm:flex">
                <History size={20} />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Inventory
                </p>

                <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Movement Bahan Baku
                </h1>

                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Riwayat pergerakan stok bahan baku.
                </p>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={openTrash}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:h-11 sm:px-4 sm:text-sm"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Sampah</span>
              </button>

              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={movements.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:px-4 sm:text-sm"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Hapus Riwayat Movement</span>
                <span className="sm:hidden">Hapus</span>
              </button>
            </div>
          </div>
        </section>

        {/* SUMMARY */}
        <section className="grid grid-cols-3 gap-2 sm:gap-4">
          <MovementSummary
            label="Total Movement"
            value={totalMovement}
            icon={<History size={17} />}
            tone="neutral"
          />

          <MovementSummary
            label="Stok Masuk"
            value={stockIn}
            icon={<ArrowUpCircle size={17} />}
            tone="in"
          />

          <MovementSummary
            label="Stok Keluar"
            value={stockOut}
            icon={<ArrowDownCircle size={17} />}
            tone="out"
          />
        </section>

        {/* FILTER */}
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari bahan, SKU, atau catatan..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5 sm:h-11 sm:text-sm"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as MovementFilter)
              }
              aria-label="Filter tipe movement"
              className="h-10 w-[88px] shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 sm:h-11 sm:w-32 sm:px-3 sm:text-sm"
            >
              <option value="ALL">Tipe</option>
              <option value="IN">Masuk</option>
              <option value="OUT">Keluar</option>
            </select>

            <select
              value={bahanFilter}
              onChange={(event) => setBahanFilter(event.target.value)}
              aria-label="Filter bahan baku"
              className="h-10 w-[88px] shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 sm:h-11 sm:w-40 sm:px-3 sm:text-sm"
            >
              <option value="ALL">Bahan</option>
              {bahanOptions.map((bahan) => (
                <option key={bahan.id} value={bahan.id}>
                  {bahan.nama}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* MOVEMENT HISTORY */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Riwayat
              </p>

              <h2 className="mt-1 text-sm font-semibold text-slate-950 sm:text-base">
                Pergerakan Stok
              </h2>
            </div>

            <p className="text-xs text-slate-400">
              {filteredMovements.length} movement
            </p>
          </div>

          {groupedMovements.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {groupedMovements.map((group) => (
                <div
                  key={group.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* BAHAN HEADER */}
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                        <Package size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 sm:text-[15px]">
                          {group.nama}
                        </p>

                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400 sm:text-xs">
                          {group.sku && <span>{group.sku}</span>}
                          {group.sku && <span>·</span>}
                          <span>{group.movements.length} movement</span>
                        </div>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-sm sm:text-xs">
                      {group.satuan}
                    </span>
                  </div>

                  {/* RIWAYAT PER BAHAN */}
                  <div className="divide-y divide-slate-100">
                    {group.movements.map((movement) => {
                      const isIn = movement.movement_type === "in";

                      return (
                        <div
                          key={movement.id}
                          className="px-4 py-3.5 sm:px-5 sm:py-4"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                isIn
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {isIn ? (
                                <ArrowUpCircle size={17} />
                              ) : (
                                <ArrowDownCircle size={17} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 sm:text-sm">
                                    {getMovementTitle(movement)}
                                  </p>

                                  <p className="mt-0.5 truncate text-[10px] leading-4 text-slate-400 sm:text-xs">
                                    {movement.notes ||
                                      getReferenceLabel(
                                        movement.reference_type,
                                      )}
                                  </p>
                                </div>

                                <p
                                  className={`shrink-0 text-sm font-bold sm:text-base ${
                                    isIn ? "text-emerald-600" : "text-red-600"
                                  }`}
                                >
                                  {isIn ? "+" : "-"}
                                  {formatNumber(movement.quantity)}{" "}
                                  {group.satuan}
                                </p>
                              </div>

                              <p className="mt-1.5 text-[10px] text-slate-400 sm:text-xs">
                                {formatDate(movement.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* NOTIFICATION */}
      {notification && (
        <div className="fixed bottom-4 left-4 right-4 z-[100] sm:left-auto sm:w-[380px]">
          <div
            className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl ${
              notification.type === "success"
                ? "border-emerald-200"
                : "border-red-200"
            }`}
          >
            <div
              className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                notification.type === "success"
                  ? "bg-emerald-500"
                  : "bg-red-500"
              }`}
            />

            <p className="min-w-0 flex-1 text-sm font-medium text-slate-700">
              {notification.message}
            </p>

            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-700"
              aria-label="Tutup notifikasi"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <AlertTriangle size={20} />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    Apa Anda yakin?
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Hapus seluruh riwayat movement?
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleteLoading}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                <p className="text-xs leading-5 text-amber-800">
                  Seluruh riwayat movement akan dipindahkan ke{" "}
                  <strong>Sampah</strong>. Data tidak langsung dihapus permanen
                  dan dapat dipulihkan selama 30 hari.
                </p>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Penghapusan riwayat ini tidak mengubah stok bahan baku saat ini.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleteLoading}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDeleteAllMovements}
                disabled={deleteLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={15} />
                {deleteLoading ? "Memindahkan..." : "Ya, Hapus Riwayat"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRASH */}
      {trashOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-5">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* TRASH HEADER */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Trash2 size={19} />
                </div>

                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-950 sm:text-lg">
                    Sampah Movement
                  </h3>

                  <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                    Riwayat yang dihapus tersimpan selama 30 hari.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTrashOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup Sampah"
              >
                <X size={19} />
              </button>
            </div>

            {/* TRASH CONTENT */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {trashLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />

                  <p className="mt-3 text-sm font-medium text-slate-600">
                    Memuat Sampah...
                  </p>
                </div>
              ) : trashBatches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                    <Archive size={21} />
                  </div>

                  <h4 className="mt-4 text-sm font-semibold text-slate-800">
                    Sampah kosong
                  </h4>

                  <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
                    Movement yang dihapus akan muncul di sini dan dapat
                    dipulihkan selama 30 hari.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trashBatches.map((batch) => (
                    <TrashBatchCard
                      key={batch.batchId}
                      batch={batch}
                      restoreLoading={restoreLoading === batch.batchId}
                      permanentDeleteLoading={
                        permanentDeleteLoading === batch.batchId
                      }
                      onRestore={() => handleRestore(batch.batchId)}
                      onPermanentDelete={() =>
                        handlePermanentDelete(batch.batchId)
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {/* TRASH FOOTER */}
            <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] text-slate-400 sm:text-xs">
                  {trashBatches.length} batch tersimpan
                </p>

                <button
                  type="button"
                  onClick={() => setTrashOpen(false)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:text-sm"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TrashBatchCard({
  batch,
  restoreLoading,
  permanentDeleteLoading,
  onRestore,
  onPermanentDelete,
}: {
  batch: TrashBatch;
  restoreLoading: boolean;
  permanentDeleteLoading: boolean;
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                {batch.count} movement
              </span>

              <span className="text-[10px] text-slate-400">Batch</span>
            </div>

            <p className="mt-2 break-all text-[10px] font-mono text-slate-400">
              {batch.batchId}
            </p>
          </div>

          <div className="shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-600">
              <Clock3 size={13} />
              Berlaku sampai {formatDate(batch.expiresAt)}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <TrashInfo label="Dihapus" value={formatDate(batch.deletedAt)} />

          <TrashInfo label="Kadaluarsa" value={formatDate(batch.expiresAt)} />

          <TrashInfo
            label="Jumlah"
            value={`${batch.count} movement`}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
        {batch.movements.slice(0, 10).map((movement) => {
          const isIn = movement.movement_type === "in";

          return (
            <div
              key={movement.id}
              className="flex items-center gap-3 px-4 py-3 sm:px-5"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isIn
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {isIn ? (
                  <ArrowUpCircle size={15} />
                ) : (
                  <ArrowDownCircle size={15} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-700">
                  {isIn ? "Stok masuk" : "Stok keluar"}
                </p>

                <p className="mt-0.5 truncate text-[10px] text-slate-400">
                  {movement.notes || getReferenceLabel(movement.reference_type)}
                </p>
              </div>

              <div
                className={`shrink-0 text-xs font-bold ${
                  isIn ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {isIn ? "+" : "-"}
                {formatNumber(movement.quantity)}
              </div>
            </div>
          );
        })}

        {batch.movements.length > 10 && (
          <div className="px-4 py-2.5 text-center text-[10px] text-slate-400">
            +{batch.movements.length - 10} movement lainnya
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
        <button
          type="button"
          onClick={onPermanentDelete}
          disabled={restoreLoading || permanentDeleteLoading}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={14} />
          {permanentDeleteLoading ? "Menghapus..." : "Hapus Permanen"}
        </button>

        <button
          type="button"
          onClick={onRestore}
          disabled={restoreLoading || permanentDeleteLoading}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={14} />
          {restoreLoading ? "Memulihkan..." : "Restore"}
        </button>
      </div>
    </div>
  );
}

function TrashInfo({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 ${className}`}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-[10px] font-medium leading-4 text-slate-600">
        {value}
      </p>
    </div>
  );
}

function MovementSummary({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "neutral" | "in" | "out";
}) {
  const iconClass =
    tone === "in"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "out"
        ? "bg-red-50 text-red-600"
        : "bg-slate-100 text-slate-600";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${iconClass}`}
      >
        {icon}
      </div>

      <p className="mt-3 text-[10px] leading-4 text-slate-500 sm:mt-4 sm:text-sm">
        {label}
      </p>

      <p className="mt-0.5 text-lg font-bold tracking-tight text-slate-950 sm:text-2xl">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-12 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <History size={20} />
      </div>

      <h3 className="mt-3 text-sm font-semibold text-slate-800">
        Tidak ada movement
      </h3>

      <p className="mt-1 text-xs text-slate-400">
        Belum ada riwayat yang sesuai dengan filter.
      </p>
    </div>
  );
}

function getMovementTitle(movement: Movement) {
  if (movement.movement_type === "in") {
    return movement.reference_type === "restock"
      ? "Stok masuk · Restock"
      : "Stok masuk";
  }

  return movement.reference_type === "sale"
    ? "Stok keluar · Penjualan"
    : "Stok keluar";
}

function getReferenceLabel(referenceType: string | null) {
  const labels: Record<string, string> = {
    restock: "Penambahan stok",
    sale: "Pengurangan stok dari penjualan",
    adjustment: "Penyesuaian stok",
  };

  return labels[referenceType ?? ""] ?? "Pergerakan stok";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 3,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}
