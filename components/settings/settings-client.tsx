"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
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
        .update({
          name,
        })
        .eq("id", initialWorkspace.id);

      if (error) {
        throw error;
      }

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
        data: {
          name,
        },
      });

      if (error) {
        throw error;
      }

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

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 sm:space-y-6">
      {/* HEADER */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Sistem
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Pengaturan
        </h1>

        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          Kelola workspace dan informasi akun Anda.
        </p>
      </section>

      {/* WORKSPACE */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Building2 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-950 sm:text-base">
                Workspace
              </h2>

              <p className="text-xs text-slate-500 sm:text-sm">
                Identitas workspace aktif Cloud Stock.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleWorkspaceSubmit} className="p-4 sm:p-5">
          <div className="mb-4 rounded-xl bg-slate-50 p-3.5">
            <p className="text-sm font-semibold text-slate-900">
              {initialWorkspace.name}
            </p>

            <p className="mt-0.5 text-xs text-slate-500">
              Workspace aktif untuk akun ini.
            </p>
          </div>

          <label
            htmlFor="workspace-name"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Nama Workspace
          </label>

          <input
            id="workspace-name"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            maxLength={80}
            disabled={savingWorkspace}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 disabled:bg-slate-50"
          />

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={savingWorkspace}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingWorkspace ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </section>

      {/* PROFILE */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <UserRound className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-950 sm:text-base">
                Profil Akun
              </h2>

              <p className="text-xs text-slate-500 sm:text-sm">
                Informasi akun yang digunakan untuk Cloud Stock.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4 p-4 sm:p-5">
          <div>
            <label
              htmlFor="profile-name"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Nama
            </label>

            <input
              id="profile-name"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              maxLength={80}
              disabled={savingProfile}
              placeholder="Nama pengguna"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label
              htmlFor="profile-email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email
            </label>

            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="profile-email"
                value={initialEmail}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3.5 text-sm text-slate-500 outline-none"
              />
            </div>

            <p className="mt-1.5 text-xs text-slate-400">
              Email login tidak diubah dari halaman ini.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Role</p>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
              <ShieldCheck className="h-4 w-4 text-slate-500" />

              <div>
                <p className="text-sm font-medium text-slate-800">
                  {roleLabel(initialMembership.role)}
                </p>

                <p className="text-xs text-slate-400">
                  Role workspace akun saat ini.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingProfile ? "Menyimpan..." : "Simpan Profil"}
            </button>
          </div>
        </form>
      </section>

      {/* ACCOUNT */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <LogOut className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-950 sm:text-base">
                Akun
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                Keluar dari sesi Cloud Stock pada perangkat ini.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <LogOut className="h-4 w-4" />

            {loggingOut ? "Keluar..." : "Logout"}
          </button>
        </div>
      </section>

      <div className="flex items-center justify-center gap-2 pb-2 text-xs text-slate-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Cloud Stock Settings
      </div>
    </div>
  );
}
