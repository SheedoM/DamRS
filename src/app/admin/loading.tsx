export default function AdminLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
      ))}
    </div>
  );
}
