import Link from "next/link";

export const metadata = { title: "You are offline" };
export default function Offline() {
  return (
    <div className="py-24 text-center">
      <p className="eyebrow">Offline</p>
      <h1 className="mt-3 text-3xl font-semibold uppercase tracking-[0.1em]">You are offline</h1>
      <p className="mx-auto mt-4 max-w-md text-muted">No connection right now. Pages you opened recently still work. Your bag and wishlist are saved on this device.</p>
      <Link href="/" className="btn btn-primary mt-8">Try again</Link>
    </div>
  );
}
