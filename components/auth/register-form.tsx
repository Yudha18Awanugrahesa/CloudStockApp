"use client";

import { FormEvent, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  BarChart3,
  Package,
  ShoppingCart,
  Store,
} from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
      error: signUpError,
    } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (signUpError) {
      console.error("REGISTER ERROR:", signUpError);
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!user) {
      setError("User gagal dibuat.");
      setLoading(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc(
      "create_workspace_for_user",
      {
        workspace_name: workspaceName.trim(),
      },
    );

    if (rpcError) {
      console.error("CREATE WORKSPACE ERROR:", rpcError);
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    setSuccess("Akun berhasil dibuat. Mengarahkan ke dashboard...");

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleRegister() {
    setLoading(true);
    setError("");
    setSuccess("");

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (googleError) {
      console.error("GOOGLE REGISTER ERROR:", googleError);
      setError(googleError.message);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[#f5f8fc] px-3 py-3 sm:px-5 sm:py-5 lg:px-7 lg:py-7">
      <div className="mx-auto grid w-full max-w-[1240px] overflow-hidden rounded-[30px] border border-white bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.32)] lg:h-[calc(100svh-3.5rem)] lg:min-h-0 lg:grid-cols-[1.08fr_0.92fr]">
        {/* =====================================================
            LEFT BRAND PANEL
        ====================================================== */}

        <RegisterBrandPanel />

        {/* =====================================================
            RIGHT REGISTER FORM
        ====================================================== */}

        <section className="flex min-h-0 items-center justify-center bg-white px-5 py-7 sm:px-10 lg:px-10 lg:py-6 xl:px-12">
          <div className="w-full max-w-[420px]">
            <MobileBrand />

            {/* HEADER */}

            <div className="mb-5">
              <div className="mb-4 hidden h-1 w-12 rounded-full bg-orange-500 lg:block" />

              <h1 className="text-[28px] font-extrabold tracking-[-0.035em] text-slate-950 sm:text-[32px]">
                Get Started Free
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Buat akun Cloud Stock dan mulai kelola bisnis Anda sekarang.
              </p>
            </div>

            {/* =================================================
                REGISTER FORM
            ================================================== */}

            <form onSubmit={handleRegister} className="space-y-3">
              {/* EMAIL */}

              <SimpleField
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="nama@email.com"
                autoComplete="email"
                icon="email"
                disabled={loading}
              />

              {/* NAMA */}

              <SimpleField
                type="text"
                value={name}
                onChange={setName}
                placeholder="Nama lengkap"
                autoComplete="name"
                icon="user"
                disabled={loading}
              />

              {/* WORKSPACE */}

              <div className="relative w-full">
                <Store className="pointer-events-none absolute left-4 top-1/2 z-10 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Nama workspace bisnis"
                  autoComplete="organization"
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
                    pr-4
                    text-sm
                    text-slate-900
                    placeholder:text-slate-400
                    outline-none
                    transition
                    focus:border-orange-400
                    focus:bg-white
                    focus:ring-4
                    focus:ring-orange-500/10
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                />
              </div>

              {/* PASSWORD */}

              <PasswordField
                value={password}
                onChange={setPassword}
                placeholder="Masukkan password"
                show={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                disabled={loading}
              />

              {/* CONFIRM PASSWORD */}

              <PasswordField
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Konfirmasi password"
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((value) => !value)}
                disabled={loading}
              />

              {/* ERROR */}

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                >
                  {error}
                </div>
              )}

              {/* SUCCESS */}

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
                  {success}
                </div>
              )}

              {/* REGISTER BUTTON */}

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
                  from-orange-500
                  to-amber-400
                  text-sm
                  font-bold
                  text-white
                  shadow-[0_12px_24px_-12px_rgba(249,115,22,0.55)]
                  transition
                  hover:brightness-105
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                <span>{loading ? "Membuat akun..." : "Daftar Sekarang"}</span>

                {!loading && (
                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                )}
              </button>
            </form>

            {/* GOOGLE */}

            <Divider text="atau daftar dengan" />

            <button
              type="button"
              onClick={handleGoogleRegister}
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

              <span>Daftar dengan Google</span>
            </button>

            {/* LOGIN LINK */}

            <div className="mt-6 border-t border-slate-100 pt-5 text-center">
              <p className="text-sm text-slate-500">
                Sudah punya akun?{" "}
                <Link
                  href="/login"
                  className="font-bold text-orange-600 hover:text-orange-700 hover:underline"
                >
                  Masuk sekarang
                </Link>
              </p>
            </div>

            {/* SECURITY */}

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
              <LockKeyhole size={13} />
              Data Anda terlindungi dan aman
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ============================================================
   LEFT BRAND PANEL
============================================================ */

function RegisterBrandPanel() {
  return (
    <section className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_75%_15%,#fff5bf_0,#ffe58b_28%,#fbbf24_62%,#f97316_100%)] lg:flex">
      <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-white/25 blur-2xl" />

      <div className="absolute -bottom-36 -left-28 h-96 w-96 rounded-full bg-white/15 blur-3xl" />

      <div className="relative z-10 flex min-h-0 w-full flex-col p-6 sm:p-7 lg:p-7 xl:p-8">
        {/* BRAND */}

        <Link href="/register" className="flex w-fit items-center gap-3">
          <img
            src="/cloud-stock-logo.PNG"
            alt="Cloud Stock"
            className="h-12 w-12 rounded-2xl bg-white object-contain p-1.5 shadow-lg"
          />

          <div>
            <p className="text-xl font-extrabold tracking-tight text-slate-950">
              Cloud Stock
            </p>

            <p className="text-[11px] font-medium text-slate-600">
              Smart Business Management
            </p>
          </div>
        </Link>

        {/* HERO */}

        <div className="mt-6 max-w-[590px] xl:mt-7">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-700">
            Start your business journey
          </p>

          <h2 className="text-[34px] font-extrabold leading-[0.98] tracking-[-0.045em] text-slate-950 lg:text-[38px] xl:text-[44px]">
            Mulai kelola
            <br />
            <span className="text-orange-600">bisnis Anda.</span>
          </h2>

          <p className="mt-3 max-w-[500px] text-[13px] leading-5 text-slate-700">
            Buat workspace bisnis Anda dan kelola stok, produk, penjualan, serta
            aktivitas bisnis dengan lebih mudah.
          </p>
        </div>

        {/* PREVIEW */}

        <div className="mt-auto min-h-0 pt-4">
          <RegisterPreview />

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Feature
              icon={<Package size={18} />}
              title="Workspace"
              text="Atur bisnis"
            />

            <Feature
              icon={<ShoppingCart size={18} />}
              title="Tim"
              text="Kerja bersama"
            />

            <Feature
              icon={<BarChart3 size={18} />}
              title="Tumbuh"
              text="Pantau bisnis"
            />
          </div>

          <p className="mt-2 text-[9px] text-slate-600">
            © {new Date().getFullYear()} Cloud Stock
          </p>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   REGISTER PREVIEW
============================================================ */

function RegisterPreview() {
  return (
    <div className="relative rotate-[-1.5deg] rounded-[18px] border border-white/70 bg-white/75 p-1.5 shadow-[0_20px_40px_-22px_rgba(15,23,42,0.4)]">
      <div className="overflow-hidden rounded-[14px] bg-white">
        {/* WINDOW BAR */}

        <div className="flex items-center gap-1 border-b border-slate-100 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />

          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />

          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

          <span className="ml-auto h-1.5 w-20 rounded-full bg-orange-100" />
        </div>

        {/* MOCK DASHBOARD */}

        <div className="grid grid-cols-[42px_1fr]">
          {/* SIDEBAR */}

          <div className="border-r border-slate-100 bg-slate-50 p-2">
            <div className="mx-auto h-6 w-6 rounded-lg bg-orange-500" />

            <div className="mt-3 space-y-2">
              <div className="mx-auto h-1 w-5 rounded-full bg-orange-200" />

              <div className="mx-auto h-1 w-4 rounded-full bg-slate-200" />

              <div className="mx-auto h-1 w-5 rounded-full bg-slate-200" />
            </div>
          </div>

          {/* CONTENT */}

          <div className="p-2.5">
            <div className="flex justify-between">
              <div>
                <div className="h-2 w-16 rounded bg-slate-200" />

                <div className="mt-1.5 h-3.5 w-24 rounded bg-slate-800" />
              </div>

              <div className="h-6 w-14 rounded-lg bg-orange-50" />
            </div>

            <div className="mt-2 space-y-1.5">
              {["Biji Kopi", "Susu UHT", "Cup Plastik", "Gula Aren"].map(
                (item, index) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-1.5"
                  >
                    <div>
                      <div className="h-2 w-20 rounded bg-slate-200" />

                      <div className="mt-0.5 h-1.5 w-10 rounded bg-slate-100" />
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[8px] font-bold ${
                        index % 2 === 0
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-orange-50 text-orange-600"
                      }`}
                    >
                      {index % 2 === 0 ? "Normal" : "Menipis"}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MOBILE BRAND
============================================================ */

function MobileBrand() {
  return (
    <div className="mb-8 flex items-center gap-3 lg:hidden">
      <img
        src="/cloud-stock-logo.PNG"
        alt="Cloud Stock"
        className="h-11 w-11 rounded-2xl border border-slate-200 bg-white object-contain p-1 shadow-sm"
      />

      <div>
        <p className="text-lg font-extrabold tracking-tight text-slate-950">
          Cloud Stock
        </p>

        <p className="text-[10px] text-slate-400">Smart Business Management</p>
      </div>
    </div>
  );
}

/* ============================================================
   SIMPLE FIELD
============================================================ */

function SimpleField({
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  icon,
  disabled,
}: {
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  icon: "email" | "user";
  disabled: boolean;
}) {
  return (
    <div className="relative w-full">
      <span className="pointer-events-none absolute left-4 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-slate-400">
        {icon === "email" ? <MailIcon /> : <UserIcon />}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        disabled={disabled}
        className="
          h-14
          w-full
          rounded-xl
          border
          border-slate-200
          bg-slate-50
          pl-12
          pr-4
          text-sm
          text-slate-900
          placeholder:text-slate-400
          outline-none
          transition
          focus:border-orange-400
          focus:bg-white
          focus:ring-4
          focus:ring-orange-500/10
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
      />
    </div>
  );
}

/* ============================================================
   PASSWORD FIELD
============================================================ */

function PasswordField({
  value,
  onChange,
  placeholder,
  show,
  onToggle,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <div className="relative w-full">
      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 z-10 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />

      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        required
        disabled={disabled}
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
          placeholder:text-slate-400
          outline-none
          transition
          focus:border-orange-400
          focus:bg-white
          focus:ring-4
          focus:ring-orange-500/10
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
      />

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        className="
          absolute
          right-2
          top-1/2
          z-20
          flex
          h-9
          w-9
          -translate-y-1/2
          items-center
          justify-center
          rounded-lg
          text-slate-400
          transition
          hover:bg-slate-100
          hover:text-slate-600
          disabled:cursor-not-allowed
        "
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

/* ============================================================
   FEATURE
============================================================ */

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
    <div className="rounded-2xl border border-white/70 bg-white/60 p-3 backdrop-blur">
      <div className="text-slate-700">{icon}</div>

      <p className="mt-2 text-xs font-bold text-slate-900">{title}</p>

      <p className="mt-0.5 text-[10px] text-slate-600">{text}</p>
    </div>
  );
}

/* ============================================================
   DIVIDER
============================================================ */

function Divider({ text }: { text: string }) {
  return (
    <div className="relative my-4 flex items-center justify-center">
      <div className="absolute w-full border-t border-slate-100" />

      <span className="relative bg-white px-3 text-[11px] text-slate-400">
        {text}
      </span>
    </div>
  );
}

/* ============================================================
   MAIL ICON
============================================================ */

function MailIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />

      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

/* ============================================================
   USER ICON
============================================================ */

function UserIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />

      <path d="M4 21c.8-4 3.4-6 8-6s7.2 2 8 6" />
    </svg>
  );
}

/* ============================================================
   GOOGLE ICON
============================================================ */

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
