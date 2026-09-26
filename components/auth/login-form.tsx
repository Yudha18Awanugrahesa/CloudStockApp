"use client";

import { FormEvent, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  LockKeyhole,
  Package,
  ShoppingCart,
} from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) {
      console.error("LOGIN ERROR:", loginError);
      setError(loginError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (googleError) {
      console.error("GOOGLE LOGIN ERROR:", googleError);
      setError(googleError.message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f8fc] px-3 py-3 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
      <div
        className="
          mx-auto
          grid
          w-full
          max-w-[1240px]
          overflow-hidden
          rounded-[30px]
          border
          border-white
          bg-white
          shadow-[0_30px_90px_-40px_rgba(15,23,42,0.32)]
          lg:h-[calc(100dvh-3rem)]
          lg:min-h-[680px]
          lg:grid-cols-[1.08fr_0.92fr]
        "
      >
        {/* =========================
            LEFT BRAND PANEL
        ========================== */}
        <BrandPanel />

        {/* =========================
            LOGIN FORM
        ========================== */}
        <section
          className="
            flex
            items-center
            justify-center
            bg-white
            px-5
            py-8
            sm:px-10
            lg:min-h-0
            lg:px-12
            lg:py-8
            xl:px-16
          "
        >
          <div className="w-full max-w-[420px]">
            <MobileBrand />

            {/* HEADER */}
            <div className="mb-7">
              <div className="mb-5 hidden h-1 w-12 rounded-full bg-blue-600 lg:block" />

              <h1
                className="
                  text-[30px]
                  font-extrabold
                  tracking-[-0.035em]
                  text-slate-950
                  sm:text-[34px]
                "
              >
                Welcome Back!
              </h1>

              <p
                className="
                  mt-2
                  max-w-[380px]
                  text-sm
                  leading-6
                  text-slate-500
                "
              >
                Masuk ke akun Cloud Stock untuk melanjutkan pengelolaan bisnis
                Anda.
              </p>
            </div>

            {/* FORM */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* EMAIL */}
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="auth-input"
                />
              </Field>

              {/* PASSWORD */}
              <Field
                label="Password"
                action={
                  <button
                    type="button"
                    className="
                      text-xs
                      font-semibold
                      text-blue-600
                      transition
                      hover:text-blue-700
                    "
                  >
                    Lupa password?
                  </button>
                }
              >
                <div className="relative">
                  <LockKeyhole
                    className="
                      pointer-events-none
                      absolute
                      left-4
                      top-1/2
                      h-5
                      w-5
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="
                      h-14
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      bg-slate-50
                      pl-12
                      pr-12
                      text-sm
                      text-slate-900
                      outline-none
                      transition
                      focus:border-blue-500
                      focus:bg-white
                      focus:ring-4
                      focus:ring-blue-500/10
                    "
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                    className="
                      absolute
                      right-2
                      top-1/2
                      flex
                      h-8
                      w-8
                      -translate-y-1/2
                      items-center
                      justify-center
                      rounded-lg
                      text-slate-400
                      transition
                      hover:bg-slate-100
                      hover:text-slate-600
                    "
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </Field>

              {/* ERROR */}
              {error && (
                <div
                  role="alert"
                  className="
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-3
                    text-sm
                    leading-5
                    text-red-600
                  "
                >
                  {error}
                </div>
              )}

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="
                  group
                  flex
                  h-12
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-gradient-to-r
                  from-blue-600
                  to-cyan-500
                  text-sm
                  font-bold
                  text-white
                  shadow-[0_12px_24px_-12px_rgba(37,99,235,0.55)]
                  transition
                  hover:brightness-105
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                <span>{loading ? "Memproses..." : "Masuk"}</span>

                {!loading && (
                  <ArrowRight
                    size={17}
                    className="
                      transition-transform
                      group-hover:translate-x-0.5
                    "
                  />
                )}
              </button>
            </form>

            {/* DIVIDER */}
            <Divider text="atau masuk dengan" />

            {/* GOOGLE */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="
                flex
                h-12
                w-full
                items-center
                justify-center
                gap-3
                rounded-xl
                border
                border-slate-200
                bg-white
                text-sm
                font-semibold
                text-slate-700
                shadow-sm
                transition
                hover:border-slate-300
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <GoogleIcon />
              Masuk dengan Google
            </button>

            {/* REGISTER LINK */}
            <div
              className="
                mt-7
                border-t
                border-slate-100
                pt-6
                text-center
              "
            >
              <p className="text-sm text-slate-500">
                Belum punya akun?{" "}
                <Link
                  href="/register"
                  className="
                    font-bold
                    text-blue-600
                    transition
                    hover:text-blue-700
                    hover:underline
                  "
                >
                  Daftar sekarang
                </Link>
              </p>
            </div>

            {/* SECURITY */}
            <div
              className="
                mt-6
                flex
                items-center
                justify-center
                gap-2
                text-xs
                text-slate-400
              "
            >
              <LockKeyhole size={13} />
              Data Anda terlindungi dan aman
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   LEFT BRAND PANEL
   ========================================================= */

function BrandPanel() {
  return (
    <section
      className="
        relative
        hidden
        min-h-0
        overflow-hidden
        bg-[radial-gradient(circle_at_75%_15%,#bcecff_0,#70c9ff_25%,#3b82f6_62%,#1d4ed8_100%)]
        lg:flex
      "
    >
      {/* Decorative glow */}
      <div
        className="
          pointer-events-none
          absolute
          -right-24
          -top-28
          h-80
          w-80
          rounded-full
          bg-white/20
          blur-2xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -bottom-36
          -left-28
          h-96
          w-96
          rounded-full
          bg-white/15
          blur-3xl
        "
      />

      {/* MAIN PANEL */}
      <div
        className="
          relative
          z-10
          flex
          min-h-0
          w-full
          flex-col
          overflow-hidden
          p-[clamp(20px,2.2vh,34px)]
        "
      >
        {/* =========================
            LOGO
        ========================== */}
        <Link
          href="/login"
          className="
            flex
            w-fit
            shrink-0
            items-center
            gap-3
          "
        >
          <img
            src="/cloud-stock-logo.PNG"
            alt="Cloud Stock"
            className="
              h-[clamp(42px,5.2vh,52px)]
              w-[clamp(42px,5.2vh,52px)]
              rounded-2xl
              bg-white
              p-1.5
              object-contain
              shadow-lg
            "
          />

          <div>
            <p
              className="
                text-[clamp(17px,2.1vh,21px)]
                font-extrabold
                tracking-tight
                text-slate-950
              "
            >
              Cloud Stock
            </p>

            <p className="text-[10px] font-medium text-slate-600">
              Smart Business Management
            </p>
          </div>
        </Link>

        {/* =========================
            INTRO
        ========================== */}
        <div
          className="
            mt-[clamp(16px,3.5vh,38px)]
            max-w-[590px]
            shrink-0
          "
        >
          <p
            className="
              mb-2.5
              text-[10px]
              font-bold
              uppercase
              tracking-[0.18em]
              text-blue-800
              xl:text-xs
            "
          >
            Business management made simple
          </p>

          <h2
            className="
              text-[clamp(31px,4.4vh,48px)]
              font-extrabold
              leading-[0.98]
              tracking-[-0.045em]
              text-slate-950
            "
          >
            Kelola bisnis
            <br />
            lebih <span className="text-blue-700">sederhana.</span>
          </h2>

          <p
            className="
              mt-[clamp(8px,1.5vh,16px)]
              max-w-[500px]
              text-[clamp(11px,1.55vh,15px)]
              leading-[1.55]
              text-slate-700
            "
          >
            Pantau stok, kelola produk, catat penjualan, dan lihat perkembangan
            bisnis dalam satu sistem yang terintegrasi.
          </p>
        </div>

        {/* =========================
            PREVIEW
            FLEXIBLE
        ========================== */}
        <div
          className="
            mt-[clamp(14px,2.4vh,26px)]
            min-h-0
            flex-1
          "
        >
          <DashboardPreview />

          {/* FEATURES */}
          <div
            className="
              mt-[clamp(7px,1.2vh,14px)]
              grid
              grid-cols-3
              gap-[clamp(6px,0.8vw,10px)]
            "
          >
            <Feature
              icon={<Package size={18} />}
              title="Inventory"
              text="Kontrol stok"
            />

            <Feature
              icon={<ShoppingCart size={18} />}
              title="Penjualan"
              text="Transaksi rapi"
            />

            <Feature
              icon={<BarChart3 size={18} />}
              title="Laporan"
              text="Pantau bisnis"
            />
          </div>
        </div>

        {/* =========================
            FOOTER
        ========================== */}
        <p
          className="
            mt-[clamp(6px,1vh,12px)]
            shrink-0
            text-[9px]
            text-slate-600
          "
        >
          © {new Date().getFullYear()} Cloud Stock
        </p>
      </div>
    </section>
  );
}

/* =========================================================
   DASHBOARD PREVIEW
   ========================================================= */

function DashboardPreview() {
  return (
    <div
      className="
        w-full
        rotate-[-1.5deg]
        overflow-hidden
        rounded-[20px]
        border
        border-white/80
        bg-white/80
        p-[clamp(5px,0.7vh,8px)]
        shadow-[0_25px_50px_-25px_rgba(15,23,42,0.4)]
        backdrop-blur
      "
    >
      <div className="overflow-hidden rounded-[15px] bg-white">
        {/* Browser bar */}
        <div
          className="
            flex
            items-center
            gap-1.5
            border-b
            border-slate-100
            px-3
            py-2
          "
        >
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-emerald-400" />

          <span
            className="
              ml-auto
              h-2
              w-24
              rounded-full
              bg-blue-100
            "
          />
        </div>

        {/* Dashboard */}
        <div className="grid grid-cols-[48px_1fr]">
          {/* Sidebar */}
          <div
            className="
              border-r
              border-slate-100
              bg-slate-50
              p-2.5
            "
          >
            <div
              className="
                mx-auto
                h-7
                w-7
                rounded-lg
                bg-blue-600
              "
            />

            <div className="mt-4 space-y-2.5">
              <div className="mx-auto h-1.5 w-6 rounded-full bg-blue-200" />
              <div className="mx-auto h-1.5 w-5 rounded-full bg-slate-200" />
              <div className="mx-auto h-1.5 w-6 rounded-full bg-slate-200" />
            </div>
          </div>

          {/* Main dashboard */}
          <div className="min-w-0 p-3">
            {/* Header */}
            <div className="flex justify-between gap-3">
              <div>
                <div className="h-2 w-16 rounded bg-slate-200" />

                <div className="mt-2 h-4 w-28 rounded bg-slate-800" />
              </div>

              <div className="h-7 w-16 shrink-0 rounded-lg bg-blue-50" />
            </div>

            {/* Summary cards */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="
                    rounded-xl
                    border
                    border-slate-100
                    p-3
                    shadow-sm
                  "
                >
                  <div className="h-2 w-10 rounded bg-slate-200" />

                  <div className="mt-2 h-3 w-14 rounded bg-slate-800" />

                  <div
                    className="
                      mt-2
                      h-1.5
                      w-8
                      rounded
                      bg-blue-200
                    "
                  />
                </div>
              ))}
            </div>

            {/* Chart */}
            <div
              className="
                mt-3
                rounded-xl
                border
                border-slate-100
                p-3
              "
            >
              <div className="h-2 w-20 rounded bg-slate-200" />

              <div
                className="
                  mt-3
                  flex
                  h-16
                  items-end
                  gap-2
                "
              >
                {[35, 50, 42, 68, 58, 82, 72].map((height, index) => (
                  <div
                    key={index}
                    style={{
                      height: `${height}%`,
                    }}
                    className={`
                        flex-1
                        rounded-t-md
                        ${index === 5 ? "bg-blue-500" : "bg-blue-200"}
                      `}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FEATURE CARD
   ========================================================= */

function Feature({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div
      className="
        min-w-0
        rounded-2xl
        border
        border-white/70
        bg-white/60
        p-[clamp(8px,1vh,12px)]
        backdrop-blur
      "
    >
      <div className="text-slate-700">{icon}</div>

      <p
        className="
          mt-1.5
          text-[11px]
          font-bold
          text-slate-900
        "
      >
        {title}
      </p>

      <p className="mt-0.5 text-[9px] text-slate-600">{text}</p>
    </div>
  );
}

/* =========================================================
   MOBILE BRAND
   ========================================================= */

function MobileBrand() {
  return (
    <div
      className="
        mb-8
        flex
        items-center
        gap-3
        lg:hidden
      "
    >
      <img
        src="/cloud-stock-logo.PNG"
        alt="Cloud Stock"
        className="
          h-11
          w-11
          rounded-2xl
          border
          border-slate-200
          bg-white
          p-1
          object-contain
          shadow-sm
        "
      />

      <div>
        <p
          className="
            text-lg
            font-extrabold
            tracking-tight
            text-slate-950
          "
        >
          Cloud Stock
        </p>

        <p className="text-[10px] text-slate-400">Smart Business Management</p>
      </div>
    </div>
  );
}

/* =========================================================
   FIELD
   ========================================================= */

function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div
        className="
          mb-2
          flex
          items-center
          justify-between
        "
      >
        <label
          className="
            text-sm
            font-semibold
            text-slate-700
          "
        >
          {label}
        </label>

        {action}
      </div>

      {children}
    </div>
  );
}

/* =========================================================
   DIVIDER
   ========================================================= */

function Divider({ text }: { text: string }) {
  return (
    <div
      className="
        relative
        my-5
        flex
        items-center
        justify-center
      "
    >
      <div
        className="
          absolute
          w-full
          border-t
          border-slate-100
        "
      />

      <span
        className="
          relative
          bg-white
          px-3
          text-[11px]
          text-slate-400
        "
      >
        {text}
      </span>
    </div>
  );
}

/* =========================================================
   GOOGLE ICON
   ========================================================= */

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.35 12.2c0-.7-.06-1.37-.18-2H12v3.79h5.22a4.46 4.46 0 0 1-1.94 2.92v2.43h3.14c1.84-1.69 2.93-4.18 2.93-7.14Z"
      />

      <path
        fill="#34A853"
        d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.43c-.87.58-1.98.93-3.31.93-2.54 0-4.7-1.72-5.47-4.03H3.29v2.51A9.74 9.74 0 0 0 12 21.5Z"
      />

      <path
        fill="#FBBC05"
        d="M6.53 13.61A5.86 5.86 0 0 1 6.22 12c0-.56.1-1.1.31-1.61V7.88H3.29A9.5 9.5 0 0 0 2.25 12c0 1.53.37 2.98 1.04 4.12l3.24-2.51Z"
      />

      <path
        fill="#EA4335"
        d="M12 6.36c1.43 0 2.72.49 3.74 1.45l2.8-2.8C16.84 3.45 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.71 5.38l3.24 2.51c1.02-2.31 3.18-4.03 5.72-4.03Z"
      />
    </svg>
  );
}
