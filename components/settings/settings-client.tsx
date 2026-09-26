"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/lib/toast";

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

  useEffect(() => {
    setWorkspaceName(initialWorkspace.name);
  }, [initialWorkspace.name]);

  async function handleWorkspaceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

  return (
    <div className="-mt-1 mx-auto w-full max-w-5xl space-y-5 pb-6 sm:space-y-6 lg:-mt-2">
      {/* PAGE INTRO
          Dashboard shell already shows "Pengaturan" on desktop.
          Keep this compact page intro for mobile only. */}
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
        <div className="border-b border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/30 sm:p-5">
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

        <form onSubmit={handleWorkspaceSubmit} className="p-4 sm:p-5">
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
                disabled={savingWorkspace}
                placeholder="Contoh: Toko Saya"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Nama ini digunakan sebagai identitas bisnis/workspace Anda.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingWorkspace}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto md:min-w-[170px]"
            >
              {savingWorkspace ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </section>

      {/* ACCOUNT GRID */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
        {/* PROFILE */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">
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

          <form onSubmit={handleProfileSubmit} className="space-y-4 p-4 sm:p-5">
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
                  disabled={savingProfile}
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
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="submit"
                disabled={savingProfile}
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

          <div className="space-y-3 p-4 sm:p-5">
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
    </div>
  );
}
