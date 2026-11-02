import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PanIcon, ThermometerIcon, WhiskIcon, MeasureIcon } from "@/components/icons/set";

export const metadata: Metadata = { title: "Kitchen guides", description: "Cookware materials compared, temperature charts, recipes and a planner." };

const GUIDES = [
  { href: "/guides/materials", icon: PanIcon, title: "Compare cookware materials", text: "Stainless, cast iron, non-stick, copper and more, side by side." },
  { href: "/guides/temperatures", icon: ThermometerIcon, title: "Temperature guide", text: "Safe cooking temperatures, steak doneness, oven settings and sugar stages." },
  { href: "/quiz", icon: MeasureIcon, title: "Find your match quiz", text: "Four quick questions and we pick products for you." },
  { href: "/recipes", icon: WhiskIcon, title: "Recipes", text: "Cook it, then add the ingredients and tools to your bag." },
];

export default function Guides() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Guides" }]} />
      <p className="eyebrow">Kitchen</p>
      <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.1em]">Guides and tools</h1>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <li key={g.href}>
            <Link href={g.href} className="lift icon-anim flex h-full gap-5 border border-line bg-card p-6">
              <span className="text-accent"><g.icon size={36} /></span>
              <span><span className="block text-lg font-semibold">{g.title}</span><span className="mt-1 block text-sm text-muted">{g.text}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
