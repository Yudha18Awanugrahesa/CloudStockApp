"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Building2,
  CheckCircle2,
  ChevronRight,
  Database,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/lib/toast";
import { DataBackupClient } from "@/components/settings/data-backup-client";
import { DataRestoreClient } from "@/components/settings/data-restore-client";

type WorkspaceData = {
  id: string;
  name: string;
};

type MembershipData = {
  workspace_id: string;
  role: string | null;
};

type SettingsClientProps = {
  userId: string;
  initialEmail: string;
  initialName: string;
  initialWorkspace: WorkspaceData;
  initialMembership: MembershipData;
};

function roleLabel(role: string | null) {
  if (!role) return "Member";

  const value = role.toLowerCase();

  if (value === "owner") return "Owner";
  if (value === "admin" || value === "administrator") return "Administrator";

  return "Member";
}

function getInitials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "CS"
  );
}

export function SettingsClient({
  userId,
  initialEmail,
  initialName,
  initialWorkspace,
  initialMembership,
}: SettingsClientProps) {
  const supabase = useMemo(() => createClient(), []);

  const [workspaceName, setWorkspaceName] = useState(initialWorkspace.name);
  const [profileName, setProfileName] = useState(initialName);

  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  const [showArchiveSalesModal, setShowArchiveSalesModal] = useState(false);
  const [archivingSales, setArchivingSales] = useState(false);
  const [archiveStartDate, setArchiveStartDate] = useState("");
  const [archiveEndDate, setArchiveEndDate] = useState("");

  useEffect(() => {
    setWorkspaceName(initialWorkspace.name);
  }, [initialWorkspace.name]);

  useEffect(() => {
    let cancelled = false;

    async function loadPermissions() {
      if (initialMembership.role?.toLowerCase() === "owner") {
        if (!cancelled) {
          setPermissionsLoading(false);
        }
        return;
      }

      setPermissionsLoading(true);

      try {
        const response = await fetch(
          `/api/me/permissions?workspaceId=${encodeURIComponent(initialWorkspace.id)}`,
          { cache: "no-store" },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || "Gagal memuat permission.");
        }

        if (!cancelled) {
          setPermissions(
            result?.permissions && typeof result.permissions === "object"
              ? result.permissions
              : {},
          );
        }
      } catch (error) {
        console.error("Load settings permissions error:", error);

        if (!cancelled) {
          setPermissions({});
        }
      } finally {
        if (!cancelled) {
          setPermissionsLoading(false);
        }
      }
    }

    void loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [initialMembership.role, initialWorkspace.id]);

  async function handleWorkspaceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isOwner) {
      showToast({
        type: "error",
        title: "Akses ditolak",
        message: "Hanya Owner workspace yang dapat mengubah nama workspace.",
        duration: 6000,
      });
      return;
    }

    const name = workspaceName.trim();

    if (!name) {
      showToast({
        type: "warning",
        title: "Nama workspace belum diisi",
        message: "Masukkan nama workspace terlebih dahulu.",
      });

      return;
    }

    setSavingWorkspace(true);

    try {
      const { error } = await supabase
        .from("workspaces")
        .update({ name })
        .eq("id", initialWorkspace.id);

      if (error) throw error;

      showToast({
        type: "success",
        title: "Workspace diperbarui",
        message: `Nama workspace berubah menjadi "${name}".`,
      });
    } catch (error) {
      console.error(error);

      showToast({
        type: "error",
        title: "Gagal memperbarui workspace",
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menyimpan workspace.",
      });
    } finally {
      setSavingWorkspace(false);
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isOwner) {
      showToast({
        type: "error",
        title: "Akses ditolak",
        message:
          "Pengaturan profil pada halaman ini hanya dapat diubah oleh Owner.",
        duration: 6000,
      });
      return;
    }

    const name = profileName.trim();

    if (!name) {
      showToast({
        type: "warning",
        title: "Nama belum diisi",
        message: "Masukkan nama pengguna terlebih dahulu.",
      });

      return;
    }

    setSavingProfile(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { name },
      });

      if (error) throw error;

      showToast({
        type: "success",
        title: "Profil diperbarui",
        message: "Nama pengguna berhasil disimpan.",
      });
    } catch (error) {
      console.error(error);

      showToast({
        type: "error",
        title: "Gagal memperbarui profil",
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menyimpan profil.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleArchiveSales() {
    if (archivingSales) return;

    if (!canArchive) {
      showToast({
        type: "error",
        title: "Akses ditolak",
        message: "Anda belum memiliki permission untuk melakukan tutup buku.",
        duration: 6000,
      });
      return;
    }

    if (!archiveStartDate || !archiveEndDate) {
      showToast({
        type: "warning",
        title: "Periode belum lengkap",
        message: "Pilih tanggal mulai dan tanggal akhir terlebih dahulu.",
        duration: 6000,
      });
      return;
    }

    if (archiveEndDate < archiveStartDate) {
      showToast({
        type: "warning",
        title: "Periode tidak valid",
        message: "Tanggal akhir harus sama atau setelah tanggal mulai.",
        duration: 6000,
      });
      return;
    }

    setArchivingSales(true);

    try {
      // p_end_at pada RPC bersifat exclusive.
      // Karena user memilih tanggal akhir kalender, tambahkan 1 hari
      // agar seluruh transaksi pada tanggal akhir ikut terarsip.
      const endDate = new Date(`${archiveEndDate}T00:00:00`);
      endDate.setDate(endDate.getDate() + 1);

      const startAt = `${archiveStartDate}T00:00:00`;
      const endAt = endDate.toISOString();

      const { data, error } = await supabase.rpc("archive_sales_period", {
        p_workspace_id: initialWorkspace.id,
        p_start_at: new Date(startAt).toISOString(),
        p_end_at: endAt,
      });

      if (error) {
        throw error;
      }

      setShowArchiveSalesModal(false);

      showToast({
        type: "success",
        title: "Tutup buku berhasil",
        message:
          data?.message ??
          `${data?.archived_count ?? 0} transaksi berhasil dipindahkan ke arsip.`,
        duration: 7000,
      });

      // Reset periode setelah berhasil.
      setArchiveStartDate("");
      setArchiveEndDate("");
    } catch (error) {
      console.error("Archive sales error:", error);

      showToast({
        type: "error",
        title: "Gagal melakukan tutup buku",
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memindahkan transaksi ke arsip.",
        duration: 7000,
      });
    } finally {
      setArchivingSales(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error);

      setLoggingOut(false);

      showToast({
        type: "error",
        title: "Logout gagal",
        message: error.message,
      });

      return;
    }

    window.location.href = "/login";
  }

  const workspaceInitials = getInitials(initialWorkspace.name);

  const displayName =
    profileName.trim() || initialEmail.split("@")[0] || "User";

  const userInitials = getInitials(displayName);

  const currentRole = roleLabel(initialMembership.role);

  const isOwner = initialMembership.role?.toLowerCase() === "owner";

  const canBackup =
    isOwner || (!permissionsLoading && permissions["data.backup"] === true);

  const canRestore =
    isOwner || (!permissionsLoading && permissions["data.restore"] === true);

  const canArchive =
    isOwner || (!permissionsLoading && permissions["data.archive"] === true);

  return (
    <div className="-mt-1 mx-auto w-full max-w-4xl space-y-4 pb-6 sm:space-y-5 lg:-mt-2">
      {/* PAGE INTRO */}
      <section className="lg:hidden">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:ring-blue-500/20">
            <UserRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Sistem
            </p>

            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
              Pengaturan
            </h1>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
              Kelola workspace, profil, dan akses akun Cloud Stock Anda.
            </p>
          </div>
        </div>
      </section>

      {/* WORKSPACE HERO */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20">
                {workspaceInitials}
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Workspace aktif
                </p>

                <h2 className="mt-0.5 truncate text-base font-bold text-slate-950 dark:text-white sm:text-lg">
                  {initialWorkspace.name}
                </h2>
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 sm:flex">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Aktif
            </div>
          </div>
        </div>

        <form onSubmit={handleWorkspaceSubmit} className="p-4">
          <label
            htmlFor="workspace-name"
            className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
          >
            Nama Workspace
          </label>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="min-w-0">
              <input
                id="workspace-name"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                maxLength={80}
                disabled={!isOwner || savingWorkspace}
                readOnly={!isOwner}
                placeholder="Contoh: Toko Saya"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Nama ini digunakan sebagai identitas bisnis/workspace Anda.
              </p>

              {!isOwner && (
                <p className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  Hanya Owner yang dapat mengubah nama workspace.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!isOwner || savingWorkspace}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto md:min-w-[170px]"
            >
              {savingWorkspace ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </section>

      {/* ACCOUNT GRID */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
        {/* PROFILE */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <UserRound className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-950 dark:text-white sm:text-base">
                  Profil Akun
                </h2>

                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Informasi dasar akun yang digunakan untuk masuk.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-3 p-4">
            <div>
              <label
                htmlFor="profile-name"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Nama
              </label>

              <div className="relative">
                <div className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {userInitials}
                </div>

                <input
                  id="profile-name"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  maxLength={80}
                  disabled={!isOwner || savingProfile}
                  readOnly={!isOwner}
                  placeholder="Nama pengguna"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Email
              </label>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="profile-email"
                  value={initialEmail}
                  readOnly
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 text-sm text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400"
                />
              </div>

              <p className="mt-1.5 text-xs text-slate-400">
                Email login tidak diubah dari halaman ini.
              </p>

              {!isOwner && (
                <p className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  Pengaturan akun di halaman ini bersifat read-only untuk
                  Member.
                </p>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="submit"
                disabled={!isOwner || savingProfile}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {savingProfile ? "Menyimpan..." : "Simpan Profil"}
              </button>
            </div>
          </form>
        </section>

        {/* ACCESS */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-950 dark:text-white sm:text-base">
                  Akses & Keamanan
                </h2>

                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Informasi akses akun saat ini.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 p-4">
            <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">Role Workspace</p>

                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {currentRole}
                  </p>
                </div>

                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                  {currentRole}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-400" />

                <div className="min-w-0">
                  <p className="text-xs text-slate-400">Email akun</p>

                  <p className="mt-1 truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                    {initialEmail}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-blue-50 p-3.5 dark:bg-blue-500/10">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />

                <div>
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                    Akses workspace
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-700/80 dark:text-blue-300/70">
                    Akun Anda terhubung dengan workspace aktif dan dapat
                    menggunakan fitur sesuai role yang diberikan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* MEMBER MANAGEMENT */}
      {isOwner && (
        <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm dark:border-blue-500/20 dark:bg-slate-900">
          <div className="border-b border-blue-100 bg-blue-50/60 p-4 dark:border-blue-500/10 dark:bg-blue-500/5 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-950 dark:text-white sm:text-base">
                  Manajemen Anggota
                </h2>

                <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Kelola anggota workspace dan atur permission sesuai kebutuhan
                  pekerjaan.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/30 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-blue-400 dark:ring-slate-700">
                  <ShieldCheck className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Akses & Permission
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Atur fitur yang dapat digunakan oleh setiap Member
                    workspace.
                  </p>
                </div>
              </div>

              <Link
                href="/settings/members"
                className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
              >
                <Users className="h-4 w-4" />
                Kelola Anggota
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* DATA MANAGEMENT */}
      <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm dark:border-amber-500/20 dark:bg-slate-900">
        <div className="border-b border-amber-100 bg-amber-50/60 p-4 dark:border-amber-500/10 dark:bg-amber-500/5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              <Database className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-white sm:text-base">
                Manajemen Data
              </h2>

              <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Kelola dan arsipkan data operasional transaksi pada workspace
                ini.
              </p>

              {permissionsLoading && !isOwner && (
                <p className="mt-2 text-[11px] font-medium text-slate-400">
                  Memuat permission akun...
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4">
          <DataBackupClient
            canBackup={canBackup}
            workspaceId={initialWorkspace.id}
          />

          <DataRestoreClient
            canRestore={canRestore}
            workspaceId={initialWorkspace.id}
          />

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  <Archive className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                    Tutup Buku Transaksi
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-amber-800/80 dark:text-amber-300/70">
                    Pindahkan transaksi pada periode tertentu ke arsip tanpa
                    mengubah stok bahan baku.
                  </p>

                  {!canArchive && !permissionsLoading && (
                    <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Permission Tutup Buku belum diberikan untuk akun ini.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowArchiveSalesModal(true)}
                disabled={!canArchive || archivingSales}
                className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
              >
                <Archive className="h-4 w-4" />
                Tutup Buku
              </button>
            </div>

            <div className="mt-4 grid gap-3 border-t border-amber-200/70 pt-4 dark:border-amber-500/10 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="archive-start-date"
                  className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Tanggal Mulai
                </label>

                <input
                  id="archive-start-date"
                  type="date"
                  value={archiveStartDate}
                  onChange={(event) => setArchiveStartDate(event.target.value)}
                  disabled={!canArchive || archivingSales}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="archive-end-date"
                  className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Tanggal Akhir
                </label>

                <input
                  id="archive-end-date"
                  type="date"
                  value={archiveEndDate}
                  min={archiveStartDate || undefined}
                  onChange={(event) => setArchiveEndDate(event.target.value)}
                  disabled={!canArchive || archivingSales}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900"
                />
              </div>
            </div>

            <div className="mt-3 flex gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />

              <p className="text-[11px] leading-5 text-blue-700 dark:text-blue-300">
                Tutup buku hanya memindahkan transaksi ke arsip. Stok bahan baku
                dan catatan stock movement tidak diubah.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SESSION */}
      <section className="rounded-2xl border border-red-200 bg-white shadow-sm dark:border-red-500/20 dark:bg-slate-900">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <LogOut className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-white sm:text-base">
                Sesi Akun
              </h2>

              <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Keluar dari sesi Cloud Stock pada perangkat ini.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/20 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-500/10 sm:w-auto"
          >
            <LogOut className="h-4 w-4" />

            {loggingOut ? "Keluar..." : "Keluar dari Akun"}
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <div className="flex items-center justify-center gap-1.5 pb-1 text-[11px] text-slate-400">
        Cloud Stock
        <span>•</span>
        Pengaturan Workspace
        <ChevronRight className="h-3 w-3" />
      </div>

      {/* ARCHIVE SALES MODAL */}
      {showArchiveSalesModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-sales-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-5 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2
                    id="archive-sales-title"
                    className="text-base font-bold text-slate-950 dark:text-white"
                  >
                    Tutup Buku Transaksi?
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Transaksi pada periode yang dipilih akan dipindahkan dari
                    transaksi aktif ke arsip.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                  Periode
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {archiveStartDate} sampai {archiveEndDate}
                </p>
              </div>

              <ul className="space-y-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                  Transaksi pada periode tersebut akan dipindahkan ke
                  <strong className="font-semibold"> sales_archive</strong>.
                </li>

                <li className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                  Transaksi tidak lagi muncul pada Riwayat Penjualan aktif.
                </li>

                <li className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                  Stok bahan baku tidak berubah.
                </li>

                <li className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                  Data arsip tetap tersimpan untuk kebutuhan histori.
                </li>
              </ul>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowArchiveSalesModal(false)}
                disabled={archivingSales}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleArchiveSales}
                disabled={archivingSales}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Archive className="h-4 w-4" />
                {archivingSales ? "Memproses..." : "Ya, Tutup Buku"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
