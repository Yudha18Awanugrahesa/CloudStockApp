"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Edit3,
  Plus,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/lib/toast";

type Employee = {
  id: string;
  workspace_id: string;
  employee_code: string;
  name: string;
  position: string | null;
  status: "active" | "inactive";
  join_date: string | null;
  created_at: string;
  updated_at: string;
};

type EmployeesClientProps = {
  workspaceId: string;
  isOwner: boolean;
};

type FormState = {
  employeeCode: string;
  name: string;
  position: string;
  joinDate: string;
};

const EMPTY_FORM: FormState = {
  employeeCode: "",
  name: "",
  position: "",
  joinDate: "",
};

function formatDate(value: string | null) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

export function EmployeesClient({
  workspaceId,
  isOwner,
}: EmployeesClientProps) {
  const supabase = useMemo(() => createClient(), []);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);

  async function loadEmployees() {
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("get_employees", {
        p_workspace_id: workspaceId,
      });

      if (error) throw error;

      setEmployees((data ?? []) as Employee[]);
    } catch (error) {
      console.error("Load employees error:", error);

      showToast({
        type: "error",
        title: "Gagal memuat karyawan",
        message:
          error instanceof Error
            ? error.message
            : "Data karyawan tidak dapat dimuat.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEmployees();
  }, [workspaceId]);

  const activeCount = employees.filter(
    (employee) => employee.status === "active",
  ).length;

  const inactiveCount = employees.filter(
    (employee) => employee.status === "inactive",
  ).length;

  const filteredEmployees = employees.filter((employee) => {
    const query = searchQuery.trim().toLowerCase();

    const matchesSearch =
      !query ||
      employee.name.toLowerCase().includes(query) ||
      employee.employee_code.toLowerCase().includes(query) ||
      (employee.position ?? "").toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "all" || employee.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function openCreateModal() {
    if (!isOwner) return;

    setEditingEmployee(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEditModal(employee: Employee) {
    if (!isOwner) return;

    setEditingEmployee(employee);

    setForm({
      employeeCode: employee.employee_code,
      name: employee.name,
      position: employee.position ?? "",
      joinDate: employee.join_date ?? "",
    });

    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingEmployee(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isOwner) {
      showToast({
        type: "error",
        title: "Akses ditolak",
        message: "Hanya Owner yang dapat mengelola data karyawan.",
      });

      return;
    }

    const employeeCode = form.employeeCode.trim();
    const name = form.name.trim();
    const position = form.position.trim();
    const joinDate = form.joinDate || null;

    if (!employeeCode) {
      showToast({
        type: "warning",
        title: "Kode karyawan belum diisi",
        message: "Masukkan kode karyawan terlebih dahulu.",
      });
      return;
    }

    if (!name) {
      showToast({
        type: "warning",
        title: "Nama karyawan belum diisi",
        message: "Masukkan nama karyawan terlebih dahulu.",
      });
      return;
    }

    setSaving(true);

    try {
      if (editingEmployee) {
        const { data, error } = await supabase.rpc("update_employee", {
          p_workspace_id: workspaceId,
          p_employee_id: editingEmployee.id,
          p_employee_code: employeeCode,
          p_name: name,
          p_position: position || null,
          p_join_date: joinDate,
        });

        if (error) throw error;

        setEmployees((current) =>
          current.map((employee) =>
            employee.id === editingEmployee.id ? (data as Employee) : employee,
          ),
        );

        showToast({
          type: "success",
          title: "Karyawan diperbarui",
          message: `${name} berhasil diperbarui.`,
        });
      } else {
        const { data, error } = await supabase.rpc("create_employee", {
          p_workspace_id: workspaceId,
          p_employee_code: employeeCode,
          p_name: name,
          p_position: position || null,
          p_join_date: joinDate,
        });

        if (error) throw error;

        setEmployees((current) => [data as Employee, ...current]);

        showToast({
          type: "success",
          title: "Karyawan ditambahkan",
          message: `${name} berhasil ditambahkan sebagai karyawan aktif.`,
        });
      }

      closeModal();
    } catch (error) {
      console.error("Save employee error:", error);

      showToast({
        type: "error",
        title: editingEmployee
          ? "Gagal memperbarui karyawan"
          : "Gagal menambahkan karyawan",
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menyimpan data karyawan.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(employee: Employee) {
    if (!isOwner || changingStatusId) return;

    const nextStatus = employee.status === "active" ? "inactive" : "active";

    setChangingStatusId(employee.id);

    try {
      const { data, error } = await supabase.rpc("set_employee_status", {
        p_workspace_id: workspaceId,
        p_employee_id: employee.id,
        p_status: nextStatus,
      });

      if (error) throw error;

      setEmployees((current) =>
        current.map((item) =>
          item.id === employee.id ? (data as Employee) : item,
        ),
      );

      showToast({
        type: "success",
        title:
          nextStatus === "active"
            ? "Karyawan diaktifkan"
            : "Karyawan dinonaktifkan",
        message:
          nextStatus === "active"
            ? `${employee.name} kembali berstatus aktif.`
            : `${employee.name} sekarang berstatus nonaktif.`,
      });
    } catch (error) {
      console.error("Change employee status error:", error);

      showToast({
        type: "error",
        title: "Gagal mengubah status",
        message:
          error instanceof Error
            ? error.message
            : "Status karyawan tidak dapat diubah.",
      });
    } finally {
      setChangingStatusId(null);
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm dark:border-blue-500/20 dark:bg-slate-900">
        {/* HEADER */}
        <div className="border-b border-blue-100 bg-blue-50/60 p-4 dark:border-blue-500/10 dark:bg-blue-500/5 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-950 dark:text-white sm:text-base">
                  Manajemen Karyawan
                </h2>

                <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Kelola identitas karyawan yang menggunakan akun operasional
                  workspace.
                </p>
              </div>
            </div>

            {isOwner && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Tambah Karyawan
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {/* SUMMARY */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/30">
              <p className="text-xs text-slate-400">Total Karyawan</p>
              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                {employees.length}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Aktif
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-800 dark:text-emerald-300">
                {activeCount}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/30">
              <p className="text-xs text-slate-400">Nonaktif</p>
              <p className="mt-1 text-xl font-bold text-slate-700 dark:text-slate-300">
                {inactiveCount}
              </p>
            </div>
          </div>

          {/* SEARCH & FILTER */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari nama, kode, atau jabatan..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "all" | "active" | "inactive",
                )
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>

          {/* LIST */}
          <div className="space-y-2.5">
            {loading ? (
              <div className="rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-800">
                Memuat data karyawan...
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <UserRound className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />

                <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {employees.length === 0
                    ? "Belum ada karyawan"
                    : "Karyawan tidak ditemukan"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {employees.length === 0
                    ? "Tambahkan karyawan pertama untuk mulai menggunakan fitur operasional."
                    : "Coba ubah kata kunci pencarian atau filter status."}
                </p>
              </div>
            ) : (
              filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      {employee.name
                        .trim()
                        .split(/\s+/)
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {employee.name}
                        </p>

                        <span
                          className={
                            employee.status === "active"
                              ? "inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {employee.status === "active" ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>{employee.employee_code}</span>

                        {employee.position && (
                          <>
                            <span>•</span>
                            <span>{employee.position}</span>
                          </>
                        )}

                        {employee.join_date && (
                          <>
                            <span>•</span>
                            <span>
                              Bergabung {formatDate(employee.join_date)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {isOwner && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(employee)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                          title="Edit karyawan"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(employee)}
                          disabled={changingStatusId === employee.id}
                          className={
                            employee.status === "active"
                              ? "hidden h-9 rounded-lg px-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-amber-600 disabled:opacity-50 sm:inline-flex sm:items-center"
                              : "hidden h-9 rounded-lg px-2.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50 sm:inline-flex sm:items-center"
                          }
                        >
                          {changingStatusId === employee.id
                            ? "..."
                            : employee.status === "active"
                              ? "Nonaktifkan"
                              : "Aktifkan"}
                        </button>
                      </div>
                    )}
                  </div>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(employee)}
                      disabled={changingStatusId === employee.id}
                      className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400 sm:hidden"
                    >
                      {changingStatusId === employee.id
                        ? "Memproses..."
                        : employee.status === "active"
                          ? "Nonaktifkan Karyawan"
                          : "Aktifkan Karyawan"}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="employee-modal-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <h2
                    id="employee-modal-title"
                    className="text-base font-bold text-slate-950 dark:text-white"
                  >
                    {editingEmployee ? "Edit Karyawan" : "Tambah Karyawan"}
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Isi data dasar karyawan untuk kebutuhan operasional.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 p-5">
                <div>
                  <label
                    htmlFor="employee-code"
                    className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Kode Karyawan *
                  </label>

                  <input
                    id="employee-code"
                    value={form.employeeCode}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        employeeCode: event.target.value,
                      }))
                    }
                    maxLength={30}
                    disabled={saving}
                    placeholder="Contoh: EMP-001"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="employee-name"
                    className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Nama Karyawan *
                  </label>

                  <input
                    id="employee-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    maxLength={80}
                    disabled={saving}
                    placeholder="Contoh: Andi"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="employee-position"
                    className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Jabatan
                  </label>

                  <input
                    id="employee-position"
                    value={form.position}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        position: event.target.value,
                      }))
                    }
                    maxLength={80}
                    disabled={saving}
                    placeholder="Contoh: Barista"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="employee-join-date"
                    className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Tanggal Bergabung
                  </label>

                  <input
                    id="employee-join-date"
                    type="date"
                    value={form.joinDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        joinDate: event.target.value,
                      }))
                    }
                    disabled={saving}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : editingEmployee
                      ? "Simpan Perubahan"
                      : "Tambah Karyawan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
