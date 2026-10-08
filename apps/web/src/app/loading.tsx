export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="mb-8 h-4 w-40 bg-line" />
      <div className="mb-10 h-10 w-72 bg-line" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="border border-line bg-card"><div className="aspect-[4/5] bg-line/50" /><div className="space-y-2 p-4"><div className="h-3 w-1/3 bg-line" /><div className="h-4 w-3/4 bg-line" /><div className="h-4 w-1/2 bg-line" /></div></div>
        ))}
      </div>
    </div>
  );
}
