"use client";

import { useState } from "react";
import { CheckCircle2, Download, ShieldCheck } from "lucide-react";
import { showToast } from "@/lib/toast";

type DataBackupClientProps = {
  canBackup: boolean;
  workspaceId: string;
};

export function DataBackupClient({
  canBackup,
  workspaceId,
}: DataBackupClientProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadBackup() {
    if (downloading) return;

    if (!canBackup) {
      showToast({
        type: "error",
        title: "Akses ditolak",
        message: "Anda belum memiliki permission untuk membuat backup.",
        duration: 6000,
      });

      return;
    }

    setDownloading(true);

    try {
      const response = await fetch(
        `/api/settings/backup?workspaceId=${encodeURIComponent(workspaceId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        let message = "Terjadi kesalahan saat membuat backup.";

        try {
          const data = await response.json();

          if (typeof data?.message === "string") {
            message = data.message;
          }
        } catch {
          // Abaikan jika response bukan JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      const contentDisposition = response.headers.get("Content-Disposition");

      let filename = "cloud-stock-backup.json";

      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/i);

      if (filenameMatch?.[1]) {
        filename = filenameMatch[1];
      }

      const url = window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);

      showToast({
        type: "success",
        title: "Backup berhasil",
        message: "Data workspace berhasil diunduh sebagai file backup.",
        duration: 6000,
      });
    } catch (error) {
      console.error("Download backup error:", error);

      showToast({
        type: "error",
        title: "Backup gagal",
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat membuat backup.",
        duration: 7000,
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-500/20 dark:bg-blue-500/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
            <Download className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
              Backup Data
            </h3>

            <p className="mt-1 text-xs leading-5 text-blue-800/80 dark:text-blue-300/70">
              Unduh salinan data workspace Anda untuk keperluan keamanan,
              penyimpanan, atau pemulihan data di kemudian hari.
            </p>

            {!canBackup && (
              <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Anda belum memiliki permission untuk membuat backup.
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-blue-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-blue-500/20">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Data bisnis
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-blue-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-blue-500/20">
                <ShieldCheck className="h-3 w-3 text-blue-500" />
                Permission based
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadBackup}
          disabled={!canBackup || downloading}
          className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
        >
          <Download className="h-4 w-4" />

          {downloading ? "Membuat Backup..." : "Download Backup"}
        </button>
      </div>

      <div className="mt-4 border-t border-blue-200/70 pt-3 dark:border-blue-500/10">
        <p className="text-[11px] leading-5 text-blue-700/80 dark:text-blue-300/70">
          Backup mencakup data operasional workspace seperti bahan baku, produk,
          BOM, transaksi, stock movement, arsip transaksi, dan data Trash
          Movement.
        </p>
      </div>
    </div>
  );
}
