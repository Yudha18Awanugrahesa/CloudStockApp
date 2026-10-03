"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Crown,
  Loader2,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { showToast } from "@/lib/toast";

type Member = {
  id: string;
  user_id: string;
  email: string | null;
  name: string;
  role: string;
  created_at: string;
};

type Permission = {
  permission_key: string;
  enabled: boolean;
};

type PermissionResponse = {
  user_id: string;
  role: string;
  permissions: Permission[];
};

type Props = {
  workspaceId: string;
  workspaceName: string;
};

const permissionGroups = [
  {
    title: "Dashboard",
    items: [
      {
        key: "dashboard.view",
        label: "Lihat Dashboard",
      },
    ],
  },
  {
    title: "Inventory",
    items: [
      {
        key: "inventory.view",
        label: "Lihat Inventory",
      },
      {
        key: "inventory.manage",
        label: "Kelola Inventory",
      },
    ],
  },
  {
    title: "Produk",
    items: [
      {
        key: "products.view",
        label: "Lihat Produk",
      },
      {
        key: "products.manage",
        label: "Kelola Produk",
      },
    ],
  },
  {
    title: "BOM / Resep",
    items: [
      {
        key: "bom.view",
        label: "Lihat BOM / Resep",
      },
      {
        key: "bom.manage",
        label: "Kelola BOM / Resep",
      },
    ],
  },
  {
    title: "Penjualan",
    items: [
      {
        key: "sales.view",
        label: "Lihat Penjualan",
      },
      {
        key: "sales.create",
        label: "Buat Transaksi",
      },
      {
        key: "sales.cancel",
        label: "Batalkan Transaksi",
      },
    ],
  },
  {
    title: "Laporan",
    items: [
      {
        key: "sales_history.view",
        label: "Riwayat Penjualan",
      },
      {
        key: "reports.view",
        label: "Laporan",
      },
    ],
  },
  {
    title: "Pengaturan & Administrasi",
    items: [
      {
        key: "settings.view",
        label: "Pengaturan",
      },
      {
        key: "workspace.manage",
        label: "Kelola Workspace",
      },
      {
        key: "members.manage",
        label: "Kelola Anggota",
      },
      {
        key: "data.backup",
        label: "Backup Data",
      },
      {
        key: "data.restore",
        label: "Restore Backup",
      },
      {
        key: "data.archive",
        label: "Tutup Buku",
      },
    ],
  },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function MembersClient({ workspaceId, workspaceName }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermission, setSavingPermission] = useState<string | null>(null);

  const memberCount = useMemo(
    () =>
      members.filter((member) => member.role.toLowerCase() !== "owner").length,
    [members],
  );

  async function loadMembers() {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/settings/members?workspaceId=${encodeURIComponent(workspaceId)}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message || "Gagal mengambil anggota workspace.",
        );
      }

      setMembers(result.members ?? []);
    } catch (error) {
      console.error(error);

      showToast({
        type: "error",
        title: "Gagal memuat anggota",
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
        duration: 7000,
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadPermissions(member: Member) {
    if (member.role.toLowerCase() === "owner") {
      return;
    }

    setSelectedMember(member);
    setLoadingPermissions(true);
    setPermissions({});

    try {
      const response = await fetch(
        `/api/settings/member-permissions?workspaceId=${encodeURIComponent(
          workspaceId,
        )}&userId=${encodeURIComponent(member.user_id)}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message || "Gagal mengambil permission anggota.",
        );
      }

      const map: Record<string, boolean> = {};

      for (const item of result.permissions ?? []) {
        map[item.permission_key] = Boolean(item.enabled);
      }

      setPermissions(map);
    } catch (error) {
      console.error(error);

      setSelectedMember(null);

      showToast({
        type: "error",
        title: "Gagal memuat permission",
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
        duration: 7000,
      });
    } finally {
      setLoadingPermissions(false);
    }
  }

  async function handlePermissionChange(
    permissionKey: string,
    enabled: boolean,
  ) {
    if (!selectedMember || savingPermission) {
      return;
    }

    setPermissions((current) => ({
      ...current,
      [permissionKey]: enabled,
    }));

    setSavingPermission(permissionKey);

    try {
      const response = await fetch("/api/settings/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId,
          userId: selectedMember.user_id,
          permissionKey,
          enabled,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Gagal mengubah permission.");
      }

      showToast({
        type: "success",
        title: "Permission diperbarui",
        message: `${permissionKey} ${
          enabled ? "diaktifkan" : "dinonaktifkan"
        }.`,
        duration: 3500,
      });
    } catch (error) {
      console.error(error);

      setPermissions((current) => ({
        ...current,
        [permissionKey]: !enabled,
      }));

      showToast({
        type: "error",
        title: "Gagal mengubah permission",
        message: error instanceof Error ? error.message : "Terjadi kesalahan.",
        duration: 7000,
      });
    } finally {
      setSavingPermission(null);
    }
  }

  useEffect(() => {
    void loadMembers();
  }, [workspaceId]);

  if (selectedMember) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 pb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedMember(null)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Permission Anggota
            </p>

            <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
              {selectedMember.name}
            </h1>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                  {selectedMember.name}
                </h2>

                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {selectedMember.email}
                </p>
              </div>

              <span className="ml-auto rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                Member
              </span>
            </div>
          </div>

          <div className="p-4">
            {loadingPermissions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-3">
                {permissionGroups.map((group) => (
                  <div
                    key={group.title}
                    className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    <div className="bg-slate-50 px-4 py-2.5 dark:bg-slate-800/50">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {group.title}
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {group.items.map((item) => {
                        const enabled = permissions[item.key] ?? false;

                        const saving = savingPermission === item.key;

                        return (
                          <div
                            key={item.key}
                            className="flex items-center justify-between gap-4 px-4 py-3"
                          >
                            <span className="text-xs text-slate-700 dark:text-slate-300">
                              {item.label}
                            </span>

                            <button
                              type="button"
                              role="switch"
                              aria-checked={enabled}
                              disabled={saving}
                              onClick={() =>
                                handlePermissionChange(item.key, !enabled)
                              }
                              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                                enabled
                                  ? "bg-blue-600"
                                  : "bg-slate-200 dark:bg-slate-700"
                              } ${saving ? "cursor-wait opacity-60" : ""}`}
                            >
                              <span
                                className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition ${
                                  enabled ? "translate-x-5" : "translate-x-0.5"
                                }`}
                              >
                                {saving ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                                ) : enabled ? (
                                  <Check className="h-3 w-3 text-blue-600" />
                                ) : null}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Pengaturan Workspace
          </p>

          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            Manajemen Anggota
          </h1>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Kelola akses dan permission anggota pada{" "}
            <span className="font-semibold">{workspaceName}</span>.
          </p>
        </div>

        <Link
          href="/settings"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Pengaturan
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Anggota Workspace
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                {memberCount} member selain Owner.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            </div>
          ) : members.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Belum ada anggota
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Workspace ini baru memiliki Owner.
              </p>
            </div>
          ) : (
            members.map((member) => {
              const isOwner = member.role.toLowerCase() === "owner";

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isOwner
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                          : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                      }`}
                    >
                      {isOwner ? (
                        <Crown className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {member.name}
                      </p>

                      <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                        <Mail className="h-3 w-3 shrink-0" />

                        <span className="truncate">{member.email}</span>
                      </div>

                      <p className="mt-1 text-[10px] text-slate-400">
                        Bergabung {formatDate(member.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isOwner
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                      }`}
                    >
                      {isOwner ? "Owner" : "Member"}
                    </span>

                    {isOwner ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Akses penuh
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void loadPermissions(member)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                      >
                        Kelola
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
