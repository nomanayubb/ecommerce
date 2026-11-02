"use client";

import dynamic from "next/dynamic";

/** Loaded only in the browser and only on pages that use the section (needs the visitor's own viewing history). */
export const PickedLazy = dynamic(() => import("./Picked").then((m) => m.Picked), { ssr: false });
