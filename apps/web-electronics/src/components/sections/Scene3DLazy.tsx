"use client";

import dynamic from "next/dynamic";

/** The 3D hero scene loads only on pages that actually use it. */
export const Scene3D = dynamic(() => import("./Scene3D").then((m) => m.Scene3D), { ssr: false, loading: () => <div className="h-72 w-full md:h-[28rem]" aria-hidden /> });
