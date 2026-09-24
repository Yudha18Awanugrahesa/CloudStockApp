export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-24 pt-6 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="space-y-3">
          <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-8 w-64 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-80 max-w-full rounded bg-slate-200 dark:bg-slate-800" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>

        <div className="h-72 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
      </div>
    </div>
  );
}
