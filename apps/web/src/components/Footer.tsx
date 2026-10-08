import Link from "next/link";

export function Footer({ brand }: { brand: { name: string; tagline: string; logoUrl: string } }) {
  return (
    <footer className="mt-16 bg-[rgb(var(--hero-b))] text-white">
      <div className="h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            {brand.logoUrl && <img src={brand.logoUrl} alt="" className="h-10 w-auto" />}
            <span className="text-lg font-semibold uppercase tracking-[0.28em]">{brand.name}</span>
          </div>
          {brand.tagline && <p className="mt-3 text-sm text-white/60">{brand.tagline}</p>}
        </div>
        <nav className="text-sm">
          <p className="mb-2 font-semibold text-accent">Shop</p>
          <ul className="space-y-1 text-white/70">
            <li><Link href="/products" className="hover:text-white">All products</Link></li>
            <li><Link href="/products?sort=price_asc" className="hover:text-white">Lowest price</Link></li>
            <li><Link href="/checkout" className="hover:text-white">Checkout</Link></li>
          </ul>
        </nav>
        <div className="text-sm">
          <p className="mb-2 font-semibold text-accent">Payments</p>
          <p className="text-white/70">Cash on Delivery</p>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-white/40">© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
    </footer>
  );
}
