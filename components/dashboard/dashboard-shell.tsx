"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  ChevronDown,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Moon,
  MoreHorizontal,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Sun,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { ToastViewport } from "@/components/ui/toast-viewport";

import { useEffect, useState } from "react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Boxes,
  },
  {
    name: "Produk",
    href: "/products",
    icon: Package,
  },
  {
    name: "BOM / Resep",
    href: "/bom",
    icon: FileBarChart,
  },
  {
    name: "Penjualan",
    href: "/sales",
    icon: ShoppingCart,
  },
  {
    name: "Laporan",
    href: "/reports",
    icon: Receipt,
  },
];

const secondaryNavigation = [
  {
    name: "Pengaturan",
    href: "/settings",
    icon: Settings,
  },
];

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
  userName?: string | null;
};

export function DashboardShell({
  children,
  userEmail,
  userName,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [loggingOut, setLoggingOut] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("cloud-stock-theme");

    const nextTheme =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    window.localStorage.setItem("cloud-stock-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  useEffect(() => {
    const savedWorkspaceName = window.localStorage.getItem(
      "cloud-stock-workspace-name",
    );

    if (savedWorkspaceName?.trim()) {
      setWorkspaceName(savedWorkspaceName);
      return;
    }

    async function loadWorkspaceName() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: membership, error: membershipError } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (membershipError) {
          console.error("Gagal mengambil workspace:", membershipError);
          return;
        }

        if (!membership?.workspace_id) return;

        const { data: workspace, error: workspaceError } = await supabase
          .from("workspaces")
          .select("name")
          .eq("id", membership.workspace_id)
          .single();

        if (workspaceError) {
          console.error("Gagal mengambil nama workspace:", workspaceError);
          return;
        }

        const name = workspace?.name?.trim();

        if (!name) return;

        setWorkspaceName(name);
        window.localStorage.setItem("cloud-stock-workspace-name", name);
      } catch (error) {
        console.error("Gagal memuat workspace:", error);
      }
    }

    void loadWorkspaceName();
  }, []);

  async function handleLogout() {
    setLoggingOut(true);

    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  const displayName = userName || userEmail?.split("@")[0] || "User";

  const initials = displayName
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const workspaceInitials = workspaceName
    ? workspaceName
        .split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : initials;

  return (
    <>
      <style jsx global>{`
        .cloud-stock-brand-name {
          color: #0f172a !important;
        }

        html.dark .cloud-stock-brand-name {
          color: #f8fafc !important;
        }
      `}</style>

      <div className="min-h-screen bg-slate-50">
        {/* =====================================================
          GLOBAL TOAST NOTIFICATION
      ====================================================== */}
        <ToastViewport />

        {/* =====================================================
          SIDEBAR
      ====================================================== */}
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
          {/* Logo */}
          <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                CS
              </div>

              <div>
                <p className="cloud-stock-brand-name font-bold tracking-tight">
                  Cloud Stock
                </p>

                <p className="text-xs text-slate-400">Inventory & POS</p>
              </div>
            </Link>
          </div>

          {/* =====================================================
            NAVIGATION
        ====================================================== */}
          <div className="flex-1 overflow-y-auto px-3 py-5">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </p>

            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;

                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    <Icon size={18} strokeWidth={1.9} />

                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <p className="mb-3 mt-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Sistem
            </p>

            <nav className="space-y-1">
              {secondaryNavigation.map((item) => {
                const Icon = item.icon;

                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    <Icon size={18} strokeWidth={1.9} />

                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* =====================================================
            USER / LOGOUT
        ====================================================== */}
          <div className="border-t border-slate-100 p-3">
            <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                {initials}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {displayName}
                </p>

                <p className="truncate text-xs text-slate-400">{userEmail}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <LogOut size={18} />

              {loggingOut ? "Keluar..." : "Logout"}
            </button>
          </div>
        </aside>

        {/* =====================================================
          MAIN
      ====================================================== */}
        <div className="lg:pl-64">
          {/* ===================================================
            TOPBAR
        ==================================================== */}
          <header className="cloud-stock-mobile-topbar sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
              {/* =================================================
                MOBILE BRANDING
            ================================================== */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 lg:hidden"
                aria-label="Cloud Stock"
              >
                <img
                  src="/cloud-stock-logo.PNG"
                  alt="Cloud Stock"
                  className="h-9 w-9 rounded-xl object-contain"
                />

                <span className="cloud-stock-brand-name text-base font-bold tracking-tight">
                  Cloud Stock
                </span>
              </Link>

              {/* =================================================
                DESKTOP PAGE TITLE
            ================================================== */}
              <div className="hidden lg:block">
                <p className="text-sm font-semibold text-slate-900">
                  {getPageTitle(pathname)}
                </p>

                <p className="text-xs text-slate-400">
                  Kelola bisnis Anda dengan lebih praktis
                </p>
              </div>

              {/* =================================================
                RIGHT TOPBAR
            ================================================== */}
              <div className="ml-auto flex items-center gap-2">
                {/* Theme Toggle */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label={
                    theme === "dark"
                      ? "Aktifkan mode terang"
                      : "Aktifkan mode gelap"
                  }
                  title={theme === "dark" ? "Mode terang" : "Mode gelap"}
                >
                  {theme === "dark" ? (
                    <Sun size={19} strokeWidth={1.9} />
                  ) : (
                    <Moon size={19} strokeWidth={1.9} />
                  )}
                </button>

                {/* Notification Bell */}
                <NotificationBell />

                {/* User Profile — desktop only */}
                <div className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 sm:flex">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {workspaceInitials}
                  </div>

                  <span className="max-w-40 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {workspaceName || displayName}
                  </span>

                  <ChevronDown size={15} className="text-slate-400" />
                </div>
              </div>
            </div>
          </header>

          {/* ===================================================
            CONTENT
        ==================================================== */}
          <main className="min-h-[calc(100vh-4rem)] px-4 pb-24 pt-6 sm:px-6 sm:pb-24 lg:px-8 lg:py-6">
            {children}
          </main>
          {/* =================================================
            MOBILE BOTTOM NAVIGATION
            Satu-satunya navigasi utama di mobile.
        ================================================== */}
          <nav
            className="cloud-stock-mobile-bottom-nav fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 lg:hidden"
            aria-label="Navigasi utama"
          >
            <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
              {[
                {
                  name: "Dashboard",
                  href: "/dashboard",
                  icon: LayoutDashboard,
                },
                { name: "Inventory", href: "/inventory", icon: Boxes },
                { name: "Penjualan", href: "/sales", icon: ShoppingCart },
                { name: "Laporan", href: "/reports", icon: Receipt },
              ].map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-w-0 flex-col items-center justify-center rounded-xl px-1 py-2 transition ${
                      active
                        ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white"
                        : "text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon size={19} strokeWidth={1.9} />

                    <span className="mt-1 truncate text-[10px] font-semibold">
                      {item.name}
                    </span>
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={() => setMobileMoreOpen(true)}
                className={`flex min-w-0 flex-col items-center justify-center rounded-xl px-1 py-2 transition ${
                  pathname.startsWith("/products") ||
                  pathname.startsWith("/bom") ||
                  pathname.startsWith("/settings")
                    ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                }`}
                aria-label="Buka menu lainnya"
              >
                <MoreHorizontal size={19} strokeWidth={1.9} />
                <span className="mt-1 truncate text-[10px] font-semibold">
                  Lainnya
                </span>
              </button>
            </div>
          </nav>

          {/* =================================================
            MOBILE MORE MENU
            Produk, BOM / Resep, dan Pengaturan.
        ================================================== */}
          {mobileMoreOpen && (
            <>
              <button
                type="button"
                aria-label="Tutup menu lainnya"
                onClick={() => setMobileMoreOpen(false)}
                className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm lg:hidden"
              />

              <div className="fixed inset-x-0 bottom-0 z-[80] rounded-t-[28px] border-t border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-16px_40px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950 lg:hidden">
                <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-slate-200 dark:bg-slate-700" />

                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-base font-bold text-slate-950 dark:text-white">
                      Lainnya
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Menu Cloud Stock
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileMoreOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    aria-label="Tutup menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { name: "Produk", href: "/products", icon: Package },
                    { name: "BOM / Resep", href: "/bom", icon: FileBarChart },
                    { name: "Pengaturan", href: "/settings", icon: Settings },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white dark:border-slate-700 dark:bg-slate-800"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Icon size={22} strokeWidth={1.9} />
                        <span className="text-xs font-semibold">
                          {item.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ===========================================================
   PAGE TITLE
=========================================================== */

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/inventory")) {
    return "Inventory";
  }

  if (pathname.startsWith("/products")) {
    return "Produk";
  }

  if (pathname.startsWith("/bom")) {
    return "BOM / Resep";
  }

  if (pathname.startsWith("/sales")) {
    return "Penjualan";
  }

  if (pathname.startsWith("/reports")) {
    return "Laporan";
  }

  if (pathname.startsWith("/settings")) {
    return "Pengaturan";
  }

  return "Dashboard";
}
