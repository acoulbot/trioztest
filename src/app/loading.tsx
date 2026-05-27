export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-3 border-violet-500 dark:border-cyan-400 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-neutral-400 text-sm">Загрузка...</p>
      </div>
    </div>
  );
}
