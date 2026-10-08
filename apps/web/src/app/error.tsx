"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-28 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-4 text-3xl font-semibold uppercase tracking-[0.1em]">We could not load this page</h1>
      <p className="mx-auto mt-4 max-w-md text-muted">Please try again in a moment.</p>
      <button onClick={reset} className="btn btn-primary mt-10">Try again</button>
    </div>
  );
}
