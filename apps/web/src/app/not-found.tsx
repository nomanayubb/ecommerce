import Link from "next/link";
import { MascotFigure } from "@/components/Mascot";

export default function NotFound() {
  return (
    <div className="py-28 text-center">
      <MascotFigure mood="confused" size={120} className="mx-auto mb-4 text-fg" />
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-4 text-4xl font-semibold uppercase tracking-[0.1em]">Page not found</h1>
      <p className="mx-auto mt-4 max-w-md text-muted">The page you are looking for has moved or no longer exists.</p>
      <div className="mt-10 flex justify-center gap-4">
        <Link href="/" className="btn btn-primary">Home</Link>
        <Link href="/products" className="btn btn-ghost">Shop</Link>
      </div>
    </div>
  );
}
