import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-slate-900 text-2xl text-white">☁</div>
        <h1 className="text-4xl font-bold tracking-tight">Cloud Stock</h1>
        <p className="mt-3 text-slate-600">Inventory management dan POS untuk bisnis modern.</p>
        <Link href="/dashboard" className="mt-7 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800">
          Buka Dashboard
        </Link>
      </div>
    </main>
  );
}
