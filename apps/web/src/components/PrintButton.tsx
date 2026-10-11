"use client";

export function PrintButton({ className = "" }: { className?: string }) {
  return <button type="button" onClick={() => window.print()} className={`text-xs font-semibold uppercase tracking-[0.2em] text-muted transition hover:text-accent ${className}`}>Print</button>;
}
