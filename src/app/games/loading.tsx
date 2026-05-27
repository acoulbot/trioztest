export default function GamesLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="h-12 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse mx-auto mb-4" />
          <div className="h-4 w-64 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mx-auto" />
        </div>
        <div className="space-y-8">
          <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 overflow-hidden animate-pulse">
            <div className="h-64 bg-neutral-200 dark:bg-neutral-800" />
            <div className="p-6 space-y-3">
              <div className="h-4 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded" />
              <div className="h-3 w-1/2 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
