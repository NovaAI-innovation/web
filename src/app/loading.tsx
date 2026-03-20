export default function Loading() {
  return (
    <main className="min-h-screen bg-chimera-black text-chimera-text-primary animate-pulse">
      <div className="max-w-6xl mx-auto px-6 pt-32">
        <div className="h-6 w-52 bg-chimera-surface rounded mb-8" />
        <div className="h-16 w-full max-w-3xl bg-chimera-surface rounded mb-5" />
        <div className="h-16 w-full max-w-2xl bg-chimera-surface rounded mb-10" />
        <div className="h-6 w-full max-w-xl bg-chimera-surface rounded mb-12" />
        <div className="flex gap-4">
          <div className="h-12 w-52 bg-chimera-surface rounded" />
          <div className="h-12 w-44 bg-chimera-surface rounded" />
        </div>
      </div>
    </main>
  );
}
