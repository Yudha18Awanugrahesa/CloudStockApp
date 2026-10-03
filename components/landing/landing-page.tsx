"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Cloud,
  Database,
  LockKeyhole,
  Menu,
  Package,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Boxes,
    title: "Inventory",
    description:
      "Pantau bahan, stok masuk, stok keluar, dan kondisi persediaan secara terstruktur.",
    size: "large",
  },
  {
    icon: Package,
    title: "Produk",
    description:
      "Kelola katalog produk dan informasi produk dalam satu workspace.",
    size: "small",
  },
  {
    icon: ShoppingCart,
    title: "Penjualan",
    description:
      "Catat transaksi dan hubungkan aktivitas penjualan dengan data bisnis.",
    size: "small",
  },
  {
    icon: ClipboardList,
    title: "BOM",
    description:
      "Atur kebutuhan bahan setiap produk agar penggunaan material lebih terkontrol.",
    size: "medium",
  },
  {
    icon: BarChart3,
    title: "Laporan",
    description:
      "Dapatkan ringkasan aktivitas bisnis untuk membantu mengambil keputusan.",
    size: "medium",
  },
  {
    icon: ShieldCheck,
    title: "Role & Permission",
    description:
      "Atur akses Owner, Admin, dan Staff sesuai tanggung jawab masing-masing.",
    size: "wide",
  },
];

const businesses = [
  {
    icon: "☕",
    title: "Coffee Shop",
    text: "Bahan, produk, stok, BOM, dan transaksi.",
  },
  {
    icon: "👕",
    title: "Clothing",
    text: "Katalog produk dan persediaan lebih terstruktur.",
  },
  { icon: "🛒", title: "Retail", text: "Pantau stok, produk, dan penjualan." },
  {
    icon: "🍱",
    title: "Food & Beverage",
    text: "Hubungkan bahan, produk, dan operasional.",
  },
  {
    icon: "🍗",
    title: "Frozen Food",
    text: "Kelola persediaan dan aktivitas penjualan.",
  },
  {
    icon: "＋",
    title: "Bisnis Lainnya",
    text: "Fleksibel untuk berbagai model usaha.",
  },
];

const faqs = [
  {
    q: "Apa itu Cloud Stock?",
    a: "Cloud Stock adalah platform berbasis web untuk membantu bisnis mengelola stok, produk, penjualan, dan data operasional dalam satu sistem.",
  },
  {
    q: "Apakah Cloud Stock hanya untuk coffee shop?",
    a: "Tidak. Cloud Stock dirancang fleksibel untuk berbagai jenis bisnis seperti retail, clothing, food & beverage, frozen food, dan usaha lainnya.",
  },
  {
    q: "Apakah bisa digunakan oleh beberapa karyawan?",
    a: "Ya. Cloud Stock memiliki workspace dan role & permission sehingga akses pengguna dapat disesuaikan dengan tanggung jawabnya.",
  },
  {
    q: "Apakah harus install aplikasi?",
    a: "Tidak. Cloud Stock berbasis web sehingga dapat digunakan melalui browser.",
  },
];

const previewPages = [
  { title: "Dashboard", label: "Ringkasan bisnis" },
  { title: "Inventory", label: "Persediaan" },
  { title: "Produk", label: "Katalog produk" },
  { title: "Penjualan", label: "Transaksi" },
  { title: "Laporan", label: "Analisis bisnis" },
];

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="relative h-10 w-10 shrink-0">
        <Image
          src="/cloud-stock-logo.PNG"
          alt="Cloud Stock"
          fill
          priority
          className="object-contain"
        />
      </div>
      <div className="leading-none">
        <div
          className={`text-[15px] font-bold tracking-tight ${light ? "text-white" : "text-slate-950"}`}
        >
          Cloud Stock
        </div>
        <div
          className={`mt-1 text-[8px] font-semibold uppercase tracking-[0.2em] ${light ? "text-blue-200" : "text-slate-400"}`}
        >
          Business Management
        </div>
      </div>
    </Link>
  );
}

function ProductPreview() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % previewPages.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  const page = previewPages[active];

  return (
    <div className="relative mx-auto mt-14 max-w-6xl">
      <div className="absolute -inset-10 -z-10 rounded-[3rem] bg-blue-500/10 blur-3xl" />

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25)]">
        <div className="flex h-11 items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <div className="mx-auto hidden h-6 w-[38%] rounded-md border border-slate-200 bg-white sm:block" />
        </div>

        <div className="grid min-h-[430px] md:grid-cols-[190px_1fr]">
          <aside className="hidden border-r border-slate-200 bg-slate-50 p-4 md:block">
            <div className="flex items-center gap-2">
              <div className="relative h-7 w-7">
                <Image
                  src="/cloud-stock-logo.PNG"
                  alt=""
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-800">
                  Cloud Stock
                </div>
                <div className="text-[7px] uppercase tracking-wider text-slate-400">
                  Business
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-1.5">
              {previewPages.map((item) => (
                <div
                  key={item.title}
                  className={`rounded-lg px-3 py-2.5 text-[10px] font-medium ${
                    item.title === page.title
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  {item.title}
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-slate-200 pt-5">
              <div className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">
                Workspace
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-[8px] font-bold text-blue-700">
                  BA
                </div>
                <div>
                  <div className="text-[9px] font-semibold text-slate-700">
                    Bisnis Anda
                  </div>
                  <div className="text-[7px] text-slate-400">Owner</div>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 bg-slate-50 p-4 sm:p-7">
            <div
              key={page.title}
              className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-[fadeIn_400ms_ease-out] sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-blue-600">
                    {page.label}
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                    {page.title}
                  </div>
                  <div className="mt-2 h-2.5 w-52 max-w-full rounded-full bg-slate-100" />
                </div>
                <div className="h-9 w-24 rounded-lg bg-blue-600" />
              </div>

              {active === 0 && <DashboardMock />}
              {active === 1 && <TableMock />}
              {active === 2 && <ProductMock />}
              {active === 3 && <SalesMock />}
              {active === 4 && <ReportMock />}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row">
          <div className="text-xs font-medium text-slate-500">
            Tampilan aplikasi Cloud Stock
          </div>
          <div className="flex items-center gap-1.5">
            {previewPages.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Preview ${item.title}`}
                className={`h-2 rounded-full transition-all ${
                  active === index
                    ? "w-7 bg-blue-600"
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
          <div className="text-xs font-semibold text-blue-600">
            {String(active + 1).padStart(2, "0")} / 05
          </div>
        </div>
      </div>

      <div className="absolute -right-5 top-20 hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 lg:block">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CircleDollarSign size={18} />
          </div>
        </div>
      </div>

      <div className="absolute -left-5 bottom-24 hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 lg:block">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Package size={18} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardMock() {
  return (
    <>
      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {["Penjualan", "Transaksi", "Produk", "Stok Alert"].map((label) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
          >
            <div className="h-2.5 w-16 rounded-full bg-slate-200" />

            <div className="mt-4 h-6 w-24 max-w-full rounded-lg bg-slate-200/80" />

            <div className="mt-2 h-2 w-14 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_0.8fr]">
        <div className="rounded-xl border border-slate-200 p-5">
          <div className="mb-5 h-3 w-28 rounded bg-slate-200" />
          <div className="flex h-36 items-end gap-2">
            {[38, 52, 45, 68, 58, 80, 63, 90, 72, 84, 68, 96].map(
              (height, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-blue-500/70"
                  style={{ height: `${height}%` }}
                />
              ),
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <div className="mb-4 h-3 w-24 rounded bg-slate-200" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-100" />
                <div className="flex-1">
                  <div className="h-2.5 w-3/4 rounded bg-slate-200" />
                  <div className="mt-1.5 h-2 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function TableMock() {
  return (
    <div className="mt-7 overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-4 gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-2 rounded bg-slate-200" />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map((row) => (
        <div
          key={row}
          className="grid grid-cols-4 gap-4 border-b border-slate-100 px-4 py-4 last:border-0"
        >
          <div className="h-2.5 w-3/4 rounded bg-slate-300" />
          <div className="h-2.5 w-1/2 rounded bg-slate-100" />
          <div className="h-2.5 w-1/2 rounded bg-slate-100" />
          <div className="h-2.5 w-1/2 rounded bg-blue-100" />
        </div>
      ))}
    </div>
  );
}

function ProductMock() {
  return (
    <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-3">
          <div className="h-20 rounded-lg bg-slate-100" />
          <div className="mt-3 h-2.5 w-20 rounded bg-slate-300" />
          <div className="mt-2 h-2 w-14 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function SalesMock() {
  return (
    <div className="mt-7 grid gap-4 lg:grid-cols-[1.4fr_0.7fr]">
      <TableMock />
      <div className="rounded-xl border border-slate-200 p-5">
        <div className="h-3 w-28 rounded bg-slate-200" />
        <div className="mt-6 h-28 rounded-xl bg-blue-50" />
        <div className="mt-5 h-9 rounded-lg bg-blue-600" />
      </div>
    </div>
  );
}

function ReportMock() {
  return (
    <div className="mt-7 grid gap-4 lg:grid-cols-2">
      <DashboardMock />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [faqOpen, setFaqOpen] = useState(0);
  const [businessActive, setBusinessActive] = useState(0);

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      {/* FLOATING NAVBAR */}
      <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4 sm:px-6 sm:pt-5 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="relative rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.28)] backdrop-blur-xl transition-all duration-300 hover:border-slate-300/90 hover:bg-white/90 hover:shadow-[0_18px_50px_-20px_rgba(15,23,42,0.32)]">
            <div className="flex h-[68px] items-center justify-between px-3 sm:px-5">
              <Logo />

              <nav className="hidden items-center gap-1 md:flex">
                {[
                  ["#features", "Fitur"],
                  ["#workflow", "Workflow"],
                  ["#business", "Bisnis"],
                  ["#pricing", "Harga"],
                  ["#faq", "FAQ"],
                ].map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    className="group relative rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <span className="relative z-10">{label}</span>
                    <span className="absolute inset-x-3 bottom-1 h-0.5 origin-center scale-x-0 rounded-full bg-blue-600 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                  </a>
                ))}
              </nav>

              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/login"
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-950"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/25"
                >
                  Mulai Gratis
                  <ArrowRight
                    size={15}
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenu((value) => !value)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-700 transition-all duration-300 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 sm:hidden"
                aria-label="Menu"
                aria-expanded={mobileMenu}
              >
                {mobileMenu ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            {mobileMenu && (
              <div className="border-t border-slate-200/80 px-3 pb-3 pt-2 sm:hidden">
                <div className="rounded-xl bg-slate-50/80 p-2">
                  <div className="space-y-1">
                    {[
                      ["#features", "Fitur"],
                      ["#workflow", "Workflow"],
                      ["#business", "Bisnis"],
                      ["#pricing", "Harga"],
                      ["#faq", "FAQ"],
                    ].map(([href, label]) => (
                      <a
                        key={href}
                        href={href}
                        onClick={() => setMobileMenu(false)}
                        className="group flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 hover:bg-white hover:text-blue-600 hover:shadow-sm"
                      >
                        <span>{label}</span>
                        <ArrowRight
                          size={15}
                          className="opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
                        />
                      </a>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenu(false)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition-all duration-300 hover:border-slate-300 hover:bg-slate-50"
                    >
                      Masuk
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenu(false)}
                      className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition-all duration-300 hover:bg-blue-700"
                    >
                      Mulai Gratis
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-50">
        <div className="absolute left-1/2 top-0 -z-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-[-180px] top-40 -z-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-6 sm:pb-28 sm:pt-36 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-sm">
              <Sparkles size={14} />
              Business management made simpler
            </div>

            <h1 className="mt-7 text-5xl font-bold tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
              Operasional bisnis,
              <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                lebih terstruktur.
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Kelola inventory, produk, penjualan, dan laporan dari satu
              platform yang dirancang untuk berbagai jenis bisnis.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Mulai Gratis
                <ArrowRight
                  size={17}
                  className="transition group-hover:translate-x-0.5"
                />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Jelajahi Fitur
              </a>
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      {/* SIGNAL */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-5 py-7 text-xs font-semibold text-slate-500 sm:px-6 lg:px-8">
          <span className="flex items-center gap-2">
            <Cloud size={16} className="text-blue-600" /> Berbasis Web
          </span>
          <span className="flex items-center gap-2">
            <Users size={16} className="text-blue-600" /> Multi-User
          </span>
          <span className="flex items-center gap-2">
            <LockKeyhole size={16} className="text-blue-600" /> Role &
            Permission
          </span>
          <span className="flex items-center gap-2">
            <Database size={16} className="text-blue-600" /> Data Terintegrasi
          </span>
          <span className="flex items-center gap-2">
            <Zap size={16} className="text-blue-600" /> Siap Berkembang
          </span>
        </div>
      </section>

      {/* PROBLEM → SOLUTION */}
      <section className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Lebih terstruktur"
            title={
              <>
                Jangan biarkan operasional bisnis{" "}
                <span className="text-blue-600">tersebar.</span>
              </>
            }
            description="Satukan aktivitas penting bisnis dalam satu alur yang lebih mudah dipantau."
          />

          <div className="mt-14 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-7 sm:p-9">
              <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                Sebelum
              </div>
              <h3 className="mt-3 text-2xl font-bold text-slate-950">
                Data ada di banyak tempat.
              </h3>
              <div className="mt-8 space-y-3">
                {[
                  "Catatan stok manual",
                  "Data transaksi terpisah",
                  "Sulit melihat kondisi persediaan",
                  "Akses tim belum terstruktur",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-600"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      —
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-900/15 sm:p-9">
              <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-600/30 blur-3xl" />
              <div className="relative">
                <div className="text-xs font-bold uppercase tracking-[0.15em] text-blue-300">
                  Dengan Cloud Stock
                </div>
                <h3 className="mt-3 text-2xl font-bold">
                  Satu platform untuk menghubungkan semuanya.
                </h3>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Inventory", Boxes],
                    ["Products", Package],
                    ["Sales", ShoppingCart],
                    ["Reports", BarChart3],
                  ].map(([label, Icon]) => {
                    const IconComponent = Icon as typeof Boxes;
                    return (
                      <div
                        key={label as string}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-300">
                          <IconComponent size={19} />
                        </div>
                        <span className="text-sm font-semibold">
                          {label as string}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <Link
                  href="/register"
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
                >
                  Mulai dengan Cloud Stock <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES BENTO */}
      <section id="features" className="bg-slate-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Core features"
            title={
              <>
                Semua yang dibutuhkan bisnis,{" "}
                <span className="text-blue-600">dalam satu tempat.</span>
              </>
            }
            description="Cloud Stock menghubungkan proses utama bisnis tanpa membuat alur kerja terasa rumit."
          />

          <div className="mt-14 grid gap-4 lg:grid-cols-4 lg:grid-rows-2">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const large = index === 0;
              const wide = index === 5;

              return (
                <div
                  key={feature.title}
                  className={`group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl hover:shadow-slate-900/5 ${
                    large
                      ? "lg:col-span-2 lg:row-span-2"
                      : wide
                        ? "lg:col-span-2"
                        : ""
                  }`}
                >
                  {large && (
                    <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-50 blur-2xl transition group-hover:bg-blue-100" />
                  )}
                  <div className="relative">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${large ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"}`}
                    >
                      <Icon size={22} />
                    </div>
                    <h3
                      className={`${large ? "mt-16 text-2xl" : "mt-6 text-lg"} font-bold text-slate-950`}
                    >
                      {feature.title}
                    </h3>
                    <p
                      className={`${large ? "mt-4 max-w-md text-base" : "mt-2 text-sm"} leading-7 text-slate-600`}
                    >
                      {feature.description}
                    </p>
                    {large && (
                      <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-end gap-2">
                          {[40, 55, 45, 70, 60, 82, 68, 92].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-t-md bg-blue-500/70"
                              style={{ height: `${h}px` }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Workflow"
            title={
              <>
                Satu alur, dari{" "}
                <span className="text-blue-600">stok sampai laporan.</span>
              </>
            }
            description="Cloud Stock dirancang agar aktivitas bisnis saling terhubung."
          />

          <div className="relative mt-16">
            <div className="absolute left-[10%] right-[10%] top-12 hidden h-px bg-slate-200 lg:block" />
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["01", "Inventory", Boxes],
                ["02", "Produk", Package],
                ["03", "BOM", ClipboardList],
                ["04", "Penjualan", ShoppingCart],
                ["05", "Laporan", BarChart3],
              ].map(([number, title, Icon]) => {
                const IconComponent = Icon as typeof Boxes;
                return (
                  <div key={title as string} className="relative text-center">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white text-blue-600 shadow-lg shadow-slate-900/5">
                      <IconComponent size={28} />
                    </div>
                    <div className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
                      {number as string}
                    </div>
                    <h3 className="mt-2 font-bold text-slate-950">
                      {title as string}
                    </h3>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* BUSINESS */}
      <section id="business" className="bg-slate-950 py-24 text-white sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
                Fleksibel untuk bisnismu
              </span>
              <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                Satu platform,
                <span className="block text-blue-400">
                  berbagai model bisnis.
                </span>
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">
                Struktur Cloud Stock dibuat fleksibel sehingga dapat mengikuti
                kebutuhan operasional berbagai jenis usaha.
              </p>
              <Link
                href="/register"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
              >
                Coba Cloud Stock <ArrowRight size={16} />
              </Link>
            </div>

            <div>
              <div className="grid gap-3 sm:grid-cols-2">
                {businesses.map((business, index) => (
                  <button
                    key={business.title}
                    type="button"
                    onMouseEnter={() => setBusinessActive(index)}
                    onFocus={() => setBusinessActive(index)}
                    className={`text-left rounded-2xl border p-5 transition ${
                      businessActive === index
                        ? "border-blue-500/60 bg-blue-600/15"
                        : "border-white/10 bg-white/[0.04] hover:border-white/20"
                    }`}
                  >
                    <div className="text-2xl">{business.icon}</div>
                    <div className="mt-4 font-bold">{business.title}</div>
                    <div className="mt-1.5 text-sm leading-6 text-slate-400">
                      {business.text}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-3 rounded-2xl border border-blue-500/20 bg-blue-600/10 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className="text-xs text-blue-300">
                      Contoh penggunaan
                    </div>
                    <div className="mt-0.5 font-semibold">
                      {businesses[businessActive].title}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Kenapa Cloud Stock?
              </span>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                Dibuat untuk bisnis yang ingin
                <span className="text-blue-600"> lebih terkontrol.</span>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                Bukan sekadar mencatat data. Cloud Stock membantu menyatukan
                proses bisnis agar lebih mudah dipantau dan dikembangkan.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [
                  "Berbasis Web",
                  "Akses melalui browser tanpa instalasi.",
                  Cloud,
                ],
                ["Multi-User", "Gunakan workspace bersama tim.", Users],
                [
                  "Role & Permission",
                  "Atur akses berdasarkan peran.",
                  LockKeyhole,
                ],
                [
                  "Data Terintegrasi",
                  "Inventory, produk, sales, dan laporan.",
                  Database,
                ],
                ["Siap Berkembang", "Struktur workspace untuk bisnis.", Zap],
                [
                  "Backup & Restore",
                  "Kelola pencadangan data bisnis.",
                  ShieldCheck,
                ],
              ].map(([title, text, Icon]) => {
                const IconComponent = Icon as typeof Cloud;
                return (
                  <div
                    key={title as string}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-blue-200 hover:bg-white hover:shadow-lg"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <IconComponent size={18} />
                    </div>
                    <h3 className="mt-4 text-sm font-bold text-slate-950">
                      {title as string}
                    </h3>
                    <p className="mt-1.5 text-xs leading-5 text-slate-500">
                      {text as string}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-slate-50 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Pricing"
            title={
              <>
                Mulai sederhana.{" "}
                <span className="text-blue-600">Berkembang bersama.</span>
              </>
            }
            description="Mulai menggunakan Cloud Stock tanpa proses yang rumit."
          />

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <div className="rounded-[2rem] border border-blue-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                    Starter
                  </div>
                  <h3 className="mt-3 text-2xl font-bold text-slate-950">
                    Mulai Gratis
                  </h3>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Zap size={20} />
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Cocok untuk mulai membangun pengelolaan bisnis yang lebih
                terstruktur.
              </p>
              <div className="mt-7 space-y-3">
                {[
                  "Inventory",
                  "Produk & BOM",
                  "Penjualan",
                  "Laporan",
                  "Workspace & Role",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2.5 text-sm text-slate-600"
                  >
                    <Check size={16} className="text-blue-600" /> {item}
                  </div>
                ))}
              </div>
              <Link
                href="/register"
                className="mt-8 block rounded-xl bg-blue-600 px-5 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Mulai Gratis
              </Link>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-7 text-white sm:p-9">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.15em] text-blue-300">
                    Business
                  </div>
                  <h3 className="mt-3 text-2xl font-bold">Segera Hadir</h3>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-blue-300">
                  <Sparkles size={20} />
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Untuk bisnis yang membutuhkan kapasitas dan fitur lebih besar.
              </p>
              <div className="mt-7 space-y-3 text-sm text-slate-400">
                {[
                  "Fitur bisnis lanjutan",
                  "Kapasitas lebih besar",
                  "Pengelolaan tim lebih luas",
                  "Dukungan kebutuhan bisnis",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <Check size={16} className="text-blue-400" /> {item}
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-center text-sm font-semibold text-slate-300">
                Coming Soon
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="FAQ"
            title={
              <>
                Pertanyaan yang{" "}
                <span className="text-blue-600">sering ditanyakan.</span>
              </>
            }
          />

          <div className="mt-12 divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map((item, index) => {
              const open = faqOpen === index;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setFaqOpen(open ? -1 : index)}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <span className="font-semibold text-slate-900">
                      {item.q}
                    </span>
                    <ChevronDown
                      size={19}
                      className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && (
                    <div className="pb-6 pr-10 text-sm leading-7 text-slate-600">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden bg-blue-600 py-24 sm:py-28">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-6">
          <h2 className="mt-7 text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Kelola bisnis.
            <span className="block text-blue-100">Bukan kerumitannya.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-blue-100 sm:text-lg">
            Mulai bangun pengelolaan bisnis yang lebih rapi bersama Cloud Stock.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-blue-700 shadow-xl transition hover:-translate-y-0.5 hover:bg-blue-50"
          >
            Mulai Gratis <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-10 md:flex-row">
            <div>
              <Logo light />
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
                Platform manajemen bisnis berbasis web untuk membantu bisnis
                mengelola inventory, produk, penjualan, dan operasional.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-14 gap-y-4 text-sm text-slate-400">
              <a href="#features" className="transition hover:text-white">
                Fitur
              </a>
              <a href="#workflow" className="transition hover:text-white">
                Workflow
              </a>
              <a href="#business" className="transition hover:text-white">
                Bisnis
              </a>
              <a href="#pricing" className="transition hover:text-white">
                Harga
              </a>
              <a href="#faq" className="transition hover:text-white">
                FAQ
              </a>
              <Link href="/login" className="transition hover:text-white">
                Masuk
              </Link>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-xs text-slate-500">
            © {new Date().getFullYear()} Cloud Stock · Cloud Corp. All rights
            reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
