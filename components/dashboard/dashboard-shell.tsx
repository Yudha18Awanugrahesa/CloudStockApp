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
  PanelLeftClose,
  PanelLeftOpen,
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

import { useEffect, useRef, useMemo, useState } from "react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.view",
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Boxes,
    permission: "inventory.view",
  },
  {
    name: "Produk",
    href: "/products",
    icon: Package,
    permission: "products.view",
  },
  {
    name: "BOM / Resep",
    href: "/bom",
    icon: FileBarChart,
    permission: "bom.view",
  },
  {
    name: "Penjualan",
    href: "/sales",
    icon: ShoppingCart,
    permission: "sales.view",
  },
  {
    name: "Riwayat Penjualan",
    href: "/sales/history",
    icon: Receipt,
    permission: "sales_history.view",
  },
  {
    name: "Laporan",
    href: "/reports",
    icon: Receipt,
    permission: "reports.view",
  },
];

const secondaryNavigation = [
  {
    name: "Pengaturan",
    href: "/settings",
    icon: Settings,
    permission: "settings.view",
  },
];

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
  userName?: string | null;
};

type PermissionMap = Record<string, boolean>;

export function DashboardShell({
  children,
  userEmail,
  userName,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [loggingOut, setLoggingOut] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const [role, setRole] = useState<string | null>(null);

  const [permissions, setPermissions] = useState<PermissionMap>({});

  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    const prefetchRoutes = [
      "/dashboard",
      "/inventory",
      "/products",
      "/bom",
      "/sales",
      "/reports",
      "/settings",
    ];

    const prefetch = () => {
      prefetchRoutes.forEach((href) => router.prefetch(href));
    };

    const idleWindow = window as typeof window & {
      requestIdleCallback?: (callback: () => void) => number;
    };

    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(prefetch);
      return () => {
        if (typeof window.cancelIdleCallback === "function") {
          window.cancelIdleCallback(id);
        }
      };
    }

    const id = window.setTimeout(prefetch, 800);
    return () => window.clearTimeout(id);
  }, [router]);

  useEffect(() => {
    const savedSidebar = window.localStorage.getItem(
      "cloud-stock-sidebar-collapsed",
    );

    if (savedSidebar === "true") {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "cloud-stock-sidebar-collapsed",
      String(sidebarCollapsed),
    );
  }, [sidebarCollapsed]);

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
    setWorkspaceMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!workspaceMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;

      if (
        target &&
        workspaceMenuRef.current &&
        !workspaceMenuRef.current.contains(target)
      ) {
        setWorkspaceMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setWorkspaceMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [workspaceMenuOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspacePermissions() {
      try {
        setPermissionsLoading(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          if (!cancelled) {
            setWorkspaceId(null);
            setRole(null);
            setPermissions({});
          }
          return;
        }

        const { data: membership, error: membershipError } = await supabase
          .from("workspace_members")
          .select("workspace_id, role")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (membershipError) throw membershipError;

        if (!membership?.workspace_id) {
          if (!cancelled) {
            setWorkspaceId(null);
            setRole(null);
            setPermissions({});
          }
          return;
        }

        const activeWorkspaceId = membership.workspace_id;

        const { data: permissionData, error: permissionError } =
          await supabase.rpc("get_my_workspace_permissions", {
            p_workspace_id: activeWorkspaceId,
          });

        if (permissionError) throw permissionError;

        if (cancelled) return;

        setWorkspaceId(activeWorkspaceId);
        setRole(
          typeof membership.role === "string"
            ? membership.role.toLowerCase()
            : null,
        );
        setPermissions(
          permissionData?.permissions &&
            typeof permissionData.permissions === "object"
            ? permissionData.permissions
            : {},
        );
      } catch (error) {
        console.error("Gagal memuat permission workspace:", error);

        if (!cancelled) {
          setWorkspaceId(null);
          setRole(null);
          setPermissions({});
        }
      } finally {
        if (!cancelled) setPermissionsLoading(false);
      }
    }

    void loadWorkspacePermissions();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const isOwner = role === "owner";

  const canAccess = (permission: string) => {
    if (permissionsLoading) return true;
    if (isOwner) return true;
    return permissions[permission] === true;
  };

  const visibleNavigation = navigation.filter((item) =>
    canAccess(item.permission),
  );

  const visibleSecondaryNavigation = secondaryNavigation.filter((item) =>
    canAccess(item.permission),
  );

  const mobilePrimaryNavigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      permission: "dashboard.view",
    },
    {
      name: "Inventory",
      href: "/inventory",
      icon: Boxes,
      permission: "inventory.view",
    },
    {
      name: "Penjualan",
      href: "/sales",
      icon: ShoppingCart,
      permission: "sales.view",
    },
    {
      name: "Riwayat",
      href: "/sales/history",
      icon: Receipt,
      permission: "sales_history.view",
    },
  ].filter((item) => canAccess(item.permission));

  const mobileMoreNavigation = [
    {
      name: "Produk",
      href: "/products",
      icon: Package,
      permission: "products.view",
    },
    {
      name: "BOM / Resep",
      href: "/bom",
      icon: FileBarChart,
      permission: "bom.view",
    },
    {
      name: "Laporan",
      href: "/reports",
      icon: Receipt,
      permission: "reports.view",
    },
    {
      name: "Pengaturan",
      href: "/settings",
      icon: Settings,
      permission: "settings.view",
    },
  ].filter((item) => canAccess(item.permission));

  return (
    <>
      <style jsx global>{`
        .cloud-stock-brand-name {
          color: #0f172a !important;
        }

        html.dark .cloud-stock-brand-name {
          color: #f8fafc !important;
        }

        .cloud-stock-sidebar {
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 18px 55px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          will-change: width, transform;
        }

        html.dark .cloud-stock-sidebar {
          background: rgba(2, 6, 23, 0.94);
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.3);
        }

        .cloud-stock-sidebar-label {
          overflow: hidden;
          white-space: nowrap;
          transition:
            opacity 220ms ease,
            max-width 300ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .cloud-stock-sidebar-label.is-expanded {
          max-width: 190px;
          opacity: 1;
          transform: translateX(0);
        }

        .cloud-stock-sidebar-label.is-collapsed {
          max-width: 0;
          opacity: 0;
          transform: translateX(-8px);
        }

        .cloud-stock-sidebar-section {
          overflow: hidden;
          transition:
            opacity 180ms ease,
            max-height 280ms ease,
            margin 280ms ease,
            transform 260ms ease;
        }

        .cloud-stock-sidebar-section.is-expanded {
          max-height: 40px;
          opacity: 1;
          transform: translateX(0);
        }

        .cloud-stock-sidebar-section.is-collapsed {
          max-height: 0;
          margin-top: 0;
          margin-bottom: 0;
          opacity: 0;
          transform: translateX(-8px);
        }

        .cloud-stock-nav-item {
          will-change: transform, background-color, box-shadow;
        }

        .cloud-stock-nav-item:not(.is-active):hover {
          transform: translateX(2px);
        }

        .cloud-stock-active-indicator {
          transform: translateX(-6px) scaleY(0.7);
          opacity: 0;
          transition:
            transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
            opacity 180ms ease;
        }

        .cloud-stock-active-indicator.is-visible {
          transform: translateX(0) scaleY(1);
          opacity: 1;
        }

        .cloud-stock-topbar {
          will-change: transform, width;
          transition:
            box-shadow 300ms ease,
            background-color 300ms ease,
            border-color 300ms ease;
        }

        .cloud-stock-topbar:hover {
          box-shadow: 0 10px 34px rgba(15, 23, 42, 0.075);
        }

        .cloud-stock-collapse-button {
          transition:
            right 520ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 220ms ease,
            box-shadow 220ms ease;
        }

        .cloud-stock-collapse-button:hover {
          transform: translateY(-50%) scale(1.05);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
        }

        .cloud-stock-mobile-bottom-nav {
          padding-bottom: max(0.65rem, env(safe-area-inset-bottom));
        }

        .cloud-stock-mobile-dock {
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.14);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        html.dark .cloud-stock-mobile-dock {
          background: rgba(2, 6, 23, 0.9);
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.34);
        }

        .cloud-stock-mobile-nav-item {
          position: relative;
          min-height: 48px;
          transition:
            transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
            background-color 180ms ease,
            color 180ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .cloud-stock-mobile-nav-item:active {
          transform: scale(0.94);
        }

        .cloud-stock-mobile-nav-item .mobile-nav-icon {
          transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .cloud-stock-mobile-nav-item:hover .mobile-nav-icon {
          transform: translateY(-1px) scale(1.06);
        }

        .cloud-stock-mobile-nav-item.is-active::before {
          content: "";
          position: absolute;
          top: 3px;
          left: 50%;
          width: 18px;
          height: 3px;
          border-radius: 999px;
          background: currentColor;
          transform: translateX(-50%);
          opacity: 0.95;
        }

        .cloud-stock-mobile-more-backdrop {
          animation: cloud-stock-mobile-backdrop-in 160ms ease-out both;
        }

        .cloud-stock-mobile-more-panel {
          animation: cloud-stock-mobile-more-panel-in 320ms
            cubic-bezier(0.22, 1, 0.36, 1) both;
          transform-origin: bottom right;
        }

        .cloud-stock-mobile-more-panel::after {
          content: "";
          position: absolute;
          right: 24px;
          bottom: -6px;
          width: 12px;
          height: 12px;
          border-right: 1px solid rgba(226, 232, 240, 0.9);
          border-bottom: 1px solid rgba(226, 232, 240, 0.9);
          background: rgba(255, 255, 255, 0.94);
          transform: rotate(45deg);
        }

        html.dark .cloud-stock-mobile-more-panel::after {
          border-color: rgba(51, 65, 85, 0.9);
          background: rgba(2, 6, 23, 0.94);
        }

        .cloud-stock-mobile-more-item {
          transition:
            transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
            background-color 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease,
            color 180ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .cloud-stock-mobile-more-item:active {
          transform: translateX(-2px) scale(0.98);
        }

        .cloud-stock-mobile-more-item:hover {
          transform: translateX(-3px);
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
        }

        .cloud-stock-mobile-more-icon {
          transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .cloud-stock-mobile-more-item:hover .cloud-stock-mobile-more-icon {
          transform: translateX(-1px) scale(1.06);
        }

        @keyframes cloud-stock-mobile-backdrop-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes cloud-stock-mobile-more-panel-in {
          from {
            opacity: 0;
            transform: translateY(28px) translateX(10px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) translateX(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cloud-stock-sidebar,
          .cloud-stock-sidebar-label,
          .cloud-stock-sidebar-section,
          .cloud-stock-nav-item,
          .cloud-stock-active-indicator,
          .cloud-stock-topbar,
          .cloud-stock-collapse-button,
          .cloud-stock-mobile-nav-item,
          .cloud-stock-mobile-more-backdrop,
          .cloud-stock-mobile-more-panel,
          .cloud-stock-mobile-more-item {
            transition: none !important;
            animation: none !important;
          }
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
        <aside
          className={`cloud-stock-sidebar fixed left-4 top-4 bottom-4 z-50 hidden flex-col rounded-[24px] border border-slate-200/80 transition-[width] duration-[620ms] ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-slate-800/80 lg:flex ${
            sidebarCollapsed ? "w-[76px]" : "w-64"
          }`}
        >
          {/* Logo + Sidebar Toggle */}
          <div
            className={`relative flex h-20 shrink-0 items-center border-b border-slate-100 dark:border-slate-800 ${
              sidebarCollapsed ? "justify-center px-3" : "justify-between px-5"
            }`}
          >
            <Link
              href="/dashboard"
              className="flex min-w-0 items-center gap-3"
              aria-label="Cloud Stock"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:ring-blue-500/20">
                <img
                  src="/cloud-stock-logo.PNG"
                  alt="Cloud Stock"
                  className="h-7 w-7 object-contain"
                />
              </div>

              <div
                className={`cloud-stock-sidebar-label min-w-0 ${
                  sidebarCollapsed ? "is-collapsed" : "is-expanded"
                }`}
              >
                <p className="cloud-stock-brand-name truncate font-bold tracking-tight">
                  Cloud Stock
                </p>
                <p className="text-[11px] font-medium text-slate-400">
                  Inventory Management
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              className={`cloud-stock-collapse-button absolute top-1/2 z-[70] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-500 shadow-[0_4px_14px_rgba(15,23,42,0.10)] backdrop-blur dark:border-slate-700/90 dark:bg-slate-900/95 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white ${
                sidebarCollapsed ? "-right-4" : "right-3"
              }`}
              aria-label={sidebarCollapsed ? "Buka sidebar" : "Ciutkan sidebar"}
              title={sidebarCollapsed ? "Buka sidebar" : "Ciutkan sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={16} strokeWidth={2} />
              ) : (
                <PanelLeftClose size={16} strokeWidth={2} />
              )}
            </button>
          </div>

          {/* Navigation */}
          <div
            className={`${sidebarCollapsed ? "px-2" : "px-3"} flex-1 overflow-y-auto py-5`}
          >
            <p
              className={`cloud-stock-sidebar-section mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${
                sidebarCollapsed ? "is-collapsed" : "is-expanded"
              }`}
            >
              Workspace
            </p>

            <nav className="space-y-1">
              {visibleNavigation.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`cloud-stock-nav-item group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-300 ease-out ${
                      active ? "is-active" : ""
                    } ${sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"} ${
                      active
                        ? "bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-500/10 dark:text-blue-400"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`cloud-stock-active-indicator absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-blue-600 ${active ? "is-visible" : ""}`}
                    />
                    <Icon
                      size={18}
                      strokeWidth={1.9}
                      className="shrink-0 transition-transform duration-300 group-hover:scale-105"
                    />
                    <span
                      className={`cloud-stock-sidebar-label ${
                        sidebarCollapsed ? "is-collapsed" : "is-expanded"
                      }`}
                    >
                      {item.name}
                    </span>

                    {sidebarCollapsed && (
                      <span className="pointer-events-none absolute left-[calc(100%+12px)] z-[100] hidden translate-x-[-4px] whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-all duration-200 group-hover:block group-hover:translate-x-0 group-hover:opacity-100 dark:bg-white dark:text-slate-900">
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <p
              className={`cloud-stock-sidebar-section mb-3 mt-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${
                sidebarCollapsed ? "is-collapsed" : "is-expanded"
              }`}
            >
              Sistem
            </p>

            <nav className="space-y-1">
              {visibleSecondaryNavigation.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`cloud-stock-nav-item group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-300 ease-out ${
                      active ? "is-active" : ""
                    } ${sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"} ${
                      active
                        ? "bg-slate-950 text-white dark:bg-slate-800"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`cloud-stock-active-indicator absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-slate-900 dark:bg-white ${active ? "is-visible" : ""}`}
                    />
                    <Icon
                      size={18}
                      strokeWidth={1.9}
                      className="shrink-0 transition-transform duration-300 group-hover:scale-105"
                    />
                    <span
                      className={`cloud-stock-sidebar-label ${
                        sidebarCollapsed ? "is-collapsed" : "is-expanded"
                      }`}
                    >
                      {item.name}
                    </span>

                    {sidebarCollapsed && (
                      <span className="pointer-events-none absolute left-[calc(100%+12px)] z-[100] hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-white dark:text-slate-900">
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User / Logout */}
          <div className="border-t border-slate-100 p-3 dark:border-slate-800">
            <div
              className={`mb-2 flex items-center rounded-xl py-2 ${
                sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                {initials}
              </div>

              <div
                className={`cloud-stock-sidebar-label min-w-0 ${
                  sidebarCollapsed ? "is-collapsed" : "is-expanded"
                }`}
              >
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                  {displayName}
                </p>
                <p className="truncate text-xs text-slate-400">{userEmail}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className={`group relative flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-slate-600 transition-all duration-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 ${
                sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"
              }`}
            >
              <LogOut size={18} className="shrink-0" />
              <span
                className={`cloud-stock-sidebar-label ${
                  sidebarCollapsed ? "is-collapsed" : "is-expanded"
                }`}
              >
                {loggingOut ? "Keluar..." : "Logout"}
              </span>

              {sidebarCollapsed && (
                <span className="pointer-events-none absolute left-[calc(100%+12px)] z-[100] hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-white dark:text-slate-900">
                  {loggingOut ? "Keluar..." : "Logout"}
                </span>
              )}
            </button>
          </div>
        </aside>

        {/* =====================================================
          MAIN
      ====================================================== */}
        <div
          className={`transition-[padding] duration-[620ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            sidebarCollapsed ? "lg:pl-[108px]" : "lg:pl-[280px]"
          }`}
        >
          {/* ===================================================
            TOPBAR
            Desktop: floating header mengikuti bahasa visual sidebar.
            Mobile: tetap full-width agar navigasi tetap nyaman.
        ==================================================== */}
          <header className="cloud-stock-mobile-topbar sticky top-0 z-30 px-3 pt-2.5 sm:px-4 lg:px-6 lg:pt-3">
            <div className="cloud-stock-topbar flex h-14 items-center justify-between rounded-[18px] border border-slate-200/80 bg-white/90 px-3 shadow-[0_7px_24px_rgba(15,23,42,0.055)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 dark:shadow-[0_7px_24px_rgba(0,0,0,0.16)] sm:px-4 lg:px-5">
              {/* Mobile branding */}
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

              {/* Desktop page context */}
              <div className="hidden min-w-0 items-center gap-3 lg:flex">
                {sidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-all duration-200 hover:-translate-y-px hover:bg-white hover:text-slate-900 hover:shadow-[0_5px_14px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    aria-label="Buka sidebar"
                    title="Buka sidebar"
                  >
                    <PanelLeftOpen size={17} strokeWidth={1.9} />
                  </button>
                )}

                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                    Cloud Stock
                  </p>
                  <h1 className="mt-0.5 truncate text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {getPageTitle(pathname)}
                  </h1>
                </div>
              </div>

              {/* Right controls */}
              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-all duration-200 hover:-translate-y-px hover:bg-white hover:text-slate-900 hover:shadow-[0_5px_14px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label={
                    theme === "dark"
                      ? "Aktifkan mode terang"
                      : "Aktifkan mode gelap"
                  }
                  title={theme === "dark" ? "Mode terang" : "Mode gelap"}
                >
                  {theme === "dark" ? (
                    <Sun size={18} strokeWidth={1.9} />
                  ) : (
                    <Moon size={18} strokeWidth={1.9} />
                  )}
                </button>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-all duration-200 hover:-translate-y-px hover:bg-white hover:shadow-[0_5px_14px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                  <NotificationBell />
                </div>

                <div
                  ref={workspaceMenuRef}
                  className="relative hidden sm:block"
                >
                  <button
                    type="button"
                    onClick={() => setWorkspaceMenuOpen((current) => !current)}
                    className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 transition-all duration-200 hover:-translate-y-px hover:bg-white hover:shadow-[0_5px_14px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                    aria-expanded={workspaceMenuOpen}
                    aria-haspopup="menu"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-[9px] font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                      {workspaceInitials}
                    </div>
                    <span className="max-w-40 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {workspaceName || displayName}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform duration-200 ${
                        workspaceMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {workspaceMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-[calc(100%+10px)] z-[100] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.14)] dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Workspace aktif
                        </p>
                        <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                          {workspaceName || displayName}
                        </p>
                        <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Aktif
                        </span>
                      </div>
                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                      <Link
                        href="/settings"
                        onClick={() => setWorkspaceMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        role="menuitem"
                      >
                        <Settings size={17} className="text-slate-400" />
                        Pengaturan Workspace
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setWorkspaceMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        role="menuitem"
                      >
                        <div className="flex h-[17px] w-[17px] items-center justify-center rounded-full bg-blue-50 text-[8px] font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                          {initials}
                        </div>
                        Profil Akun
                      </Link>
                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                      <button
                        type="button"
                        onClick={() => {
                          setWorkspaceMenuOpen(false);
                          void handleLogout();
                        }}
                        disabled={loggingOut}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        role="menuitem"
                      >
                        <LogOut size={17} />
                        {loggingOut ? "Keluar..." : "Keluar"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* ===================================================
            CONTENT
        ==================================================== */}
          <main className="min-h-[calc(100vh-4rem)] px-4 pb-24 pt-6 sm:px-6 sm:pb-24 lg:px-8 lg:py-5">
            {children}
          </main>
          {/* =================================================
            MOBILE BOTTOM NAVIGATION
            Floating dock dengan 4 menu utama + Lainnya.
            Tidak mengubah permission/routing yang sudah ada.
        ================================================== */}
          <nav
            className="cloud-stock-mobile-bottom-nav fixed inset-x-0 bottom-0 z-[60] px-3 pb-2 lg:hidden"
            aria-label="Navigasi utama"
          >
            <div className="cloud-stock-mobile-dock mx-auto flex max-w-md items-center gap-1 rounded-[22px] border border-slate-200/80 p-1.5 dark:border-slate-800/80">
              {mobilePrimaryNavigation.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/sales"
                    ? pathname === "/sales"
                    : pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`cloud-stock-mobile-nav-item group flex min-w-0 flex-1 flex-col items-center justify-center rounded-[16px] px-1 py-1.5 text-center ${
                      active
                        ? "is-active bg-slate-900 text-white shadow-sm dark:bg-slate-800"
                        : "text-slate-400 hover:bg-slate-100/80 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800/80 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon
                      className="mobile-nav-icon"
                      size={19}
                      strokeWidth={active ? 2 : 1.9}
                    />
                    <span className="mt-1 truncate text-[9px] font-semibold leading-none sm:text-[10px]">
                      {item.name}
                    </span>
                  </Link>
                );
              })}

              {mobileMoreNavigation.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMoreOpen(true);
                    mobileMoreNavigation.forEach((item) =>
                      router.prefetch(item.href),
                    );
                  }}
                  className={`cloud-stock-mobile-nav-item group relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-[16px] px-1 py-1.5 text-center ${
                    mobileMoreNavigation.some(
                      (item) =>
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`),
                    )
                      ? "is-active bg-slate-900 text-white shadow-sm dark:bg-slate-800"
                      : "text-slate-400 hover:bg-slate-100/80 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800/80 dark:hover:text-slate-200"
                  }`}
                  aria-label="Buka menu lainnya"
                  aria-expanded={mobileMoreOpen}
                >
                  <MoreHorizontal
                    className="mobile-nav-icon"
                    size={19}
                    strokeWidth={1.9}
                  />
                  <span className="mt-1 truncate text-[9px] font-semibold leading-none sm:text-[10px]">
                    Lainnya
                  </span>
                </button>
              )}
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
                className="cloud-stock-mobile-more-backdrop fixed inset-0 z-[70] bg-transparent lg:hidden"
              />

              <div
                className="cloud-stock-mobile-more-panel fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-3 z-[80] w-[190px] rounded-[22px] border border-slate-200/90 bg-white/95 p-2.5 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 dark:shadow-[0_18px_45px_rgba(0,0,0,0.34)] lg:hidden"
                role="menu"
                aria-label="Menu lainnya"
              >
                <div className="mb-2 px-2 py-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                    Menu lainnya
                  </p>
                </div>

                <div className="space-y-1.5">
                  {mobileMoreNavigation.map((item) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMoreOpen(false)}
                        role="menuitem"
                        className={`cloud-stock-mobile-more-item flex w-full items-center gap-3 rounded-[15px] border px-3 py-3 text-left ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
                            : "border-slate-200/80 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm dark:bg-slate-950/70">
                          <Icon
                            className="cloud-stock-mobile-more-icon"
                            size={19}
                            strokeWidth={1.9}
                          />
                        </span>
                        <span className="min-w-0 truncate text-xs font-semibold">
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

  if (pathname.startsWith("/sales/history")) {
    return "Riwayat Penjualan";
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
