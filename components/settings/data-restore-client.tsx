"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  RotateCcw,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { showToast } from "@/lib/toast";

type BackupData = {
  format?: string;
  version?: number;
  created_at?: string;
  workspace_id?: string;
  workspace?: {
    name?: string;
  };
  metadata?: {
    counts?: Record<string, number>;
  };
};

type DataRestoreClientProps = {
  canRestore: boolean;
  workspaceId: string;
};

export function DataRestoreClient({
  canRestore,
  workspaceId,
}: DataRestoreClientProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [backup, setBackup] = useState<BackupData | null>(null);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [restoring, setRestoring] = useState(false);

  function resetSelection() {
    setFile(null);
    setBackup(null);
    setError("");
    setConfirmed(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    setError("");
    setBackup(null);
    setConfirmed(false);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".json")) {
      setFile(null);
      setError("File backup harus berformat JSON.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setFile(null);
      setError("Ukuran file backup maksimal 5 MB.");
      return;
    }

    setFile(selectedFile);

    try {
      const text = await selectedFile.text();
      const parsed = JSON.parse(text) as BackupData;

      if (parsed.format !== "cloud-stock-backup") {
        throw new Error("File bukan backup resmi Cloud Stock.");
      }

      if (parsed.version !== 1) {
        throw new Error("Version backup tidak didukung.");
      }

      if (parsed.workspace_id !== workspaceId) {
        throw new Error("Backup berasal dari workspace yang berbeda.");
      }

      setBackup(parsed);
    } catch (err) {
      setBackup(null);
      setError(err instanceof Error ? err.message : "File backup tidak valid.");
    }
  }

  async function handleRestore() {
    if (restoring) return;

    if (!canRestore) {
      showToast({
        type: "error",
        title: "Akses ditolak",
        message: "Anda belum memiliki permission untuk melakukan restore.",
        duration: 6000,
      });

      return;
    }

    if (!file || !backup) {
      showToast({
        type: "error",
        title: "Backup belum dipilih",
        message: "Pilih file backup JSON yang valid terlebih dahulu.",
        duration: 6000,
      });

      return;
    }

    if (!confirmed) {
      showToast({
        type: "error",
        title: "Konfirmasi diperlukan",
        message: "Centang konfirmasi sebelum melakukan restore.",
        duration: 6000,
      });

      return;
    }

    const shouldContinue = window.confirm(
      "PERINGATAN!\n\n" +
        "Restore akan mengganti data bisnis workspace saat ini " +
        "dengan data dari file backup.\n\n" +
        "Pastikan Anda sudah memiliki backup kondisi saat ini jika diperlukan.\n\n" +
        "Lanjutkan restore?",
    );

    if (!shouldContinue) {
      return;
    }

    setRestoring(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("workspaceId", workspaceId);
      formData.append("file", file);

      const response = await fetch("/api/settings/restore", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message || "Terjadi kesalahan saat melakukan restore.",
        );
      }

      showToast({
        type: "success",
        title: "Restore berhasil",
        message: "Data backup berhasil dipulihkan ke workspace.",
        duration: 7000,
      });

      resetSelection();

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("Restore backup error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat melakukan restore.";

      setError(message);

      showToast({
        type: "error",
        title: "Restore gagal",
        message,
        duration: 8000,
      });
    } finally {
      setRestoring(false);
    }
  }

  const counts = backup?.metadata?.counts ?? {};

  const countItems = [
    ["Bahan baku", counts.bahan_baku ?? 0],
    ["Produk", counts.products ?? 0],
    ["BOM", counts.product_bom ?? 0],
    ["Penjualan", counts.sales ?? 0],
    ["Sale items", counts.sale_items ?? 0],
    ["Stock alerts", counts.stock_alerts ?? 0],
    ["Stock movements", counts.stock_movements ?? 0],
    ["Movement Trash", counts.stock_movement_trash ?? 0],
    ["Sales archive", counts.sales_archive ?? 0],
  ];

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-500/20 dark:bg-red-500/5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
            <RotateCcw className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-300">
              Restore Backup
            </h3>

            <p className="mt-1 text-xs leading-5 text-red-800/80 dark:text-red-300/70">
              Pulihkan data bisnis workspace dari file backup Cloud Stock.
            </p>

            {!canRestore && (
              <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Anda belum memiliki permission untuk melakukan restore.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-white p-4 dark:border-red-500/20 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />

            <div>
              <p className="text-xs font-semibold text-red-800 dark:text-red-300">
                Perhatian sebelum Restore
              </p>

              <p className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-400">
                Data bisnis yang ada saat ini akan digantikan oleh data dari
                backup. Workspace members dan akun login tidak akan diubah.
              </p>
            </div>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        {!file ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!canRestore || restoring}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            <Upload className="h-4 w-4" />
            Pilih File Backup
          </button>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <FileJson className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {file.name}
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>

              <button
                type="button"
                onClick={resetSelection}
                disabled={restoring}
                className="text-xs font-medium text-slate-500 hover:text-red-600"
              >
                Ganti
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-100/70 p-3 text-xs leading-5 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        {backup && !error && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Backup valid
                </p>

                <p className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-300/70">
                  Workspace: {backup.workspace?.name ?? "Cloud Stock"}
                </p>

                {backup.created_at && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Dibuat:{" "}
                    {new Date(backup.created_at).toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {countItems.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg bg-white px-3 py-2 ring-1 ring-emerald-100 dark:bg-slate-900 dark:ring-emerald-500/10"
                >
                  <p className="text-[10px] text-slate-500">{label}</p>

                  <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {backup && !error && (
          <>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/5">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                disabled={restoring}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />

              <span className="text-[11px] leading-5 text-amber-800 dark:text-amber-300">
                Saya memahami bahwa data bisnis workspace saat ini akan
                digantikan dengan data dari backup yang dipilih.
              </span>
            </label>

            <button
              type="button"
              onClick={handleRestore}
              disabled={!canRestore || !confirmed || restoring}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {restoring ? (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin" />
                  Memulihkan Data...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Restore Backup
                </>
              )}
            </button>
          </>
        )}

        <div className="border-t border-red-200/70 pt-3 dark:border-red-500/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />

            <p className="text-[10px] leading-5 text-slate-500 dark:text-slate-400">
              Disarankan membuat Download Backup terbaru sebelum melakukan
              Restore.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
